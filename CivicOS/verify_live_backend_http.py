"""
Live HTTP Verification Script for CivicOS AI FastAPI Service.
Spins up Uvicorn on http://127.0.0.1:8000 in a daemon thread,
waits for socket to be ready, and fires actual live HTTP requests.
"""

import os
import sys
import time
import json
import threading
import urllib.request
import urllib.error
from pathlib import Path

CIVICOS_DIR = Path(__file__).resolve().parent
if str(CIVICOS_DIR) not in sys.path:
    sys.path.insert(0, str(CIVICOS_DIR))
os.chdir(str(CIVICOS_DIR))

import uvicorn
from ai_engine.main import app

PORT = 8000
BASE_URL = f"http://127.0.0.1:{PORT}"

def start_server():
    config = uvicorn.Config(app, host="127.0.0.1", port=PORT, log_level="warning")
    server = uvicorn.Server(config)
    server.run()

def wait_for_server(timeout=30):
    start = time.time()
    while time.time() - start < timeout:
        try:
            req = urllib.request.Request(f"{BASE_URL}/api/health")
            with urllib.request.urlopen(req, timeout=2) as resp:
                if resp.status == 200:
                    return True
        except Exception:
            time.sleep(0.5)
    return False

def test_live_endpoints():
    print(f"[LIVE TEST] Starting Uvicorn on {BASE_URL}...")
    server_thread = threading.Thread(target=start_server, daemon=True)
    server_thread.start()

    ready = wait_for_server()
    if not ready:
        print("[FAIL] Server did not become ready within timeout.")
        sys.exit(1)
    print("[PASS] FastAPI Server started and responding.")

    # 1. Health Endpoint
    print("\n--- 1. Testing GET /api/health ---")
    req = urllib.request.Request(f"{BASE_URL}/api/health")
    with urllib.request.urlopen(req) as resp:
        assert resp.status == 200
        health = json.loads(resp.read().decode())
        print(f"Health Response (HTTP {resp.status}):", json.dumps(health, indent=2))
        assert health["orchestrator_ready"] is True
        assert health["models"]["urban_community_detector"] is True
        assert health["models"]["litter_detector"] is True
        assert health["models"]["rdd_synthetic_detector"] is True
    print("[PASS] GET /api/health verified.")

    # 2. Categories Endpoint
    print("\n--- 2. Testing GET /api/categories ---")
    req = urllib.request.Request(f"{BASE_URL}/api/categories")
    with urllib.request.urlopen(req) as resp:
        assert resp.status == 200
        cats = json.loads(resp.read().decode())
        print(f"Supported categories (HTTP {resp.status}): Urban {len(cats['urban_community_classes'])}, RDD {len(cats['rdd_classes'])}")
    print("[PASS] GET /api/categories verified.")

    # Helper for multipart form data
    def build_multipart(fields, files):
        boundary = "----WebKitFormBoundaryCivicOSLiveTest"
        body = bytearray()
        for k, v in fields.items():
            body.extend(f"--{boundary}\r\n".encode())
            body.extend(f'Content-Disposition: form-data; name="{k}"\r\n\r\n'.encode())
            body.extend(f"{v}\r\n".encode())
        for k, (filename, content, content_type) in files.items():
            body.extend(f"--{boundary}\r\n".encode())
            body.extend(f'Content-Disposition: form-data; name="{k}"; filename="{filename}"\r\n'.encode())
            body.extend(f"Content-Type: {content_type}\r\n\r\n".encode())
            body.extend(content)
            body.extend(b"\r\n")
        body.extend(f"--{boundary}--\r\n".encode())
        return body, f"multipart/form-data; boundary={boundary}"

    # 3. Report Processing Endpoint (Valid Request with Real Project Image)
    print("\n--- 3. Testing POST /api/reports/process ---")
    img_path = CIVICOS_DIR / "ai_engine/datasets/processed/urban_community_mini50/images/train/137.jpg"
    if not img_path.exists():
        img_path = CIVICOS_DIR / "test_image.jpg"

    with open(img_path, "rb") as f:
        img_bytes = f.read()

    body, ctype = build_multipart(
        fields={
            "reported_category": "Roads and Potholes",
            "report_id": "CIV-LIVE-001",
            "latitude": "12.9716",
            "longitude": "77.5946",
            "timestamp": "2026-11-02T18:00:00"
        },
        files={"image": ("pothole.jpg", img_bytes, "image/jpeg")}
    )

    req = urllib.request.Request(f"{BASE_URL}/api/reports/process", data=body, headers={"Content-Type": ctype}, method="POST")
    with urllib.request.urlopen(req) as resp:
        assert resp.status == 200
        proc_data = json.loads(resp.read().decode())
        print(f"Report Processed (HTTP {resp.status}):")
        print("  - Report ID:", proc_data.get("report_id"))
        print("  - Workflow Status:", proc_data.get("workflow_status"))
        print("  - Verification:", proc_data.get("verification"))
        print("  - Detection:", proc_data.get("detection"))
        print("  - Litter Detection:", proc_data.get("litter_detection"))
        print("  - RDD Detection:", proc_data.get("rdd_detection"))
        print("  - Duplicates:", proc_data.get("duplicates"))
    print("[PASS] POST /api/reports/process verified.")

    # 4. Resolution Verification Endpoint
    print("\n--- 4. Testing POST /api/reports/resolution-verify ---")
    after_path = CIVICOS_DIR / "test_image.jpg"
    with open(after_path, "rb") as f:
        after_bytes = f.read()

    body, ctype = build_multipart(
        fields={"report_id": "CIV-LIVE-001"},
        files={
            "before_image": ("before.jpg", img_bytes, "image/jpeg"),
            "after_image": ("after.jpg", after_bytes, "image/jpeg")
        }
    )

    req = urllib.request.Request(f"{BASE_URL}/api/reports/resolution-verify", data=body, headers={"Content-Type": ctype}, method="POST")
    with urllib.request.urlopen(req) as resp:
        assert resp.status == 200
        res_data = json.loads(resp.read().decode())
        print(f"Resolution Verified (HTTP {resp.status}):", json.dumps(res_data, indent=2))
        assert "resolution" in res_data
        assert res_data["resolution"]["status"] in ["appears_resolved", "appears_unresolved", "needs_review"]
    print("[PASS] POST /api/reports/resolution-verify verified.")

    # 5. Invalid Request Error Handling (HTTP 400 for non-image)
    print("\n--- 5. Testing Invalid Request (Non-Image File) ---")
    body, ctype = build_multipart(
        fields={"reported_category": "Pothole"},
        files={"image": ("text.txt", b"plain text not image", "text/plain")}
    )
    req = urllib.request.Request(f"{BASE_URL}/api/reports/process", data=body, headers={"Content-Type": ctype}, method="POST")
    try:
        with urllib.request.urlopen(req) as resp:
            print("[FAIL] Expected HTTP 400, got status", resp.status)
            sys.exit(1)
    except urllib.error.HTTPError as e:
        assert e.code == 400
        err_msg = json.loads(e.read().decode())
        print(f"Expected Error Caught (HTTP {e.code}):", err_msg)
    print("[PASS] Invalid request handling verified.")

    print("\n=======================================================")
    print("ALL LIVE HTTP FASTAPI SERVICE TESTS PASSED SUCCESSFULLY!")
    print("=======================================================")

if __name__ == "__main__":
    test_live_endpoints()
