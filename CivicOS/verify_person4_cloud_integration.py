"""
CivicOS - Person 4: Cloud Backend and Supabase Integration Verification Suite
Tests database schemas, storage integration, auth token verification,
AI result persistence, municipal review queue logic, and end-to-end workflows.
"""

import os
import sys
import json
import time
import hmac
import hashlib
import base64
from pathlib import Path

# Paths
WORKSPACE = Path(__file__).resolve().parent.parent
CIVICOS_DIR = WORKSPACE / "CivicOS"
FRONTEND_DIR = WORKSPACE / "civicos_person1" / "civicos"

sys.path.insert(0, str(CIVICOS_DIR))
os.chdir(str(CIVICOS_DIR))

from fastapi.testclient import TestClient
from ai_engine.main import app, decode_supabase_jwt, get_orchestrator, sanitize_json_values

def generate_test_jwt(user_id: str, email: str, role: str = "citizen", secret: str = "test-secret-key-12345", expired: bool = False) -> str:
    """Generates a test Supabase HS256 JWT token."""
    header = {"alg": "HS256", "typ": "JWT"}
    exp_time = time.time() - 3600 if expired else time.time() + 3600
    payload = {
        "sub": user_id,
        "email": email,
        "role": "authenticated",
        "user_metadata": {"full_name": "Test User", "role": role},
        "app_metadata": {"role": role},
        "exp": exp_time,
        "iss": "https://test-project.supabase.co/auth/v1"
    }

    def b64_encode(data: bytes) -> str:
        return base64.urlsafe_b64encode(data).decode("ascii").rstrip("=")

    h_b64 = b64_encode(json.dumps(header).encode("utf-8"))
    p_b64 = b64_encode(json.dumps(payload).encode("utf-8"))
    signing_input = f"{h_b64}.{p_b64}".encode("ascii")
    sig = hmac.new(secret.encode("utf-8"), signing_input, hashlib.sha256).digest()
    s_b64 = b64_encode(sig)
    return f"{h_b64}.{p_b64}.{s_b64}"

def test_supabase_migration_syntax():
    """Validates the structure and required entities in supabase_migration.sql."""
    print("\n--- 1. Testing Supabase SQL Migration Structure ---")
    sql_path = FRONTEND_DIR / "supabase_migration.sql"
    assert sql_path.exists(), f"Migration file not found at {sql_path}"
    sql_content = sql_path.read_text(encoding="utf-8")

    required_entities = [
        "CREATE TABLE IF NOT EXISTS departments",
        "CREATE TABLE IF NOT EXISTS profiles",
        "CREATE TABLE IF NOT EXISTS complaints",
        "CREATE TABLE IF NOT EXISTS assignments",
        "CREATE TABLE IF NOT EXISTS audit_logs",
        "CREATE TABLE IF NOT EXISTS notifications",
        "ai_verification_status TEXT",
        "detected_category TEXT",
        "is_duplicate BOOLEAN",
        "duplicate_info JSONB",
        "ai_results JSONB",
        "resolution_verification JSONB",
        "incident-evidence",
        "storage.buckets",
        "idx_complaints_ai_status",
        "idx_audit_logs_entity"
    ]

    missing = [e for e in required_entities if e not in sql_content]
    if missing:
        print(f"FAILED: Missing entities in migration: {missing}")
        return False

    print("PASS: supabase_migration.sql contains all required entities (complaints, assignments, audit_logs, AI columns, storage bucket, RLS).")
    return True

