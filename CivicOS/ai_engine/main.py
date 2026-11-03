"""
CivicOS AI Engine Service (FastAPI)
Provides HTTP API endpoints exposing Person 2's AI Orchestrator to Person 1's Frontend
and Person 4's Backend Integration.

Contracts adhere to:
- ai_engine/PERSON_2_TO_PERSON_4_AI_HANDOVER.md
- ai_engine/FINAL_AI_SYSTEM_TEST_REPORT.md
"""

import os
import sys
import uuid
import shutil
import json
import math
import hmac
import hashlib
import base64
import time
from pathlib import Path
from typing import Optional, List, Dict, Any
from datetime import datetime
from contextlib import asynccontextmanager

# Ensure CivicOS directory is in sys.path
CIVICOS_DIR = Path(__file__).resolve().parent.parent
if str(CIVICOS_DIR) not in sys.path:
    sys.path.insert(0, str(CIVICOS_DIR))

# Suppress ultralytics matplotlib / telemetry warnings
os.environ["YOLO_VERBOSE"] = "False"
cache_dir = CIVICOS_DIR / ".cache"
cache_dir.mkdir(parents=True, exist_ok=True)
os.environ["MPLCONFIGDIR"] = str(cache_dir)
os.environ["YOLO_CONFIG_DIR"] = str(cache_dir)

# Change working directory to CivicOS root so relative paths inside models resolve cleanly
os.chdir(str(CIVICOS_DIR))

from fastapi import FastAPI, File, UploadFile, Form, HTTPException, Header, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from ai_engine.orchestrator import CivicOS_AI_Orchestrator

# Upload directory for transient image processing
UPLOAD_DIR = CIVICOS_DIR / "ai_engine" / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# Supabase Auth Configuration
SUPABASE_JWT_SECRET = os.environ.get("SUPABASE_JWT_SECRET")
CIVICOS_REQUIRE_AUTH = os.environ.get("CIVICOS_REQUIRE_AUTH", "false").lower() == "true"

def decode_supabase_jwt(token: str, secret: Optional[str] = None) -> Dict[str, Any]:
    """
    Decodes and validates a Supabase HS256 JWT token using standard Python libraries.
    Verifies signature if secret is provided; validates expiration timestamp.
    """
    parts = token.strip().split(".")
    if len(parts) != 3:
        raise ValueError("Invalid JWT format (expected header.payload.signature)")

    header_b64, payload_b64, sig_b64 = parts

    def b64_decode(data: str) -> bytes:
        data += "=" * ((4 - len(data) % 4) % 4)
        return base64.urlsafe_b64decode(data.encode("ascii"))

    try:
        header = json.loads(b64_decode(header_b64).decode("utf-8"))
        payload = json.loads(b64_decode(payload_b64).decode("utf-8"))
    except Exception as e:
        raise ValueError(f"Failed to parse JWT payload: {str(e)}")

    if header.get("alg") != "HS256":
        raise ValueError(f"Unsupported JWT algorithm '{header.get('alg')}'. Expected HS256.")

    if secret:
        expected_sig = hmac.new(
            secret.encode("utf-8"),
            f"{header_b64}.{payload_b64}".encode("ascii"),
            hashlib.sha256
        ).digest()
        actual_sig = b64_decode(sig_b64)
        if not hmac.compare_digest(expected_sig, actual_sig):
            raise ValueError("JWT signature verification failed")

    # Expiration check
    exp = payload.get("exp")
    if exp and isinstance(exp, (int, float)) and exp < time.time():
        raise ValueError("JWT token has expired")

    return payload

def get_current_user(authorization: Optional[str] = Header(None)) -> Optional[Dict[str, Any]]:
    """
    Validates Supabase JWT from Authorization: Bearer <token>.
    If CIVICOS_REQUIRE_AUTH is True, missing/invalid token raises HTTP 401.
    If False, allows unauthenticated requests for local testing while logging.
    """
    if not authorization:
        if CIVICOS_REQUIRE_AUTH:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required. Please provide Authorization: Bearer <token> header.",
                headers={"WWW-Authenticate": "Bearer"}
            )
        return None

    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization format. Must start with 'Bearer '.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    token = authorization[7:].strip()
    try:
        payload = decode_supabase_jwt(token, secret=SUPABASE_JWT_SECRET)
        return payload
    except ValueError as e:
        if CIVICOS_REQUIRE_AUTH or SUPABASE_JWT_SECRET:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"JWT verification failed: {str(e)}",
                headers={"WWW-Authenticate": "Bearer"}
            )
        return {"sub": "unverified", "email": "anonymous@civicos.local", "warning": str(e)}

