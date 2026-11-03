from pydantic import BaseModel
from typing import List, Optional

class DetectionResult(BaseModel):
    category: str
    confidence: float
    bbox: List[float]  # [x_min, y_min, x_max, y_max]

class IncidentReport(BaseModel):
    report_id: str
    image_path: str
    reported_category: str
    latitude: float
    longitude: float
    timestamp: str

class VerificationResult(BaseModel):
    is_verified: bool
    detected_category: Optional[str]
    confidence: float
    reason: str
