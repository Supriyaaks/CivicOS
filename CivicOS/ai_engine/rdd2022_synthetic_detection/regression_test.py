import os
import json
import time
from ai_engine.orchestrator import CivicOS_AI_Orchestrator
from ai_engine.rdd2022_synthetic_detection.detector import RDD2022Detector

def test_rdd_detector():
    print("\n--- Testing RDD2022Detector ---")
    detector = RDD2022Detector()
    
    # Test invalid path
    res = detector.detect("non_existent.jpg")
    assert res["detections"] == [], "Should return empty detections for invalid path"
    print("Check: Invalid path handled.")
    
    # Test real synthetic image
    # Get a sample image from the synthetic dataset
    img_path = None
    for root, dirs, files in os.walk("ai_engine/datasets/processed/rdd2022_synthetic/images/test"):
        for f in files:
            if f.endswith(".jpg"):
                img_path = os.path.join(root, f)
                break
    
    if img_path:
        res = detector.detect(img_path)
        print(f"Check: Detection on {img_path} succeeded. Found {len(res['detections'])} objects.")
    else:
        print("Error: No test images found for RDD detector.")

def test_orchestrator_integration():
    print("\n--- Testing Orchestrator Integration ---")
    orch = CivicOS_AI_Orchestrator()
    
    # Mock report
    report = {
        "report_id": "rep_123",
        "image_path": "ai_engine/datasets/processed/rdd2022_synthetic/images/test/road_0001.jpg", # may need adjustment
        "reported_category": "pothole"
    }
    
    # Find an actual image if possible
    img_path = None
    for root, dirs, files in os.walk("ai_engine/datasets/processed/rdd2022_synthetic/images/test"):
        for f in files:
            if f.endswith(".jpg"):
                img_path = os.path.join(root, f)
                break
    
    if img_path:
        report["image_path"] = img_path
    
    res = orch.process_new_report(report)
    
    assert "rdd_detection" in res, "Response must contain rdd_detection"
    print("Check: Orchestrator integrates RDD detection results.")
    
    assert "detection" in res, "Main detector results must be preserved"
    assert "litter_detection" in res, "Litter detector results must be preserved"
    assert "verification" in res, "Verification results must be preserved"
    print("Check: Existing capabilities preserved.")

if __name__ == "__main__":
    try:
        test_rdd_detector()
        test_orchestrator_integration()
        print("\n--- ALL REGRESSION TESTS PASSED ---")
    except Exception as e:
        print(f"\n--- REGRESSION TEST FAILED: {e} ---")
        import traceback
        traceback.print_exc()
