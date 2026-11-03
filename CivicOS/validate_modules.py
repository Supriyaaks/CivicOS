import os
import cv2
import numpy as np
from ai_engine.orchestrator import CivicOS_AI_Orchestrator
from ai_engine.common.config import ACTIVE_MODEL_KEY

def run_comprehensive_validation():
    orch = CivicOS_AI_Orchestrator()
    report = []

    # Test Data
    test_dir = "ai_engine/datasets/processed/urban_community_mini50/images/test"
    images = [f for f in os.listdir(test_dir) if f.endswith('.jpg')]

    print("--- Starting Module Validation ---")

    # --- MODULE 1 & 2: Detection & Verification ---
    print("\nTesting Detection and Verification...")
    for img_name in images[:5]:
        img_path = os.path.join(test_dir, img_name)
        # We test different reported categories to see if it flags mismatches
        categories = ["Pothole", "Animal", "Traffic Light"]
        for cat in categories:
            report_data = {
                "report_id": "TEST_V",
                "image_path": img_path,
                "reported_category": cat,
                "latitude": 0.0,
                "longitude": 0.0,
                "timestamp": "2026-11-02T12:00:00"
            }
            res = orch.process_new_report(report_data)
            det = res['detection']
            ver = res['verification']

            status = "PASS"
            # Logic check: if detection count is 0, verification must be needs_review
            if det['detection_count'] == 0 and ver['status'] != 'needs_review':
                status = "FAIL"

            report.append({
                "module": "Detection/Verification",
                "case": f"Img: {img_name}, Cat: {cat}",
                "input": f"{img_name} | {cat}",
                "expected": "needs_review if count=0",
                "actual": f"DetCount: {det['detection_count']}, VerStatus: {ver['status']}",
                "result": status
            })

    # --- MODULE 3: Duplicate Detection ---
    print("\nTesting Duplicate Detection...")
    # Case 1: Identical reports (Same image, loc, time)
    r1 = {"report_id": "R1", "image_path": os.path.join(test_dir, images[0]),
          "reported_category": "Pothole", "latitude": 40.0, "longitude": -70.0, "timestamp": "2026-11-02T10:00:00"}
    r2 = {"report_id": "R2", "image_path": os.path.join(test_dir, images[0]),
          "reported_category": "Pothole", "latitude": 40.0001, "longitude": -70.0001, "timestamp": "2026-11-02T10:05:00"}

    dup_res = orch.duplicate_detector.detect_duplicates([r1, r2])
    status = "PASS" if len(dup_res) > 0 and dup_res[0]['recommendation'] in ['duplicate', 'needs_review'] else "FAIL"
    report.append({
        "module": "Duplicate",
        "case": "Same image/nearby loc",
        "input": "R1 & R2",
        "expected": "duplicate/needs_review",
        "actual": f"Groups: {len(dup_res)}",
        "result": status
    })

    # Case 2: Same location, different categories
    r3 = {"report_id": "R3", "image_path": os.path.join(test_dir, images[0]),
          "reported_category": "Animal", "latitude": 40.0, "longitude": -70.0, "timestamp": "2026-11-02T10:00:00"}
    dup_res_cat = orch.duplicate_detector.detect_duplicates([r1, r3])
    status = "PASS" if len(dup_res_cat) == 0 else "FAIL"
    report.append({
        "module": "Duplicate",
        "case": "Same loc, diff cat",
        "input": "R1 & R3",
        "expected": "No duplicate",
        "actual": f"Groups: {len(dup_res_cat)}",
        "result": status
    })

    # --- MODULE 4: Resolution Verification ---
    print("\nTesting Resolution Verification...")
    # Test with same image (should be unresolved/identical)
    img_path = os.path.join(test_dir, images[0])
    res_ver = orch.process_resolution("REP_RES", img_path, img_path)
    status = "PASS" if res_ver['resolution']['status'] == 'appears_unresolved' else "FAIL"
    report.append({
        "module": "Resolution",
        "case": "Identical images",
        "input": "Same image before/after",
        "expected": "appears_unresolved",
        "actual": res_ver['resolution']['status'],
        "result": status
    })

    # Final Output
    print("\n" + "="*50)
    print(f"{'Module':<20} | {'Case':<25} | {'Result':<10}")
    print("-" * 50)
    for r in report:
        print(f"{r['module']:<20} | {r['case']:<25} | {r['result']:<10}")
    print("="*50)

if __name__ == "__main__":
    run_comprehensive_validation()
