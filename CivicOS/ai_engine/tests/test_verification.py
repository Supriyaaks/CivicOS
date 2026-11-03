import unittest
from unittest.mock import MagicMock
from ai_engine.verification.verify import IncidentVerifier

class TestIncidentVerifier(unittest.TestCase):
    def setUp(self):
        self.mock_detector = MagicMock()
        self.verifier = IncidentVerifier(detector=self.mock_detector)
        self.img_path = "test_image.jpg"

    def test_verified(self):
        # Mock a successful detection of a Pothole
        self.mock_detector.detect.return_value = {
            "status": "success",
            "detection_count": 1,
            "detections": [{"class_id": 0, "confidence": 0.9, "bbox": [10, 10, 50, 50]}]
        }
        result = self.verifier.verify(self.img_path, "Pothole")
        self.assertEqual(result["status"], "verified")
        self.assertEqual(result["detected_category"], "Pothole")

    def test_mismatch(self):
        # Mock detection of Waste container when Pothole was selected
        self.mock_detector.detect.return_value = {
            "status": "success",
            "detection_count": 1,
            "detections": [{"class_id": 2, "confidence": 0.85, "bbox": [10, 10, 50, 50]}]
        }
        result = self.verifier.verify(self.img_path, "Pothole")
        self.assertEqual(result["status"], "mismatch")
        self.assertEqual(result["detected_category"], "Waste container")

    def test_needs_review_low_confidence(self):
        # Mock detection with confidence below threshold (0.25)
        self.mock_detector.detect.return_value = {
            "status": "success",
            "detection_count": 1,
            "detections": [{"class_id": 0, "confidence": 0.15, "bbox": [10, 10, 50, 50]}]
        }
        result = self.verifier.verify(self.img_path, "Pothole")
        self.assertEqual(result["status"], "needs_review")

    def test_needs_review_no_detection(self):
        # Mock no detections
        self.mock_detector.detect.return_value = {
            "status": "success",
            "detection_count": 0,
            "detections": []
        }
        result = self.verifier.verify(self.img_path, "Pothole")
        self.assertEqual(result["status"], "needs_review")

    def test_invalid_category(self):
        result = self.verifier.verify(self.img_path, "InvalidCat")
        self.assertEqual(result["status"], "needs_review")
        self.assertIn("Unsupported category", result["explanation"])

    def test_detection_error(self):
        self.mock_detector.detect.return_value = {
            "status": "error",
            "message": "File not found"
        }
        result = self.verifier.verify(self.img_path, "Pothole")
        self.assertEqual(result["status"], "needs_review")
        self.assertIn("Detection failed", result["explanation"])

if __name__ == "__main__":
    unittest.main()
