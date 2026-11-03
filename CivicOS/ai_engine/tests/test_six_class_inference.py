import unittest
from unittest.mock import MagicMock
import numpy as np
from ai_engine.detection.detect import IncidentDetector
from ai_engine.orchestrator import CivicOS_AI_Orchestrator

class TestSixClassInference(unittest.TestCase):
    def setUp(self):
        self.orchestrator = CivicOS_AI_Orchestrator()

    def test_six_class_detection_flow(self):
        """
        Tests the detection and verification flow for all six categories.
        This uses mocks to simulate the 6-class model weights.
        """
        six_classes = {
            "Animal": 0,
            "Traffic Light": 1,
            "Waste container": 2,
            "Pothole": 3,
            "Cracks": 4,
            "Open manhole": 5
        }

        for cat_name, cat_id in six_classes.items():
            report = {
                "report_id": f"TEST_{cat_name}",
                "image_path": "dummy.jpg",
                "reported_category": cat_name,
                "latitude": 0.0,
                "longitude": 0.0,
                "timestamp": "2026-11-02T12:00:00"
            }

            # Mock detector to return the corresponding class
            self.orchestrator.detector.detect = MagicMock(return_value={
                "status": "success", "detection_count": 1,
                "detections": [{"class_id": cat_id, "confidence": 0.9}]
            })

            # Mock verifier to return verified
            self.orchestrator.verifier.verify = MagicMock(return_value={
                "status": "verified", "detected_category": cat_name, "confidence": 0.9
            })

            result = self.orchestrator.process_new_report(report)
            self.assertEqual(result["verification"]["status"], "verified", f"Failed for {cat_name}")
            self.assertEqual(result["verification"]["detected_category"], cat_name, f"Wrong category for {cat_name}")

    def test_model_class_mismatch(self):
        """
        Verifies that if a model is loaded that doesn't match the expected classes,
        the system handles it (via verifier logic).
        """
        # Simulate a 3-class model return when a 6-class report is made
        report = {"report_id": "ERR_01", "image_path": "test.jpg", "reported_category": "Open manhole"}

        # Mock detector returns class 0 (Pothole in 3-class, Animal in 6-class)
        self.orchestrator.detector.detect = MagicMock(return_value={
            "status": "success", "detection_count": 1,
            "detections": [{"class_id": 0, "confidence": 0.9}]
        })

        # The verifier should now see the mismatch because it uses the 6-class MAP
        # whereas the (mocked) detector returned a class that doesn't match "Open manhole"
        result = self.orchestrator.process_new_report(report)
        self.assertEqual(result["verification"]["status"], "mismatch")

if __name__ == "__main__":
    unittest.main()
