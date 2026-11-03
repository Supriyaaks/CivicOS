import os
import json
import numpy as np
from ai_engine.orchestrator import CivicOS_AI_Orchestrator
from ai_engine.detection.detect import IncidentDetector
from ai_engine.litter_detection.detector import LitterDetector
from ai_engine.rdd2022_synthetic_detection.detector import RDD2022Detector
from ai_engine.verification.verify import IncidentVerifier
from ai_engine.duplicate_detection.detect_duplicates import DuplicateDetector
from ai_engine.resolution.verify_resolution import ResolutionVerifier

def test_urban_community():
    print("\nTesting Urban Community Detector...")
    detector = IncidentDetector()
    # Find a sample image from mini50
    img_path = None
    for root, dirs, files in os.walk("ai_engine/datasets/processed/urban_community_mini50/images/train"):
        for f in files:
            if f.endswith(".jpg"):
                img_path = os.path.join(root, f)
                break
    
    if img_path:
        res = detector.detect(img_path)
        print(f"Detection results for {img_path}: {res['status']}")
        assert res["status"] == "success", "Urban detector failed"
    else:
        print("No images found for Urban detector test.")

def test_litter():
    print("\nTesting Litter Detector...")
    detector = LitterDetector()
    img_path = None
    for root, dirs, files in os.walk("ai_engine/datasets/processed/mini_taco50/images/train"):
        for f in files:
            if f.endswith(".jpg"):
                img_path = os.path.join(root, f)
                break
    
    if img_path:
        res = detector.detect(img_path)
        print(f"Litter detection results for {img_path}: {res['status']}")
        assert res["status"] == "success", "Litter detector failed"
    else:
        print("No images found for Litter detector test.")

def test_rdd():
    print("\nTesting RDD Detector...")
    detector = RDD2022Detector()
    img_path = None
    for root, dirs, files in os.walk("ai_engine/datasets/processed/rdd2022_synthetic/images/test"):
        for f in files:
            if f.endswith(".jpg"):
                img_path = os.path.join(root, f)
                break
    
    if img_path:
        res = detector.detect(img_path)
        print(f"RDD detection results for {img_path}: {res['detections']}")
        assert "detections" in res, "RDD detector failed"
    else:
        print("No images found for RDD detector test.")

def test_verification():
    print("\nTesting Incident Verification...")
    verifier = IncidentVerifier()
    # Sample image
    img_path = None
    for root, dirs, files in os.walk("ai_engine/datasets/processed/urban_community_mini50/images/train"):
        for f in files:
            if f.endswith(".jpg"):
                img_path = os.path.join(root, f)
                break
    
    if img_path:
        res = verifier.verify(img_path, "Pothole")
        print(f"Verification result: {res['status']}")
        assert "status" in res, "Verification failed"
    else:
        print("No images found for verification test.")

def test_duplicates():
    print("\nTesting Duplicate Detection...")
    detector = DuplicateDetector()
    reports = [
        {
            "report_id": "r1",
            "image_path": "ai_engine/datasets/processed/urban_community_mini50/images/train/img1.jpg", # dummy
            "reported_category": "Pothole",
            "latitude": 10.0, "longitude": 10.0, "timestamp": "2023-01-01T12:00:00"
        },
        {
            "report_id": "r2",
            "image_path": "ai_engine/datasets/processed/urban_community_mini50/images/train/img1.jpg", # same image
            "reported_category": "Pothole",
            "latitude": 10.00001, "longitude": 10.00001, "timestamp": "2023-01-01T12:05:00"
        }
    ]
    # Use a real image if possible
    img_path = None
    for root, dirs, files in os.walk("ai_engine/datasets/processed/urban_community_mini50/images/train"):
        for f in files:
            if f.endswith(".jpg"):
                img_path = os.path.join(root, f)
                break
    if img_path:
        reports[0]["image_path"] = img_path
        reports[1]["image_path"] = img_path

    res = detector.detect_duplicates(reports)
    print(f"Duplicate groups found: {len(res)}")
    # Since they are the same image and nearby, it should be a duplicate
    if len(res) > 0:
        print(f"Recommendation: {res[0]['recommendation']}")

def test_resolution():
    print("\nTesting Resolution Verification...")
    verifier = ResolutionVerifier()
    # Using same image for before/after to test "unresolved" (identical)
    img_path = None
    for root, dirs, files in os.walk("ai_engine/datasets/processed/urban_community_mini50/images/train"):
        for f in files:
            if f.endswith(".jpg"):
                img_path = os.path.join(root, f)
                break
    
    if img_path:
        res = verifier.verify_resolution(img_path, img_path)
        print(f"Resolution result: {res['status']}")
        assert "status" in res, "Resolution verification failed"
    else:
        print("No images found for resolution test.")

def test_orchestrator():
    print("\nTesting Orchestrator...")
    orch = CivicOS_AI_Orchestrator()
    report = {
        "report_id": "rep_test",
        "image_path": "ai_engine/datasets/processed/urban_community_mini50/images/train/img.jpg", # dummy
        "reported_category": "Pothole",
        "latitude": 10.0, "longitude": 10.0, "timestamp": "2023-01-01T12:00:00"
    }
    
    img_path = None
    for root, dirs, files in os.walk("ai_engine/datasets/processed/urban_community_mini50/images/train"):
        for f in files:
            if f.endswith(".jpg"):
                img_path = os.path.join(root, f)
                break
    if img_path:
        report["image_path"] = img_path
        
    res = orch.process_new_report(report)
    print(f"Orchestrator output keys: {list(res.keys())}")
    assert "detection" in res, "Missing detection"
    assert "litter_detection" in res, "Missing litter_detection"
    assert "rdd_detection" in res, "Missing rdd_detection"
    assert "verification" in res, "Missing verification"
    assert "duplicates" in res, "Missing duplicates"

if __name__ == "__main__":
    try:
        test_urban_community()
        test_litter()
        test_rdd()
        test_verification()
        test_duplicates()
        test_resolution()
        test_orchestrator()
        print("\n--- ALL INDIVIDUAL MODULE TESTS PASSED ---")
    except Exception as e:
        print(f"\n--- SYSTEM TEST FAILED: {e} ---")
        import traceback
        traceback.print_exc()