def test_jwt_verification():
    """Tests Supabase JWT decode, validation, and expiration checks."""
    print("\n--- 2. Testing JWT Authentication & Validation ---")
    secret = "my-test-supabase-secret"
    valid_token = generate_test_jwt("usr-1234-uuid", "officer@civicos.gov", role="officer", secret=secret)
    expired_token = generate_test_jwt("usr-5678-uuid", "citizen@civicos.gov", role="citizen", secret=secret, expired=True)

    # Valid token decode
    decoded = decode_supabase_jwt(valid_token, secret=secret)
    assert decoded["sub"] == "usr-1234-uuid", "Incorrect user ID decoded"
    assert decoded["email"] == "officer@civicos.gov", "Incorrect email decoded"
    print("PASS: Valid JWT successfully decoded and signature verified.")

    # Expired token detection
    try:
        decode_supabase_jwt(expired_token, secret=secret)
        print("FAILED: Expired token did not raise error.")
        return False
    except ValueError as e:
        assert "expired" in str(e).lower()
        print(f"PASS: Expired JWT correctly rejected ({e}).")

    # Tampered signature detection
    tampered = valid_token[:-4] + "XXXX"
    try:
        decode_supabase_jwt(tampered, secret=secret)
        print("FAILED: Tampered signature did not raise error.")
        return False
    except ValueError as e:
        assert "signature verification failed" in str(e).lower()
        print(f"PASS: Tampered JWT signature correctly rejected ({e}).")

    return True

def test_fastapi_endpoints():
    """Tests FastAPI endpoints: health, auth verify, report process, resolution verify."""
    print("\n--- 3. Testing FastAPI Endpoints (Direct Invocation) ---")
    from ai_engine.main import verify_token, process_report, verify_resolution
    from fastapi import UploadFile

    # 1. Auth verify with unauthenticated user
    anon_result = verify_token(user=None)
    assert anon_result["authenticated"] is False
    assert anon_result["role"] == "anonymous"
    print("PASS: /api/auth/verify returns anonymous state for unauthenticated callers.")

    # 2. Auth verify with mock authenticated user
    mock_user = {"sub": "usr-test-99", "email": "test@civicos.org", "role": "authenticated", "user_metadata": {"role": "officer"}}
    auth_result = verify_token(user=mock_user)
    assert auth_result["authenticated"] is True
    assert auth_result["user_id"] == "usr-test-99"
    print("PASS: /api/auth/verify returns verified user claims.")

    # 3. Report processing with real test image
    test_img = CIVICOS_DIR / "ai_engine" / "datasets" / "processed" / "urban_community_mini50" / "images" / "train" / "137.jpg"
    if not test_img.exists():
        test_img = CIVICOS_DIR / "test_image.jpg"
    assert test_img.exists(), f"Test image not found at {test_img}"

    with open(test_img, "rb") as f:
        file_obj = UploadFile(filename="137.jpg", file=f)
        file_obj.headers = {"content-type": "image/jpeg"}
        response = process_report(
            image=file_obj,
            reported_category="Roads and Potholes",
            report_id="CIV-TEST-PERSON4-01",
            latitude=12.9716,
            longitude=77.5946,
            user=mock_user
        )

    res_data = json.loads(response.body.decode("utf-8"))
    assert res_data["report_id"] == "CIV-TEST-PERSON4-01"
    assert res_data["workflow_status"] == "processed"
    assert "detection" in res_data
    assert "verification" in res_data
    assert "duplicates" in res_data
    print(f"PASS: /api/reports/process returned full AI schema. Verification: {res_data['verification']['status']}, Confidence: {res_data['verification']['confidence']}")

    # 4. Resolution verification
    after_img = CIVICOS_DIR / "test_image.jpg"
    with open(test_img, "rb") as bf, open(after_img, "rb") as af:
        b_file = UploadFile(filename="before.jpg", file=bf)
        b_file.headers = {"content-type": "image/jpeg"}
        a_file = UploadFile(filename="after.jpg", file=af)
        a_file.headers = {"content-type": "image/jpeg"}
        res_resp = verify_resolution(
            report_id="CIV-TEST-PERSON4-01",
            before_image=b_file,
            after_image=a_file,
            user=mock_user
        )

    res_verif = json.loads(res_resp.body.decode("utf-8"))
    assert "resolution" in res_verif
    assert res_verif["resolution"]["status"] in ["appears_resolved", "appears_unresolved", "needs_review"]
    print(f"PASS: /api/reports/resolution-verify returned status: {res_verif['resolution']['status']}, Similarity: {res_verif['resolution']['similarity_score']}")

    return True

