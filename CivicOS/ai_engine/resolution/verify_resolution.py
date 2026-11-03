import cv2
import numpy as np
from typing import Dict, Any, List, Optional, Tuple
from ai_engine.detection.detect import IncidentDetector
from ai_engine.common.config import RESOLUTION_CONFIDENCE_THRESHOLD

class ResolutionVerifier:
    """
    Verifies if a reported civic incident has been resolved by comparing
    'before' and 'after' images.
    """

    def __init__(self, detector: Optional[IncidentDetector] = None):
        # Use provided detector or initialize a new one
        self.detector = detector if detector else IncidentDetector()

    def _preprocess_image(self, image_path: str) -> Optional[np.ndarray]:
        """Loads and normalizes image for comparison."""
        try:
            img = cv2.imread(image_path)
            if img is None:
                return None
            # Convert to grayscale and resize to a standard size for structural comparison
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            resized = cv2.resize(gray, (256, 256))
            return resized
        except Exception:
            return None

    def _calculate_ssim(self, img1: np.ndarray, img2: np.ndarray) -> float:
        """
        Calculates a simplified Structural Similarity Index (SSIM).
        """
        mu1 = np.mean(img1)
        mu2 = np.mean(img2)
        var1 = np.var(img1)
        var2 = np.var(img2)
        cov12 = np.mean((img1 - mu1) * (img2 - mu2))
        C1 = (0.01 * 255)**2
        C2 = (0.03 * 255)**2
        numerator = (2 * mu1 * mu2 + C1) * (2 * cov12 + C2)
        denominator = (mu1**2 + mu2**2 + C1) * (var1 + var2 + C2)
        return numerator / denominator if denominator != 0 else 0.0

    def verify_resolution(self, before_path: str, after_path: str) -> Dict[str, Any]:
        """
        Compares before and after images to determine if the issue is resolved.
        """
        # 1. Load and Validate Images
        img_before = self._preprocess_image(before_path)
        img_after = self._preprocess_image(after_path)

        if img_before is None or img_after is None:
            return {
                "status": "needs_review",
                "similarity_score": 0.0,
                "before_detections": [],
                "after_detections": [],
                "reason": "One or both images could not be loaded.",
                "confidence": 0.0,
                "recommendation": "Manual review required due to missing images."
            }

        # 2. Structural Comparison (SSIM)
        similarity = self._calculate_ssim(img_before, img_after)

        # 3. Detection-based Evidence
        before_res = self.detector.detect(before_path)
        after_res = self.detector.detect(after_path)

        before_dets = before_res.get("detections", [])
        after_dets = after_res.get("detections", [])

        # 4. Resolution Logic
        is_still_present = len(after_dets) > 0 and any(d["confidence"] >= RESOLUTION_CONFIDENCE_THRESHOLD for d in after_dets)
        was_present = len(before_dets) > 0

        # Case A: Issue clearly still present
        if is_still_present:
            return {
                "status": "appears_unresolved",
                "similarity_score": similarity,
                "before_detections": before_dets,
                "after_detections": after_dets,
                "reason": "The detected incident is still present in the after-repair image.",
                "confidence": max([d["confidence"] for d in after_dets]) if after_dets else 0.0,
                "recommendation": "Re-open ticket for inspection."
            }

        # Case B: Issue was present, and now it is gone (and images aren't identical)
        if was_present and not is_still_present and similarity < 0.95:
            return {
                "status": "appears_resolved",
                "similarity_score": similarity,
                "before_detections": before_dets,
                "after_detections": after_dets,
                "reason": "Incident detected in 'before' image is no longer present in 'after' image.",
                "confidence": 0.8,
                "recommendation": "Close ticket as resolved."
            }

        # Case C: Images are virtually identical (nothing changed)
        if similarity > 0.98:
            return {
                "status": "appears_unresolved",
                "similarity_score": similarity,
                "before_detections": before_dets,
                "after_detections": after_dets,
                "reason": "Before and after images are nearly identical; no visible repair.",
                "confidence": 0.9,
                "recommendation": "Re-open ticket."
            }

        # Default: Insufficient evidence (Includes case where images are too different
        # but no incident was detected to verify against)
        return {
            "status": "needs_review",
            "similarity_score": similarity,
            "before_detections": before_dets,
            "after_detections": after_dets,
            "reason": "Visual evidence is inconclusive or viewpoint changed too significantly.",
            "confidence": 0.5,
            "recommendation": "Manual verification by inspector required."
        }
