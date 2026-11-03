"""
Unit test script for CivicOS AI Engine API endpoints
"""
import os
import sys
import json
import asyncio
from pathlib import Path

CIVICOS_DIR = Path(__file__).resolve().parent
if str(CIVICOS_DIR) not in sys.path:
    sys.path.insert(0, str(CIVICOS_DIR))
os.chdir(str(CIVICOS_DIR))

from fastapi.testclient import TestClient
from ai_engine.main import app

def run_tests():
    client = TestClient(app)
    print("Testing GET /api/health ...")
    resp = client.get("/api/health")
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
    health = resp.json()
    print("Health response:", health)
    assert health["orchestrator_ready"] is True
    assert health["models"]["urban_community_detector"] is True

    print("\nTesting GET /api/categories ...")
    resp = client.get("/api/categories")
    assert resp.status_code == 200
    cats = resp.json()
    print(f"Categories returned: {len(cats['urban_community_classes'])} urban classes")

    print("\nTesting POST /api/reports/process with Pothole image ...")
    pothole_img = "ai_engine/datasets/processed/urban_community_mini50/images/train/137.jpg"
    if not os.path.exists(pothole_img):
        pothole_img = "test_image.jpg"

    with open(pothole_img, "rb") as f:
        resp = client.post(
            "/api/reports/process",
            files={"image": ("pothole.jpg", f, "image/jpeg")},
            data={
                "reported_category": "Pothole",
                "latitude": "12.9716",
                "longitude": "77.5946"
            }
        )
    assert resp.status_code == 200, f"Error: {resp.status_code}, {resp.text}"
    result = resp.json()
    print(f"Report ID: {result.get('report_id')}")
    print(f"Workflow status: {result.get('workflow_status')}")
    print(f"Detection count: {result.get('detection', {}).get('detection_count')}")
    print(f"Verification status: {result.get('verification', {}).get('status')}")
    print(f"Litter detection: {result.get('litter_detection', {}).get('status')}")
    print(f"RDD detections: {len(result.get('rdd_detection', {}).get('detections', []))}")

    print("\nTesting Duplicate Detection with identical coordinates and image ...")
    with open(pothole_img, "rb") as f:
        resp2 = client.post(
            "/api/reports/process",
            files={"image": ("pothole.jpg", f, "image/jpeg")},
            data={
                "reported_category": "Pothole",
                "latitude": "12.9716",
                "longitude": "77.5946"
            }
        )
    result2 = resp2.json()
    dups = result2.get("duplicates")
    print("Duplicate result:", dups)

    print("\nTesting Resolution Verification ...")
    # Use 137.jpg as before, test_image.jpg as after
    img_before = pothole_img
    img_after = "test_image.jpg"
    with open(img_before, "rb") as fb, open(img_after, "rb") as fa:
        resp_res = client.post(
            "/api/reports/resolution-verify",
            files={
                "before_image": ("before.jpg", fb, "image/jpeg"),
                "after_image": ("after.jpg", fa, "image/jpeg")
            },
            data={"report_id": "TEST-RES-1"}
        )
    assert resp_res.status_code == 200, f"Error: {resp_res.status_code}, {resp_res.text}"
    res_data = resp_res.json()
    print("Resolution status:", res_data.get("resolution", {}).get("status"))
    print("Resolution reason:", res_data.get("resolution", {}).get("reason"))

    print("\nALL API ENDPOINT TESTS COMPLETED SUCCESSFULLY!")

if __name__ == "__main__":
    run_tests()