# Singleton Orchestrator instance
_orchestrator_instance: Optional[CivicOS_AI_Orchestrator] = None

def get_orchestrator() -> CivicOS_AI_Orchestrator:
    """Lazy loader for CivicOS_AI_Orchestrator singleton."""
    global _orchestrator_instance
    if _orchestrator_instance is None:
        _orchestrator_instance = CivicOS_AI_Orchestrator()
    return _orchestrator_instance

app = FastAPI(
    title="CivicOS AI Engine API",
    description="AI/ML incident detection, verification, duplicate detection, and resolution verification service.",
    version="1.0.0"
)

# Enable CORS for Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory recent reports cache for duplicate detection across sessions
recent_reports_cache: List[Dict[str, Any]] = []

# Category normalization mapping between citizen portal terms and AI engine classes
CATEGORY_NORMALIZATION = {
    # Urban Community direct mapping
    "animal": "Animal",
    "traffic light": "Traffic Light",
    "waste container": "Waste container",
    "pothole": "Pothole",
    "cracks": "Cracks",
    "open manhole": "Open manhole",
    # Citizen portal labels
    "roads and potholes": "Pothole",
    "road crack": "Cracks",
    "road cracks": "Cracks",
    "street lighting": "Traffic Light",
    "water supply": "Open manhole",
    "drainage and sewage": "Open manhole",
    "garbage and waste management": "Waste container",
    "waste": "Waste container",
    "litter": "Waste container",
    "traffic and road safety": "Traffic Light",
    "public infrastructure": "Cracks"
}

def normalize_category(cat: str) -> str:
    """Normalizes citizen portal category string to the AI engine's expected class name."""
    cleaned = cat.strip().lower()
    return CATEGORY_NORMALIZATION.get(cleaned, cat.strip())

