# CivicOS AI/ML Integration Handover (Final)

This document provides the technical specifications for integrating the Person 2 AI/ML modules into the CivicOS backend.

## 1. System Architecture
The AI engine is coordinated by the `CivicOS_AI_Orchestrator`. It abstracts the complexity of four specialized modules:
1. **Incident Detector**: Detects six civic issue categories using YOLO11n.
2. **Incident Verifier**: Confirms if the image matches the citizen's report.
3. **Duplicate Detector**: Identifies repeat reports of the same physical incident.
4. **Resolution Verifier**: Compares before/after images to verify repairs.

## 2. Configuration & Setup
**Initialization:**
The orchestrator should be initialized as a singleton in the backend.
```python
from ai_engine.orchestrator import CivicOS_AI_Orchestrator
ai_engine = CivicOS_AI_Orchestrator()
```

**Active Model:**
- **Model:** `civicos_mini50` (YOLO11n)
- **Checkpoint Path:** `ai_engine/runs/detection/civicos_mini50_final/weights/best.pt`
- **Active Key:** `ACTIVE_MODEL_KEY = "mini50_6class"` (defined in `ai_engine/common/config.py`)

**Dependencies:** `ultralytics`, `opencv-python`, `numpy`, `pydantic`.

---

## 3. API Specifications

### A. New Report Processing
Call this method immediately after a citizen uploads a report.
**Method:** `process_new_report(report, existing_reports=None)`

**Input `report` (Dict):**
- `report_id` (str): Unique ID.
- `image_path` (str): Path to the uploaded image.
- `reported_category` (str): One of: `Animal`, `Traffic Light`, `Waste container`, `Pothole`, `Cracks`, `Open manhole`.
- `latitude` (float), `longitude` (float).
- `timestamp` (str): ISO format.

**Output:**
```json
{
  "report_id": "REP_001",
  "detection": {
    "status": "success",
    "detection_count": 1,
    "detections": [{"class_id": 3, "confidence": 0.85, "bbox": [x1, y1, x2, y2]}]
  },
  "verification": {
    "status": "verified",
    "selected_category": "Pothole",
    "detected_category": "Pothole",
    "confidence": 0.85,
    "explanation": "Successfully verified Pothole with 0.85 confidence."
  },
  "duplicates": {
    "report_ids": ["REP_001", "REP_042"],
    "recommendation": "duplicate",
    "evidence": [...]
  },
  "workflow_status": "processed"
}
```

### B. Resolution Verification
Call this when a municipal worker uploads a "fixed" image.
**Method:** `process_resolution(report_id, before_image, after_image)`

**Output Statuses:**
- `appears_resolved`: Issue detected in "before" but not "after".
- `appears_unresolved`: Issue still present or images are identical.
- `needs_review`: Insufficient evidence or viewpoint change.

---

## 4. Human-in-the-Loop & Error Handling
The AI system is a **decision-support tool**, not a final authority.

**Critical Logic:**
- **`needs_review`**: Whenever the AI is uncertain, detection fails, or confidence is low, the status is `needs_review`. **These must be sent to a human moderator.**
- **False Negatives:** If the detector finds nothing, the system does NOT automatically reject the report; it flags it for review.
- **Backend Resilience:** Wrap AI calls in try-except blocks. If the AI engine fails, default the report status to `needs_review` to ensure no citizen report is lost.

## 5. Known Limitations
- **Model Accuracy:** The current Mini50 model is a prototype trained on a very small dataset (50 images). It has low precision and recall.
- **Dependency:** Performance depends heavily on image quality and viewpoint consistency.
