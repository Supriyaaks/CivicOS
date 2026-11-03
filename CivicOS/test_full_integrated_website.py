"""
CivicOS - Full Integrated Website Testing Script
Executes live HTTP requests against the running FastAPI backend (8000)
and Vite dev server (5173), validating all 4 personas' integrated work.
"""

import os
import sys
import json
import time
import urllib.request
import urllib.parse
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

CIVICOS_DIR = Path(__file__).resolve().parent
TEST_IMAGE_PATH = CIVICOS_DIR / "test_image.jpg"
if not TEST_IMAGE_PATH.exists():
    TEST_IMAGE_PATH = CIVICOS_DIR / "ai_engine" / "datasets" / "processed" / "urban_community_mini50" / "images" / "train" / "137.jpg"

FASTAPI_URL = "http://127.0.0.1:8000"
EXPRESS_URL = "http://127.0.0.1:5000"
VITE_URL = "http://127.0.0.1:5173"

def run_tests():
    print("=" * 70)
    print("CIVICOS MASTER INTEGRATION TEST: VERIFYING RUNNING APPLICATION")
    print("=" * 70)

    # 1. Probe Vite frontend
    print("\n[Gate 1] Probing Vite Frontend Service (Port 5173)...")
    try:
        req = urllib.request.Request(VITE_URL)
        with urllib.request.urlopen(req, timeout=5) as resp:
            content = resp.read().decode("utf-8")
            assert resp.status == 200, f"Expected 200, got {resp.status}"
            assert "<!DOCTYPE html>" in content or "<html" in content, "Invalid HTML response"
            print(f"  ✓ Frontend alive on {VITE_URL} (Status 200 OK)")
    except Exception as e:
        print(f"  ✗ Frontend check failed: {e}")
        return False

    # 2. Probe FastAPI backend health
    print("\n[Gate 2] Probing FastAPI AI Engine (Port 8000)...")
    try:
        req = urllib.request.Request(f"{FASTAPI_URL}/api/health")
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            assert data.get("status") == "online", f"Unexpected status: {data}"
            assert data.get("orchestrator_ready") is True, "Orchestrator not ready"
            print(f"  ✓ AI Engine alive on {FASTAPI_URL}/api/health: {data['status']}")
            print(f"  ✓ Models initialized: {list(data.get('models', {}).keys())}")
    except Exception as e:
        print(f"  ✗ Backend health check failed: {e}")
        return False

    # 3. Probe Vite Reverse Proxy to FastAPI
    print("\n[Gate 3] Probing Vite Reverse Proxy (/api -> Port 8000)...")
    try:
        req = urllib.request.Request(f"{VITE_URL}/api/health")
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            assert data.get("status") == "online", f"Unexpected status: {data}"
            print(f"  ✓ Vite Proxy successfully routes /api/health -> FastAPI")
    except Exception as e:
        print(f"  ✗ Vite proxy check failed: {e}")
        return False

    # 4. Probe Supported Categories
    print("\n[Gate 4] Probing Supported AI Categories...")
    try:
        req = urllib.request.Request(f"{FASTAPI_URL}/api/categories")
        with urllib.request.urlopen(req, timeout=5) as resp:
            cats = json.loads(resp.read().decode("utf-8"))
            print(f"  ✓ Urban Community classes: {len(cats.get('urban_community_classes', []))} classes")
            print(f"  ✓ RDD classes: {len(cats.get('rdd_classes', []))} classes")
            print(f"  ✓ Litter classes: {len(cats.get('litter_classes', []))} classes")
    except Exception as e:
        print(f"  ✗ Categories check failed: {e}")
        return False

    # 5. Live Report Processing with Real Multi-Part Image Upload
    print("\n[Gate 5] Live Report Processing (/api/reports/process)...")
    try:
        assert TEST_IMAGE_PATH.exists(), f"Image not found at {TEST_IMAGE_PATH}"
        img_bytes = TEST_IMAGE_PATH.read_bytes()
        boundary = "----WebKitFormBoundaryCIVICOS7MA4YWxkTrZu0gW"
        
        body = []
        # reported_category
        body.append(f"--{boundary}\r\nContent-Disposition: form-data; name=\"reported_category\"\r\n\r\nPothole\r\n".encode())
        # report_id
        body.append(f"--{boundary}\r\nContent-Disposition: form-data; name=\"report_id\"\r\n\r\nINC-TEST-001\r\n".encode())
        # image file
        body.append(f"--{boundary}\r\nContent-Disposition: form-data; name=\"image\"; filename=\"test_pothole.jpg\"\r\nContent-Type: image/jpeg\r\n\r\n".encode())
        body.append(img_bytes)
        body.append(f"\r\n--{boundary}--\r\n".encode())

        payload = b"".join(body)
        req = urllib.request.Request(
            f"{FASTAPI_URL}/api/reports/process",
            data=payload,
            headers={
                "Content-Type": f"multipart/form-data; boundary={boundary}",
                "User-Agent": "CivicOS-Integration-Tester/1.0"
            },
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=30) as resp:
            result = json.loads(resp.read().decode("utf-8"))
            print(f"  ✓ Live Report Processed! Status: {result.get('status')}")
            print(f"  ✓ Category Verification: {result.get('verification', {}).get('status')}")
            print(f"  ✓ AI Confidence: {result.get('verification', {}).get('confidence')}")
            dup = result.get('duplicates')
            dup_info = dup.get('status') if isinstance(dup, dict) else f"{len(dup)} items" if isinstance(dup, list) else str(dup)
            print(f"  ✓ Duplicates status: {dup_info}")
    except Exception as e:
        print(f"  ✗ Report processing failed: {e}")
        return False

    # 6. Live Resolution Verification with Before & After Images
    print("\n[Gate 6] Live Resolution Verification (/api/reports/resolution-verify)...")
    try:
        boundary = "----WebKitFormBoundaryCIVICOSResolution"
        body = []
        body.append(f"--{boundary}\r\nContent-Disposition: form-data; name=\"report_id\"\r\n\r\nINC-TEST-001\r\n".encode())
        body.append(f"--{boundary}\r\nContent-Disposition: form-data; name=\"before_image\"; filename=\"before.jpg\"\r\nContent-Type: image/jpeg\r\n\r\n".encode())
        body.append(img_bytes)
        body.append(f"\r\n--{boundary}\r\nContent-Disposition: form-data; name=\"after_image\"; filename=\"after.jpg\"\r\nContent-Type: image/jpeg\r\n\r\n".encode())
        body.append(img_bytes)
        body.append(f"\r\n--{boundary}--\r\n".encode())

        payload = b"".join(body)
        req = urllib.request.Request(
            f"{FASTAPI_URL}/api/reports/resolution-verify",
            data=payload,
            headers={
                "Content-Type": f"multipart/form-data; boundary={boundary}",
                "User-Agent": "CivicOS-Integration-Tester/1.0"
            },
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=30) as resp:
            res_result = json.loads(resp.read().decode("utf-8"))
            print(f"  ✓ Live Resolution Verified! Status: {res_result.get('status')}")
            print(f"  ✓ Similarity Score: {res_result.get('resolution', {}).get('similarity_score')}")
    except Exception as e:
        print(f"  ✗ Resolution verification failed: {e}")
        return False

    # 7. Probe Person 4 Express Backend Health (Port 5000)
    print("\n[Gate 7] Probing Person 4 Node/Express Backend (Port 5000)...")
    try:
        req = urllib.request.Request(f"{EXPRESS_URL}/api/v1/health")
        with urllib.request.urlopen(req, timeout=5) as resp:
            exp_health = json.loads(resp.read().decode("utf-8"))
            assert exp_health.get("status") == "OK", f"Unexpected status: {exp_health}"
            print(f"  ✓ Express Backend alive: {exp_health.get('service')} (v{exp_health.get('version')})")
            print(f"  ✓ Database State: {exp_health.get('database')}")
    except Exception as e:
        print(f"  ✗ Express backend health check failed: {e}")
        return False

    # 8. Probe Person 4 AI Infrastructure Status
    print("\n[Gate 8] Probing Person 4 Ollama AI Service Status...")
    try:
        req = urllib.request.Request(f"{EXPRESS_URL}/api/v1/ai/status")
        with urllib.request.urlopen(req, timeout=5) as resp:
            ai_status = json.loads(resp.read().decode("utf-8"))
            print(f"  ✓ AI Service Status: available={ai_status.get('data', {}).get('available')}")
            print(f"  ✓ AI Model: {ai_status.get('data', {}).get('model')} - {ai_status.get('data', {}).get('message')}")
    except Exception as e:
        print(f"  ✗ Person 4 AI status failed: {e}")
        return False

    # 9. Probe Person 4 AI Chat Endpoint
    print("\n[Gate 9] Probing Person 4 AI Chat Assistant...")
    try:
        chat_payload = json.dumps({"query": "What is the critical risk in Sector 4?", "context": {"activeIncidents": 5}}).encode("utf-8")
        req = urllib.request.Request(
            f"{EXPRESS_URL}/api/v1/ai/chat",
            data=chat_payload,
            headers={"Content-Type": "application/json"},
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            chat_res = json.loads(resp.read().decode("utf-8"))
            assert chat_res.get("success") is True, f"Chat failed: {chat_res}"
            print(f"  ✓ AI Assistant Response: {chat_res.get('data', {}).get('content')[:80]}...")
            print(f"  ✓ Model Source: {chat_res.get('data', {}).get('source')}")
    except Exception as e:
        print(f"  ✗ Person 4 AI chat failed: {e}")
        return False

    # 10. Probe Vite Proxy to Person 4 Backend
    print("\n[Gate 10] Probing Vite Proxy to Person 4 Express Backend (/api/v1 -> Port 5000)...")
    try:
        req = urllib.request.Request(f"{VITE_URL}/api/v1/health")
        with urllib.request.urlopen(req, timeout=5) as resp:
            proxy_res = json.loads(resp.read().decode("utf-8"))
            assert proxy_res.get("status") == "OK", f"Unexpected proxy response: {proxy_res}"
            print(f"  ✓ Vite Proxy successfully routed /api/v1/health -> Express Port 5000")
    except Exception as e:
        print(f"  ✗ Vite proxy to Express failed: {e}")
        return False

    print("\n" + "=" * 70)
    print("ALL 10 LIVE INTEGRATION GATES PASSED (100% SUCCESS)")
    print("=" * 70)
    return True

if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)
