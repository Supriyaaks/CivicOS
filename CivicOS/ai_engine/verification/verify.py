from typing import Dict, Any, Optional
from pathlib import Path
from ai_engine.detection.detect import IncidentDetector
from ai_engine.common.config import CONFIDENCE_THRESHOLD

class IncidentVerifier:
    """
    Verifies if the content of an image matches the category reported by a citizen.
    Dynamically maps class names and IDs from the active YOLO detector while maintaining
    full backward compatibility for rollback.
    """

    # Canonical categories supported across CivicOS
    CANONICAL_CATEGORIES = [
        "Pothole",
        "Cracks",
        "Waste container",
        "Animal",
        "Traffic Light",
        "Open manhole"
    ]

    # Legacy fallback mapping (based on Mini50 dataset)
    CATEGORY_MAP = {
        "Animal": 0,
        "Traffic Light": 1,
        "Waste container": 2,
        "Pothole": 3,
        "Cracks": 4,
        "Open manhole": 5
    }

    # Reverse map for legacy reporting
    ID_TO_CATEGORY = {v: k for k, v in CATEGORY_MAP.items()}

    def __init__(self, detector: Optional[IncidentDetector] = None):
        # Use provided detector or initialize a new one
        self.detector = detector if detector else IncidentDetector()
        self._build_dynamic_mappings()

    def _build_dynamic_mappings(self):
        """Constructs model-specific bidirectional mappings between YOLO class names/IDs and canonical categories."""
        self.model_id_to_category = {}
        self.category_to_model_id = {}

        display_map = {
            "pothole": "Pothole",
            "crack": "Cracks",
            "cracks": "Cracks",
            "waste_container": "Waste container",
            "waste": "Waste container",
            "litter": "Waste container",
            "animal": "Animal",
            "traffic_light": "Traffic Light",
            "open_manhole": "Open manhole"
        }

        if hasattr(self.detector, "classes") and self.detector.classes:
            for cls_id, raw_name in self.detector.classes.items():
                canonical = display_map.get(raw_name.lower(), raw_name.title())
                self.model_id_to_category[cls_id] = canonical
                self.category_to_model_id[canonical] = cls_id
                self.category_to_model_id[raw_name] = cls_id
                self.category_to_model_id[raw_name.lower()] = cls_id
        else:
            self.model_id_to_category = dict(self.ID_TO_CATEGORY)
            self.category_to_model_id = dict(self.CATEGORY_MAP)

    def verify(self, image_path: str, selected_category: str) -> Dict[str, Any]:
        """
        Verifies the image against the selected category.

        Args:
            image_path: Path to the uploaded image.
            selected_category: The category the citizen selected.

        Returns:
            Dictionary containing verification status and metadata.
        """
        # 1. Normalize and validate category
        cat_norm = selected_category.strip()
        if cat_norm.lower() in ["road cracks", "road crack"]:
            cat_norm = "Cracks"
        elif cat_norm.lower() in ["roads and potholes"]:
            cat_norm = "Pothole"
        elif cat_norm.lower() in ["garbage and waste management", "litter", "waste"]:
            cat_norm = "Waste container"

        # Check if selected category is recognized
        is_known = cat_norm in self.CANONICAL_CATEGORIES or cat_norm in self.category_to_model_id
        if not is_known:
            return {
                "status": "needs_review",
                "selected_category": selected_category,
                "detected_category": None,
                "confidence": 0.0,
                "explanation": f"Unsupported category: {selected_category}"
            }

        # 2. Run Detection
        detection_res = self.detector.detect(image_path)

        if detection_res["status"] == "error":
            return {
                "status": "needs_review",
                "selected_category": selected_category,
                "detected_category": None,
                "confidence": 0.0,
                "explanation": f"Detection failed: {detection_res['message']}"
            }

        detections = detection_res.get("detections", [])

        if not detections:
            return {
                "status": "needs_review",
                "selected_category": selected_category,
                "detected_category": None,
                "confidence": 0.0,
                "explanation": "No incidents detected in the image."
            }

        # 3. Find the most confident detection
        best_detection = max(detections, key=lambda x: x["confidence"])
        detected_id = best_detection["class_id"]
        detected_cat = self.model_id_to_category.get(
            detected_id,
            self.ID_TO_CATEGORY.get(detected_id, "Unknown")
        )
        confidence = best_detection["confidence"]

        target_id = self.category_to_model_id.get(cat_norm, self.CATEGORY_MAP.get(cat_norm))
        is_match = (target_id is not None and detected_id == target_id) or (detected_cat.lower() == cat_norm.lower())

        # 4. Verification Logic
        # Case A: Category matches and confidence is sufficient
        if is_match and confidence >= CONFIDENCE_THRESHOLD:
            return {
                "status": "verified",
                "selected_category": selected_category,
                "detected_category": detected_cat,
                "confidence": confidence,
                "explanation": f"Successfully verified {detected_cat} with {confidence:.2f} confidence."
            }

        # Case B: Different category detected with high confidence
        if not is_match and confidence >= CONFIDENCE_THRESHOLD:
            return {
                "status": "mismatch",
                "selected_category": selected_category,
                "detected_category": detected_cat,
                "confidence": confidence,
                "explanation": f"Detected {detected_cat} instead of {selected_category}."
            }

        # Case C: Low confidence or ambiguous
        return {
            "status": "needs_review",
            "selected_category": selected_category,
            "detected_category": detected_cat,
            "confidence": confidence,
            "explanation": "Detection confidence too low for automatic verification."
        }
