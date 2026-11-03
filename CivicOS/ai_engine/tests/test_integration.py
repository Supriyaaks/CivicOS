import unittest
from unittest.mock import MagicMock
from ai_engine.orchestrator import CivicOS_AI_Orchestrator

class TestCivicOSIntegration(unittest.TestCase):
    def setUp(self):
        self.orchestrator = CivicOS_AI_Orchestrator()

    def test_full_new_report_workflow(self):
        # Mock a valid report
        report = {
            "report_id": "REP123",
            "image_path": "test_images/pothole.jpg",
            "reported_category": "Pothole",
            "latitude": 40.7128,
            "longitude": -74.0060,
            "timestamp": "2026-11-02T12:00:00"
        }

        # Mock dependencies to avoid actual file/model loading
        self.orchestrator.detector.detect = MagicMock(return_value={
            "status": "success", "detection_count": 1, "detections": [{"class_id": 0, "confidence": 0.9}]
        })
        self.orchestrator.verifier.verify = MagicMock(return_value={
            "status": "verified", "detected_category": "Pothole", "confidence": 0.9
        })
        self.orchestrator.duplicate_detector.detect_duplicates = MagicMock(return_value=[
            {"report_ids": ["REP123", "REP999"], "recommendation": "duplicate"}
        ])

        # Test with some existing reports
        existing = [{"report_id": "REP999", "reported_category": "Pothole"}]
        result = self.orchestrator.process_new_report(report, existing)

        self.assertEqual(result["workflow_status"], "processed")
        self.assertEqual(result["verification"]["status"], "verified")
        self.assertEqual(result["duplicates"]["recommendation"], "duplicate")

    def test_resolution_workflow(self):
        self.orchestrator.resolution_verifier.verify_resolution = MagicMock(return_value={
            "status": "appears_resolved", "reason": "Issue gone"
        })

        result = self.orchestrator.process_resolution("REP123", "before.jpg", "after.jpg")
        self.assertEqual(result["resolution"]["status"], "appears_resolved")

    def test_invalid_input_handling(self):
        report = {"report_id": "REP_BAD"} # Missing path/category
        result = self.orchestrator.process_new_report(report)
        self.assertEqual(result["status"], "error")

if __name__ == "__main__":
    unittest.main()
