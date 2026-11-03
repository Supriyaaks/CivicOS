"""
Comprehensive Verification Script for All 6 Person 2 AI Capabilities.
Tests each module directly with actual project dataset images and validates output schemas.
"""

import os
import sys
import json
from pathlib import Path

CIVICOS_DIR = Path(__file__).resolve().parent
if str(CIVICOS_DIR) not in sys.path:
    sys.path.insert(0, str(CIVICOS_DIR))
os.chdir(str(CIVICOS_DIR))

from ai_engine.detection.detect import IncidentDetector
from ai_engine.litter_detection.detector import LitterDetector
from ai_engine.rdd2022_synthetic_detection.detector import RDD2022Detector
from ai_engine.verification.verify import IncidentVerifier
from ai_engine.duplicate_detection.detect_duplicates import DuplicateDetector
from ai_engine.resolution.verify_resolution import ResolutionVerifier

def verify_all_six():
    print("=== VERIFYING ALL SIX AI CAPABILITIES ===")

    # 1. Urban Community Detector
    print("\n--- 1. Urban Community Detector (6-class) ---")
    urban = IncidentDetector()
    classes = urban.get_supported_classes()
    print("Supported Classes:", classes)
    assert len(classes) == 6, f"Expected 6 classes, got {len(classes)}"
    img_urban = "ai_engine/datasets/processed/urban_community_mini50/images/train/137.jpg"
    res_urban = urban.detect(img_urban)
    print("Urban Detection Output Keys:", list(res_urban.keys()))
    assert res_urban["status"] == "success"
    assert "detection_count" in res_urban
    assert isinstance(res_urban["detections"], list)
    print(f"[PASS] Urban Community Detector verified on {img_urban}")

    # 2. Mini-TACO50 Litter Detector
    print("\n--- 2. Mini-TACO50 Litter Detector ---")
    litter = LitterDetector()
    img_litter = "ai_engine/datasets/processed/mini_taco50/images/train/batch_9/000030.jpg"
    res_litter = litter.detect(img_litter)
    print("Litter Detection Output Keys:", list(res_litter.keys()))
    assert res_litter["status"] == "success"
    assert "total_detected" in res_litter
    assert "detections" in res_litter
    assert "inference_time_ms" in res_litter
    print(f"[PASS] Mini-TACO50 Litter Detector verified on {img_litter}")

    # 3. RDD Synthetic Road Damage Detector
    print("\n--- 3. RDD Synthetic Road Damage Detector (4-class) ---")
    rdd = RDD2022Detector()
    img_rdd = "ai_engine/datasets/processed/rdd2022_synthetic/images/test/road_0000.jpg"
    res_rdd = rdd.detect(img_rdd)
    print("RDD Detection Output Keys:", list(res_rdd.keys()))
    assert "detections" in res_rdd
    assert "inference_time" in res_rdd
    print(f"RDD detections found: {len(res_rdd['detections'])}")
    for d in res_rdd["detections"][:3]:
        print(f"  - {d['class_name']}: conf={d['confidence']:.2f}, bbox={d['bbox']}")
        assert "class_id" in d and "class_name" in d and "confidence" in d and "bbox" in d
    assert len(res_rdd["detections"]) > 0, "Expected at least 1 detection on road_0000.jpg"
    print(f"[PASS] RDD Synthetic Road Damage Detector verified on {img_rdd}")

    # 4. Incident Verifier
    print("\n--- 4. Incident Verifier ---")
    verifier = IncidentVerifier(detector=urban)
    res_v_match = verifier.verify(img_urban, "Pothole")
    print("Verification (Pothole):", res_v_match)
    assert res_v_match["status"] in ["verified", "mismatch", "needs_review"]
    assert "selected_category" in res_v_match
    assert "confidence" in res_v_match
    assert "explanation" in res_v_match

    # Test mismatch with intentionally wrong category
    res_v_mismatch = verifier.verify(img_rdd, "Animal")
    print("Verification (Animal on road image):", res_v_mismatch)
    assert res_v_mismatch["status"] in ["mismatch", "needs_review"]
    print("[PASS] Incident Verifier verified.")

    # 5. Duplicate Detector
    print("\n--- 5. Duplicate Detector ---")
    dup_detector = DuplicateDetector()
    test_reports = [
        {
            "report_id": "CIV-REP-A",
            "image_path": img_urban,
            "reported_category": "Pothole",
            "latitude": 12.971600,
            "longitude": 77.594600,
            "timestamp": "2026-11-02T12:00:00"
        },
        {
            "report_id": "CIV-REP-B",
            "image_path": img_urban, # same image, 5 meters away, 10 min later
            "reported_category": "Pothole",
            "latitude": 12.971620,
            "longitude": 77.594620,
            "timestamp": "2026-11-02T12:10:00"
        }
    ]
    groups = dup_detector.detect_duplicates(test_reports)
    print("Duplicate Groups:", groups)
    assert len(groups) == 1, f"Expected 1 group, got {len(groups)}"
    assert groups[0]["recommendation"] == "duplicate"
    assert "CIV-REP-A" in groups[0]["report_ids"]
    assert "CIV-REP-B" in groups[0]["report_ids"]
    assert len(groups[0]["evidence"]) > 0
    print("[PASS] Duplicate Detector verified.")

    # 6. Resolution Verifier
    print("\n--- 6. Resolution Verifier ---")
    res_verifier = ResolutionVerifier(detector=urban)
    # Compare 137.jpg before, test_image.jpg after
    res_res = res_verifier.verify_resolution(img_urban, "test_image.jpg")
    print("Resolution Verification Output Keys:", list(res_res.keys()))
    assert res_res["status"] in ["appears_resolved", "appears_unresolved", "needs_review"]
    assert "similarity_score" in res_res
    assert "reason" in res_res
    assert "confidence" in res_res
    assert "recommendation" in res_res
    print(f"Resolution outcome: {res_res['status']} | similarity: {res_res['similarity_score']:.3f} | {res_res['reason']}")
    print("[PASS] Resolution Verifier verified.")

    print("\n==================================================")
    print("ALL SIX PERSON 2 AI CAPABILITIES FULLY VERIFIED!")
    print("==================================================")

if __name__ == "__main__":
    verify_all_six()
