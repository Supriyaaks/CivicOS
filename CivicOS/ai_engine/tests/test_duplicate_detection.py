import unittest
from unittest.mock import MagicMock, patch
from ai_engine.duplicate_detection.detect_duplicates import DuplicateDetector

class TestDuplicateDetector(unittest.TestCase):
    def setUp(self):
        self.detector = DuplicateDetector()
        self.reports = [
            {
                "report_id": "R1",
                "image_path": "img1.jpg",
                "reported_category": "Pothole",
                "latitude": 40.7128,
                "longitude": -74.0060,
                "timestamp": "2026-11-01T10:00:00"
            },
            {
                "report_id": "R2",
                "image_path": "img2.jpg",
                "reported_category": "Pothole",
                "latitude": 40.7129,
                "longitude": -74.0061,
                "timestamp": "2026-11-01T11:00:00"
            },
            {
                "report_id": "R3",
                "image_path": "img3.jpg",
                "reported_category": "Pothole",
                "latitude": 34.0522,
                "longitude": -118.2437,
                "timestamp": "2026-11-01T10:00:00"
            },
            {
                "report_id": "R4",
                "image_path": "img4.jpg",
                "reported_category": "Crack",
                "latitude": 40.7128,
                "longitude": -74.0060,
                "timestamp": "2026-11-01T10:05:00"
            }
        ]

    @patch("ai_engine.duplicate_detection.detect_duplicates.DuplicateDetector._calculate_image_similarity")
    def test_exact_duplicate(self, mock_sim):
        # R1 and R2 are geographically and temporally close
        mock_sim.return_value = 0.95
        results = self.detector.detect_duplicates(self.reports)

        # Expect R1 and R2 to be grouped
        group = next((g for g in results if "R1" in g["report_ids"]), None)
        self.assertIsNotNone(group)
        self.assertIn("R2", group["report_ids"])
        self.assertEqual(group["recommendation"], "duplicate")

    @patch("ai_engine.duplicate_detection.detect_duplicates.DuplicateDetector._calculate_image_similarity")
    def test_different_location(self, mock_sim):
        # R1 and R3 are far apart
        mock_sim.return_value = 0.95
        results = self.detector.detect_duplicates(self.reports)

        # R1 and R3 should NOT be grouped
        group = next((g for g in results if "R1" in g["report_ids"]), None)
        if group:
            self.assertNotIn("R3", group["report_ids"])

    def test_different_categories(self):
        # R1 and R4 have same location but different category
        results = self.detector.detect_duplicates(self.reports)

        group = next((g for g in results if "R1" in g["report_ids"]), None)
        if group:
            self.assertNotIn("R4", group["report_ids"])

    def test_missing_coordinates(self):
        reports_missing_coords = [
            {
                "report_id": "R1",
                "image_path": "img1.jpg",
                "reported_category": "Pothole",
                "timestamp": "2026-11-01T10:00:00"
            },
            {
                "report_id": "R2",
                "image_path": "img2.jpg",
                "reported_category": "Pothole",
                "timestamp": "2026-11-01T11:00:00"
            }
        ]
        # Should handle without crashing and return unique or needs_review
        results = self.detector.detect_duplicates(reports_missing_coords)
        self.assertEqual(len(results), 0) # No geo proximity = no duplicate

    def test_missing_images(self):
        reports_missing_imgs = [
            {
                "report_id": "R1",
                "reported_category": "Pothole",
                "latitude": 40.7128,
                "longitude": -74.0060,
                "timestamp": "2026-11-01T10:00:00"
            },
            {
                "report_id": "R2",
                "reported_category": "Pothole",
                "latitude": 40.7128,
                "longitude": -74.0060,
                "timestamp": "2026-11-01T10:05:00"
            }
        ]
        # Should handle missing images as 0 similarity, but still check geo/time
        results = self.detector.detect_duplicates(reports_missing_imgs)
        self.assertTrue(len(results) > 0)
        self.assertEqual(results[0]["recommendation"], "needs_review")

if __name__ == "__main__":
    unittest.main()