def sanitize_json_values(obj: Any) -> Any:
    """Recursively replaces infinite or NaN floats with JSON-compliant finite numbers."""
    if isinstance(obj, float):
        if math.isinf(obj) or math.isnan(obj):
            return 999999.0
        return obj
    elif isinstance(obj, dict):
        return {k: sanitize_json_values(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [sanitize_json_values(v) for v in obj]
    return obj

@app.get("/api/health")
@app.get("/health")
def health_check():
    """Health check endpoint confirming AI Engine availability and active models."""
    orch = get_orchestrator()
    return {
        "status": "online",
        "service": "CivicOS AI Engine",
        "orchestrator_ready": True,
        "models": {
            "urban_community_detector": orch.detector is not None,
            "litter_detector": orch.litter_detector is not None,
            "rdd_synthetic_detector": orch.rdd_detector is not None,
            "incident_verifier": orch.verifier is not None,
            "duplicate_detector": orch.duplicate_detector is not None,
            "resolution_verifier": orch.resolution_verifier is not None,
            "road_repair_verifier": getattr(orch, "road_repair_verifier", None) is not None,
        }
    }

@app.get("/api/categories")
def get_supported_categories():
    """Returns AI-supported categories and frontend normalization rules."""
    return {
        "urban_community_classes": [
            "Animal",
            "Traffic Light",
            "Waste container",
            "Pothole",
            "Cracks",
            "Open manhole"
        ],
        "litter_classes": ["Litter"],
        "rdd_classes": [
            "D00 - Longitudinal Crack",
            "D10 - Transverse Crack",
            "D20 - Alligator Crack",
            "D40 - Pothole"
        ],
        "category_normalization": CATEGORY_NORMALIZATION
    }

@app.get("/api/auth/verify")
def verify_token(user: Optional[Dict[str, Any]] = Depends(get_current_user)):
    """Verifies the caller's JWT token and returns user profile / claims."""
    if not user:
        return {"authenticated": False, "role": "anonymous"}
    return {
        "authenticated": True,
        "user_id": user.get("sub"),
        "email": user.get("email"),
        "role": user.get("role", "authenticated"),
        "user_metadata": user.get("user_metadata", {}),
    }

@app.post("/api/reports/process")
def process_report(
    image: UploadFile = File(..., description="Uploaded complaint photograph"),
    reported_category: str = Form(..., description="Category selected by citizen"),
    report_id: Optional[str] = Form(None, description="Complaint/Report ID"),
    latitude: Optional[float] = Form(None, description="GPS Latitude"),
    longitude: Optional[float] = Form(None, description="GPS Longitude"),
    timestamp: Optional[str] = Form(None, description="ISO8601 Timestamp"),
    existing_reports: Optional[str] = Form(None, description="Optional JSON array of existing reports for duplicate check"),
    user: Optional[Dict[str, Any]] = Depends(get_current_user)
):
    """
    Primary workflow endpoint:
    Processes a citizen complaint through the complete AI Orchestrator pipeline:
    1. Urban Community six-class incident detection
    2. Mini-TACO50 supplementary litter detection
    3. RDD synthetic road damage detection (experimental)
    4. Incident verification (verified / mismatch / needs_review)
    5. Duplicate incident detection (geographic, temporal, visual)
    """
    orch = get_orchestrator()

    # Validate image content
    if image.content_type and not image.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type '{image.content_type}'. Must be an image."
        )

    # Safe parameter resolution (guards against direct python invocations where defaults are Form FieldInfo)
    actual_report_id = report_id if (report_id and isinstance(report_id, str)) else f"CIV-{uuid.uuid4().hex[:6].upper()}"
    actual_lat = float(latitude) if (latitude is not None and not hasattr(latitude, 'default')) else 12.9716
    actual_lon = float(longitude) if (longitude is not None and not hasattr(longitude, 'default')) else 77.5946
    actual_ts = timestamp if (timestamp and isinstance(timestamp, str)) else datetime.now().strftime("%Y-%m-%dT%H:%M:%S")
    actual_existing = existing_reports if (existing_reports and isinstance(existing_reports, str)) else None

    # Save uploaded image to disk for CV pipeline
    file_ext = Path(image.filename).suffix or ".jpg"
    temp_filename = f"{actual_report_id}_{uuid.uuid4().hex[:8]}{file_ext}"
    saved_image_path = UPLOAD_DIR / temp_filename

    try:
        contents = image.file.read()
        with open(saved_image_path, "wb") as buffer:
            buffer.write(contents)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save uploaded image: {e}"
        )

    # Normalize category
    normalized_cat = normalize_category(reported_category)

    # Construct report object for orchestrator
    report_payload = {
        "report_id": actual_report_id,
        "image_path": str(saved_image_path),
        "reported_category": normalized_cat,
        "latitude": actual_lat,
        "longitude": actual_lon,
        "timestamp": actual_ts
    }

    # Prepare existing reports pool for duplicate checking
    reports_for_duplicate_check: List[Dict[str, Any]] = list(recent_reports_cache)
    if actual_existing:
        try:
            parsed = json.loads(actual_existing)
            if isinstance(parsed, list):
                reports_for_duplicate_check.extend(parsed)
        except Exception:
            pass

    # Run AI Orchestrator
    try:
        result = orch.process_new_report(
            report=report_payload,
            existing_reports=reports_for_duplicate_check if len(reports_for_duplicate_check) > 0 else None
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI pipeline execution failed: {e}"
        )

    # Store in recent cache for subsequent duplicate detection
    recent_reports_cache.append(report_payload)
    if len(recent_reports_cache) > 100:
        recent_reports_cache.pop(0)

    # Do not leak internal filesystem paths to the client
    if "image_path" in result:
        del result["image_path"]
    if result.get("rdd_detection") and "image_path" in result["rdd_detection"]:
        del result["rdd_detection"]["image_path"]

    sanitized = sanitize_json_values(result)
    return JSONResponse(content=sanitized)

