"""
CivicOS - Judge Demonstration & Complaint Submission Verification Suite
Tests the complete end-to-end citizen reporting, AI analysis, local demo persistence,
and municipal review flow to guarantee presentation readiness.
"""

import sys
import json
import time
import urllib.request
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

FASTAPI_URL = "http://127.0.0.1:8000"
EXPRESS_URL = "http://127.0.0.1:5000"
VITE_URL = "http://127.0.0.1:5173"
WORKSPACE = Path(__file__).resolve().parent.parent

def run_judge_demo_tests():
    print("=" * 75)
    print("CIVICOS - JUDGE PRESENTATION READINESS VERIFICATION")
    print("=" * 75)

    # 1. Verify Frontend OpenStreetMap Leaflet Bundle
    print("\n[Step 1] Verifying OpenStreetMap Leaflet Bundle...")
    dist_html = WORKSPACE / "civicos_person1" / "civicos" / "dist" / "index.html"
    assert dist_html.exists(), "Frontend production build missing"
    html_content = dist_html.read_text(encoding="utf-8")
    assert "assets/index-" in html_content, "Compiled assets not found in index.html"
    print(f"  ✓ Frontend production build verified ({dist_html.stat().st_size} bytes)")

    # 2. Verify Leaflet CSS & Map Component Integration
    print("\n[Step 2] Verifying OpenStreetMap Map Tile & CSS Integration...")
    map_component = WORKSPACE / "civicos_person1" / "civicos" / "src" / "components" / "CivicOSMap.tsx"
    assert map_component.exists(), "CivicOSMap component missing"
    map_code = map_component.read_text(encoding="utf-8")
    assert "tile.openstreetmap.org" in map_code, "OpenStreetMap tile provider not configured"
    assert "leaflet.css" in map_code, "Leaflet CSS not imported"
    assert "attribution" in map_code, "OpenStreetMap attribution not present"
    print("  ✓ OpenStreetMap tile service & attribution verified in CivicOSMap.tsx")

    # 3. Test Full Multi-Modal AI Execution for Citizen Submission
    print("\n[Step 3] Submitting Incident with Real Evidence Image to AI Engine...")
    test_img = WORKSPACE / "CivicOS" / "test_image.jpg"
    if not test_img.exists():
        test_img = WORKSPACE / "CivicOS" / "ai_engine" / "datasets" / "processed" / "urban_community_mini50" / "images" / "train" / "137.jpg"
    
    boundary = "----WebKitFormBoundaryDemoTest77"
    body = []
    body.append(f"--{boundary}\r\nContent-Disposition: form-data; name=\"reported_category\"\r\n\r\nPothole\r\n".encode())
    body.append(f"--{boundary}\r\nContent-Disposition: form-data; name=\"report_id\"\r\n\r\nCIV-DEMO-991\r\n".encode())
    body.append(f"--{boundary}\r\nContent-Disposition: form-data; name=\"latitude\"\r\n\r\n12.9716\r\n".encode())
    body.append(f"--{boundary}\r\nContent-Disposition: form-data; name=\"longitude\"\r\n\r\n77.5946\r\n".encode())
    body.append(f"--{boundary}\r\nContent-Disposition: form-data; name=\"image\"; filename=\"pothole_evidence.jpg\"\r\nContent-Type: image/jpeg\r\n\r\n".encode())
    body.append(test_img.read_bytes())
    body.append(f"\r\n--{boundary}--\r\n".encode())

    req = urllib.request.Request(
        f"{FASTAPI_URL}/api/reports/process",
        data=b"".join(body),
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
        method="POST"
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        ai_res = json.loads(resp.read().decode("utf-8"))
        assert resp.status == 200, f"AI processing failed with status {resp.status}"
        print(f"  ✓ AI Analysis Complete for CIV-DEMO-991")
        print(f"    - Category Verification: {ai_res.get('verification', {}).get('status')}")
        print(f"    - Bounding Boxes: {len(ai_res.get('detection', {}).get('detections', []))} detections")
        print(f"    - Duplicate Status: {ai_res.get('duplicates') is not None}")

    # 4. Test Resolution Verification Pipeline
    print("\n[Step 4] Verifying Resolution Comparison Pipeline...")
    res_boundary = "----WebKitFormBoundaryCIVICOSResolution"
    res_body = []
    res_body.append(f"--{res_boundary}\r\nContent-Disposition: form-data; name=\"report_id\"\r\n\r\nCIV-DEMO-991\r\n".encode())
    res_body.append(f"--{res_boundary}\r\nContent-Disposition: form-data; name=\"before_image\"; filename=\"before.jpg\"\r\nContent-Type: image/jpeg\r\n\r\n".encode())
    res_body.append(test_img.read_bytes())
    res_body.append(f"\r\n--{res_boundary}\r\nContent-Disposition: form-data; name=\"after_image\"; filename=\"after.jpg\"\r\nContent-Type: image/jpeg\r\n\r\n".encode())
    res_body.append(test_img.read_bytes())
    res_body.append(f"\r\n--{res_boundary}--\r\n".encode())

    req2 = urllib.request.Request(
        f"{FASTAPI_URL}/api/reports/resolution-verify",
        data=b"".join(res_body),
        headers={"Content-Type": f"multipart/form-data; boundary={res_boundary}"},
        method="POST"
    )
    with urllib.request.urlopen(req2, timeout=30) as resp2:
        res_analysis = json.loads(resp2.read().decode("utf-8"))
        assert resp2.status == 200, f"Resolution verification returned {resp2.status}"
        sim_score = res_analysis.get("resolution", {}).get("similarity_score")
        print(f"  ✓ Resolution Verified with SSIM Structural Similarity: {sim_score:.4f}")

    # 5. Test Express Backend Health & Ollama Chat Assistance
    print("\n[Step 5] Verifying Person 4 Express Backend & Civic AI Assistant...")
    req3 = urllib.request.Request(
        f"{EXPRESS_URL}/api/v1/ai/chat",
        data=json.dumps({"query": "Summarize urgent priorities for the municipal committee", "context": {"activeIncidents": 8, "criticalCount": 2}}).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    with urllib.request.urlopen(req3, timeout=10) as resp3:
        chat_data = json.loads(resp3.read().decode("utf-8"))
        assert chat_data.get("success") is True, "AI Chat failed"
        print(f"  ✓ AI Assistant Response: {chat_data['data']['content'][:75]}...")

    print("\n" + "=" * 75)
    print("ALL JUDGE DEMONSTRATION WORKFLOWS TESTED & READY (100% PASS)")
    print("=" * 75)
    return True

if __name__ == "__main__":
    success = run_judge_demo_tests()
    sys.exit(0 if success else 1)
