from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
from datetime import datetime

class VerificationMetrics(BaseModel):
    ssim_score: float
    color_similarity: float
    sharpness_score: float
    quality_sufficient: bool
    viewpoint_comparable: bool
    pothole_still_present: bool
    residual_cracks_detected: bool

class RelatedPothole(BaseModel):
    candidate_id: str
    title: str
    status: str
    category: str
    location: str
    latitude: float
    longitude: float
    distance_meters: Optional[float]
    visual_similarity: float
    is_high_coincidence: bool
    match_reason: str
    evidence_url: str

class RepairVerificationResult(BaseModel):
    status: str = Field(..., description="appears_repaired, repair_incomplete, needs_manual_review, possible_related_pothole")
    status_label: str
    report_id: str
    confidence: float
    reason: str
    recommendation: str
    metrics: VerificationMetrics
    repair_details: Dict[str, Any] = {}
    before_detections: List[Dict[str, Any]]
    after_detections: List[Dict[str, Any]]
    rdd_detections: List[Dict[str, Any]]
    related_pothole_matches: List[RelatedPothole]
    timestamp: str

class RepairVerificationRequest(BaseModel):
    incident_id: str
    corrected_image_path: str
    repair_details: Optional[Dict[str, Any]] = None
