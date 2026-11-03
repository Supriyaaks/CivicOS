import torch
from ultralytics import YOLO
from ai_engine.common.config import MODEL_PATHS, ACTIVE_MODEL_KEY
from ai_engine.detection.detect import IncidentDetector
from ai_engine.verification.verify import IncidentVerifier
from ai_engine.duplicate_detection.detect_duplicates import DuplicateDetector
from ai_engine.resolution.verify_resolution import ResolutionVerifier
from ai_engine.orchestrator import CivicOS_AI_Orchestrator
import os
from pathlib import Path

def run_real_inference_tests():
    print("--- Starting Real-Image Inference Tests ---")

    # Initialize Orchestrator
    orchestrator = CivicOS_AI_Orchestrator()

    # Force use of the Mini50 model weights for this test
    absolute_model_path = os.path.join("C:\\Users\\WCT\\Desktop\\CivicOS", "ai_engine", "runs", "detection", "civicos_mini50_final", "weights", "best.pt")

    try:
        orchestrator.detector.model = YOLO(absolute_model_path)
        print(f"Successfully loaded model from {absolute_model_path}")
    except Exception as e:
        print(f"FAILED to load model: {e}")
        return

    # Test Images (Sourcing images directly from the Mini50 test split)
    test_dir = Path("ai_engine/datasets/processed/urban_community_mini50/images/test")
    test_images = list(test_dir.glob("*.jpg"))

    if not test_images:
        print("No test images found in Mini50 test split. Skipping.")
        return

    # Test a small sample
    for img_path in test_images[:3]:
        print(f"\nTesting Image: {img_path.name}")

        report = {
            "report_id": "REAL_TEST_01",
            "image_path": str(img_path),
            "reported_category": "Pothole",
            "latitude": 0.0,
            "longitude": 0.0,
            "timestamp": "2026-11-02T12:00:00"
        }

        res = orchestrator.process_new_report(report)
        print(f"Detection: {res['detection']['status']} (Count: {res['detection']['detection_count']})")
        print(f"Verification: {res['verification']['status']} ({res['verification']['explanation']})")

if __name__ == "__main__":
    run_real_inference_tests()