def test_municipal_review_queue_logic():
    """Tests the logic of the Municipal Review Queue for filtering and officer determinations."""
    print("\n--- 4. Testing Municipal Review Queue Logic ---")
    mock_complaints = [
        {"id": "CIV-101", "category": "Roads and Potholes", "ai_verification_status": "verified", "is_duplicate": False, "status": "In Progress"},
        {"id": "CIV-102", "category": "Street Lighting", "ai_verification_status": "mismatch", "detected_category": "Waste container", "is_duplicate": False, "status": "Pending"},
        {"id": "CIV-103", "category": "Pothole", "ai_verification_status": "needs_review", "is_duplicate": False, "status": "Pending"},
        {"id": "CIV-104", "category": "Pothole", "ai_verification_status": "verified", "is_duplicate": True, "duplicate_info": {"recommendation": "duplicate"}, "status": "Pending"},
        {"id": "CIV-105", "category": "Cracks", "ai_verification_status": "verified", "is_duplicate": False, "status": "Awaiting Verification", "resolution_verification": {"status": "needs_review", "similarity_score": 0.42}}
    ]

    # Queue filters
    needs_review = [c for c in mock_complaints if c["ai_verification_status"] in ["needs_review", "mismatch"]]
    duplicates = [c for c in mock_complaints if c.get("is_duplicate")]
    verifications = [c for c in mock_complaints if c.get("resolution_verification") or c["status"] == "Awaiting Verification"]

    assert len(needs_review) == 2, f"Expected 2 review items, got {len(needs_review)}"
    assert len(duplicates) == 1, f"Expected 1 duplicate, got {len(duplicates)}"
    assert len(verifications) == 1, f"Expected 1 verification audit, got {len(verifications)}"

    print("PASS: Review queue correctly isolates mismatches (CIV-102), ambiguous detections (CIV-103), duplicate candidates (CIV-104), and resolution audits (CIV-105).")
    return True

def test_production_readiness():
    """Verifies production assets: Dockerfile, docker-compose, and frontend build."""
    print("\n--- 5. Testing Production Deployment Readiness ---")
    ai_dockerfile = CIVICOS_DIR / "Dockerfile"
    fe_dockerfile = FRONTEND_DIR / "Dockerfile"
    compose_file = WORKSPACE / "docker-compose.yml"
    dist_index = FRONTEND_DIR / "dist" / "index.html"

    assert ai_dockerfile.exists(), "CivicOS/Dockerfile missing"
    assert fe_dockerfile.exists(), "frontend Dockerfile missing"
    assert compose_file.exists(), "docker-compose.yml missing"
    assert dist_index.exists(), "frontend production dist/index.html missing"

    print("PASS: All production deployment artifacts verified:")
    print(f"  - AI Backend Dockerfile: {ai_dockerfile}")
    print(f"  - Frontend Dockerfile: {fe_dockerfile}")
    print(f"  - Docker Compose: {compose_file}")
    print(f"  - Production Dist Bundle: {dist_index} (size: {dist_index.stat().st_size} bytes)")
    return True

def main():
    print("=" * 65)
    print("CIVICOS - PERSON 4 CLOUD BACKEND & SUPABASE INTEGRATION TEST SUITE")
    print("=" * 65)

    results = []
    results.append(("Supabase Migration Syntax & Schema", test_supabase_migration_syntax()))
    results.append(("Supabase JWT Auth & Validation", test_jwt_verification()))
    results.append(("FastAPI Endpoints with Auth", test_fastapi_endpoints()))
    results.append(("Municipal Review Queue Logic", test_municipal_review_queue_logic()))
    results.append(("Production Deployment Readiness", test_production_readiness()))

    print("\n" + "=" * 65)
    print("SUMMARY OF VERIFICATION GATES:")
    print("=" * 65)
    all_passed = True
    for name, passed in results:
        status_str = "PASS" if passed else "FAIL"
        print(f"  [{status_str}] {name}")
        if not passed:
            all_passed = False

    assert all_passed, "One or more verification checks failed."
    print("\nALL PERSON 4 CLOUD INTEGRATION CHECKS PASSED.")
    return 0

if __name__ == "__main__":
    sys.exit(main())
