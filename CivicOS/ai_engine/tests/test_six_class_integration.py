import unittest
from unittest.mock import MagicMock
from ai_engine.orchestrator import CivicOS_AI_Orchestrator

class TestSixClassIntegration(unittest.TestCase):
    def setUp(self):
        self.orchestrator = CivicOS_AI_Orchestrator()

    def test_six_class_verification(self):
        # Test a "Traffic Light" report (Class 1 in Mini50)
        report = {
            "report_id": "SIX_001",
            "image_path": "test_tl.jpg",
            "reported_category": "Traffic Light",
            "latitude": 0.0,
            "longitude": 0.0,
            "timestamp": "2026-11-02T12:00:00"
        }

        # Mock detection to return Traffic Light
        self.orchestrator.detector.detect = MagicMock(return_value={
            "status": "success", "detection_count": 1,
            "detections": [{"class_id": 1, "confidence": 0.9}]
        })

        # Mock verifier to return verified for Traffic Light
        self.orchestrator.verifier.verify = MagicMock(return_value={
            "status": "verified", "detected_category": "Traffic Light", "confidence": 0.9
        })

        result = self.orchestrator.process_new_report(report)
        self.assertEqual(result["verification"]["status"], "verified")
        self.assertEqual(result["verification"]["detected_category"], "Traffic Light")

    def test_invalid_six_class_category(self):
        report = {
            "report_id": "SIX_BAD",
            "image_path": "test.jpg",
            "reported_category": "Unknown Category",
            "latitude": 0.0,
            "longitude": 0.0,
            "timestamp": "2026-11-02T12:00:00"
        }
        # Orchestrator calls verifier.verify
        # We should see it handled as needs_review
        result = self.orchestrator.process_new_report(report)
        self.assertEqual(result["verification"]["status"], "needs_review")

if __name__ == "__main__":
    unittest.main()