@app.post("/api/reports/resolution-verify")
def verify_resolution(
    report_id: str = Form(..., description="Report/Incident ID"),
    before_image: UploadFile = File(..., description="Original incident image before repair"),
    after_image: UploadFile = File(..., description="Completion photograph after repair"),
    user: Optional[Dict[str, Any]] = Depends(get_current_user)
):
    """
    Resolution verification endpoint:
    Compares before and after repair images using SSIM and detection evidence.
    Returns: appears_resolved, appears_unresolved, or needs_review.
    """
    orch = get_orchestrator()

    # Save before image
    before_ext = Path(before_image.filename).suffix or ".jpg"
    before_path = UPLOAD_DIR / f"{report_id}_before_{uuid.uuid4().hex[:6]}{before_ext}"
    before_bytes = before_image.file.read()
    with open(before_path, "wb") as b_buf:
        b_buf.write(before_bytes)

    # Save after image
    after_ext = Path(after_image.filename).suffix or ".jpg"
    after_path = UPLOAD_DIR / f"{report_id}_after_{uuid.uuid4().hex[:6]}{after_ext}"
    after_bytes = after_image.file.read()
    with open(after_path, "wb") as a_buf:
        a_buf.write(after_bytes)

    try:
        result = orch.process_resolution(
            report_id=report_id,
            before_image=str(before_path),
            after_image=str(after_path)
        )
        sanitized = sanitize_json_values(result)
        return JSONResponse(content=sanitized)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Resolution verification failed: {e}"
        )

@app.post("/api/reports/road-repair-verify")
def verify_road_repair(
    report_id: str = Form(..., description="Complaint/Report ID"),
    before_image: UploadFile = File(..., description="Original pothole image"),
    after_image: UploadFile = File(..., description="Corrected road repair photograph"),
    latitude: Optional[float] = Form(None, description="GPS Latitude"),
    longitude: Optional[float] = Form(None, description="GPS Longitude"),
    repair_details: Optional[str] = Form(None, description="Optional JSON string with contractor, materials, notes"),
    candidate_reports: Optional[str] = Form(None, description="Optional JSON array of candidate pothole complaints"),
    user: Optional[Dict[str, Any]] = Depends(get_current_user)
):
    """
    Dedicated Road Repair Verification & Cross-Incident Comparison endpoint:
    1. Multi-model YOLO damage detection (Urban Community + RDD2022).
    2. Image sharpness and quality assessment (Laplacian blur).
    3. Structural & color similarity (SSIM + HSV histogram).
    4. Cross-incident matching against candidate database records with geospatial distance.
    5. Returns verdict: appears_repaired, repair_incomplete, needs_manual_review, or possible_related_pothole.
    """
    orch = get_orchestrator()

    # Save before image
    before_ext = Path(before_image.filename).suffix or ".jpg"
    before_path = UPLOAD_DIR / f"{report_id}_repair_before_{uuid.uuid4().hex[:6]}{before_ext}"
    before_bytes = before_image.file.read()
    with open(before_path, "wb") as b_buf:
        b_buf.write(before_bytes)

    # Save after image
    after_ext = Path(after_image.filename).suffix or ".jpg"
    after_path = UPLOAD_DIR / f"{report_id}_repair_after_{uuid.uuid4().hex[:6]}{after_ext}"
    after_bytes = after_image.file.read()
    with open(after_path, "wb") as a_buf:
        a_buf.write(after_bytes)

    # Parse optional JSON inputs safely
    parsed_repair_details: Optional[Dict[str, Any]] = None
    if repair_details and isinstance(repair_details, str):
        try:
            parsed_repair_details = json.loads(repair_details)
        except Exception:
            parsed_repair_details = {"notes": repair_details}

    parsed_candidates: Optional[List[Dict[str, Any]]] = None
    if candidate_reports and isinstance(candidate_reports, str):
        try:
            parsed = json.loads(candidate_reports)
            if isinstance(parsed, list):
                parsed_candidates = parsed
        except Exception:
            parsed_candidates = None

    actual_lat = float(latitude) if (latitude is not None and not hasattr(latitude, 'default')) else None
    actual_lon = float(longitude) if (longitude is not None and not hasattr(longitude, 'default')) else None

    try:
        result = orch.process_road_repair_verification(
            report_id=report_id,
            before_image=str(before_path),
            after_image=str(after_path),
            latitude=actual_lat,
            longitude=actual_lon,
            repair_details=parsed_repair_details,
            candidate_reports=parsed_candidates
        )
        if "verification" in result:
            result["verification"]["timestamp"] = datetime.now().strftime("%Y-%m-%dT%H:%M:%S")

        sanitized = sanitize_json_values(result)
        return JSONResponse(content=sanitized)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Road repair verification failed: {e}"
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("ai_engine.main:app", host="127.0.0.1", port=8000, reload=False)
