"""
Road Repair Verification API Gateway
------------------------------------
Integrates Person 2 AI engine with the Person 3 intelligence framework.
"""

from typing import Dict, Any, List, Optional
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from datetime import datetime
import shutil
import os
import uuid

from .models import RepairVerificationRequest, RepairVerificationResult
from .road_repair_verifier import RoadRepairVerifier
from .detect_duplicates import DuplicateDetector
from src.config import RAW_DATA_PATH

router = APIRouter(prefix="/api/verify", tags=["Road Repair Verification"])

# Initialize engines
# In a real scenario, these would be injected or managed by a singleton
verifier = RoadRepairVerifier()
duplicate_detector = DuplicateDetector()

# Mock storage path for uploaded "corrected" images
UPLOAD_DIR = "CivicOS_Person3/uploads/repairs"
os.makedirs(UPLOAD_DIR, exist_ok=True)

def get_incident_data(incident_id: str) -> Dict[str, Any]:
    """Helper to fetch incident data from the CSV dataset."""
    import pandas as pd
    df = pd.read_csv(RAW_DATA_PATH)
    matching = df[df["incident_id"] == incident_id]
    if matching.empty:
        raise HTTPException(status_code=404, detail=f"Incident {incident_id} not found.")
    return matching.iloc[0].to_dict()

@router.post("/repair", response_model=RepairVerificationResult)
async def verify_repair(
    incident_id: str = Form(...),
    repair_details: Optional[str] = Form(None),
    file: UploadFile = File(...)
):
    """
    Endpoint for municipal officers to upload a corrected road image
    and receive AI verification.
    """
    # 1. Save uploaded image
    file_ext = os.path.splitext(file.filename)[1]
    unique_id = uuid.uuid4().hex[:8]
    filename = f"{incident_id}_corrected_{unique_id}{file_ext}"
    file_path = os.path.join(UPLOAD_DIR, filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # 2. Get Baseline (Original) Image
    # In this project, original images are simulated or stored in a specific raw folder
    # For this implementation, we look for images in the uploads folder matching the incident_id
    original_image_path = None
    # Simulation: assume the 'before' image exists in the uploads directory
    # based on a naming convention: {incident_id}_before.jpg
    potential_paths = [
        f"CivicOS_Person3/uploads/{incident_id}_before.jpg",
        f"CivicOS_Person3/uploads/{incident_id}_before.png"
    ]
    for p in potential_paths:
        if os.path.exists(p):
            original_image_path = p
            break

    if not original_image_path:
        # If no image found, we create a mock 'before' image for verification flow to work in demo
        # In production, this would be a 400 error.
        import cv2
        import numpy as np
        mock_img = np.zeros((512, 512, 3), dtype=np.uint8)
        cv2.putText(mock_img, "MOCK BEFORE", (100, 250), cv2.FONT_HERSHEY_SIMPLEX, 1, (255,255,255), 2)
        original_image_path = os.path.join(UPLOAD_DIR, f"MOCK_{incident_id}_before.jpg")
        cv2.imwrite(original_image_path, mock_img)

    # 3. Get Incident Metadata for Cross-Incident Comparison
    incident_data = get_incident_data(incident_id)

    # We simulate a list of other pothole complaints for the 'compare against others' feature
    import pandas as pd
    df = pd.read_csv(RAW_DATA_PATH)
    candidates = df[df["incident_type"] == "Pothole / Road Damage"].to_dict('records')

    # 4. Run Verification Pipeline
    result = verifier.verify_road_repair(
        before_path=original_image_path,
        after_path=file_path,
        report_id=incident_id,
        latitude=incident_data.get("latitude"),
        longitude=incident_data.get("longitude"),
        repair_details={"details": repair_details} if repair_details else None,
        candidate_reports=candidates
    )

    # Replace tick count with ISO timestamp
    result["timestamp"] = datetime.now().isoformat()

    return result
