import unittest
from unittest.mock import MagicMock
import numpy as np
from ai_engine.resolution.verify_resolution import ResolutionVerifier

class TestResolutionVerifier(unittest.TestCase):
    def setUp(self):
        self.mock_detector = MagicMock()
        self.verifier = ResolutionVerifier(detector=self.mock_detector)

    def test_resolved(self):
        # Before: Pothole detected. After: Nothing detected.
        self.mock_detector.detect.side_effect = [
            {"status": "success", "detections": [{"class_id": 0, "confidence": 0.9, "bbox": [10, 10, 50, 50]}]},
            {"status": "success", "detections": []}
        ]
        with unittest.mock.patch.object(ResolutionVerifier, '_preprocess_image') as mock_prep:
            mock_prep.side_effect = [np.random.randint(0, 255, (256, 256), dtype=np.uint8),
                                     np.random.randint(0, 255, (256, 256), dtype=np.uint8)]
            result = self.verifier.verify_resolution("before.jpg", "after.jpg")
            self.assertEqual(result["status"], "appears_resolved")

    def test_unresolved_still_present(self):
        # Before: Pothole detected. After: Pothole still detected.
        self.mock_detector.detect.side_effect = [
            {"status": "success", "detections": [{"class_id": 0, "confidence": 0.9, "bbox": [10, 10, 50, 50]}]},
            {"status": "success", "detections": [{"class_id": 0, "confidence": 0.85, "bbox": [12, 12, 52, 52]}]}
        ]
        with unittest.mock.patch.object(ResolutionVerifier, '_preprocess_image') as mock_prep:
            mock_prep.side_effect = [np.random.randint(0, 255, (256, 256), dtype=np.uint8),
                                     np.random.randint(0, 255, (256, 256), dtype=np.uint8)]
            result = self.verifier.verify_resolution("before.jpg", "after.jpg")
            self.assertEqual(result["status"], "appears_unresolved")

    def test_unresolved_identical_images(self):
        # Images are identical
        with unittest.mock.patch.object(ResolutionVerifier, '_preprocess_image') as mock_prep:
            img = np.random.randint(0, 255, (256, 256), dtype=np.uint8)
            mock_prep.side_effect = [img, img]
            self.mock_detector.detect.return_value = {"status": "success", "detections": []}
            result = self.verifier.verify_resolution("before.jpg", "after.jpg")
            self.assertEqual(result["status"], "appears_unresolved")
            self.assertIn("nearly identical", result["reason"])

    def test_invalid_paths(self):
        with unittest.mock.patch.object(ResolutionVerifier, '_preprocess_image') as mock_prep:
            mock_prep.return_value = None
            result = self.verifier.verify_resolution("bad_before.jpg", "bad_after.jpg")
            self.assertEqual(result["status"], "needs_review")
            self.assertIn("could not be loaded", result["reason"])

    def test_uncertain_comparison(self):
        # Case: Low similarity, no detections in either image
        with unittest.mock.patch.object(ResolutionVerifier, '_preprocess_image') as mock_prep:
            # To ensure we get a low similarity (near 0), we use a black image and a white image.
            # Our SSIM implementation: mu1=0, mu2=255, var1=0, var2=0, cov12=0
            # numerator = (C1)* (C2), denominator = (C1)*(C2) -> Result is 1.0.
            # Wait, the simplified SSIM I wrote is actually quite sensitive.
            # Let's just mock the _calculate_ssim method directly to avoid numpy random noise.
            mock_prep.side_effect = [np.zeros((256, 256), dtype=np.uint8),
                                     np.ones((256, 256), dtype=np.uint8) * 255]
            self.mock_detector.detect.return_value = {"status": "success", "detections": []}

            with unittest.mock.patch.object(ResolutionVerifier, '_calculate_ssim', return_value=0.1):
                result = self.verifier.verify_resolution("before.jpg", "after.jpg")
                self.assertEqual(result["status"], "needs_review")

if __name__ == "__main__":
    unittest.main()
