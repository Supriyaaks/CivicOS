# Technical Handover: CivicOS AI/ML System (Person 2 to Person 4)

## 1. AI System Overview
The CivicOS AI system is a multi-modal detection and verification pipeline designed to automatically process citizen reports of civic issues. It consists of three specialized object detectors, three verification modules, and a central orchestrator.

### Core Capabilities
- **Urban Community Detector:** Detects 6 main types of civic incidents (Animal, Traffic Light, Waste Container, Pothole, Cracks, Open Manhole).
- **Litter Detector:** specialized one-class detector for litter/waste.
- **RDD Synthetic Detector:** specialized detector for road damage (Longitudinal/Transverse Cracks, Alligator Cracks, Potholes).
- **Incident Verifier:** Checks if the image content matches the user's reported category.
- **Duplicate Detector:** Groups similar reports based on location, time, and visual similarity.
- **Resolution Verifier:** Compares "before" and "after" images to verify repairs.
- **AI Orchestrator:** Coordinates the flow between these modules into a single API-like interface.

## 2. Project File Structure
### AI Modules
- Orchestrator: ai_engine/orchestrator.py
- Urban Detection: ai_engine/detection/detect.py
- Litter Detection: ai_engine/litter_detection/detector.py
- Road Damage Detection: ai_engine/rdd2022_synthetic_detection/detector.py
- Verification: ai_engine/verification/verify.py
- Duplicate Detection: ai_engine/duplicate_detection/detect_duplicates.py
- Resolution Verification: ai_engine/resolution/verify_resolution.py

### Configurations & Models
- Common Config: ai_engine/common/config.py
- RDD Config: ai_engine/rdd2022_synthetic_detection/config.py
- Litter Config: ai_engine/litter_detection/config.py
- Main Model: ai_engine/runs/detection/civicos_mini50_final/weights/best.pt
- Litter Model: ai_engine/runs/litter_detection/mini_taco50/weights/best.pt
- RDD Model: ai_engine/runs/detection/rdd2022_synthetic/weights/best.pt

### Documentation & Tests
- Evaluation Reports: ai_engine/litter_detection/TEST_EVALUATION_REPORT.md, ai_engine/rdd2022_synthetic_detection/TEST_EVALUATION_REPORT.md
- Final Implementation Report: ai_engine/rdd2022_synthetic_detection/FINAL_IMPLEMENTATION_REPORT.md
- Regression Tests: ai_engine/rdd2022_synthetic_detection/regression_test.py

## 3. Input Requirements

### CivicOS_AI_Orchestrator.process_new_report()
| Field | Type | Required | Format | Description |
|---|---|---|---|---|
| report | Dict | Yes | JSON | Object containing report details |
| existing_reports | List[Dict] | No | JSON | List of previous reports for duplicate check |

Report Object Fields:
| Field | Type | Required | Format | Description |
|---|---|---|---|---|
| report_id | String | Yes | UUID/ID | Unique identifier for the report |
| image_path | String | Yes | Path | Absolute path to the uploaded image |
| reported_category | String | Yes | String | Category from predefined list (e.g., "Pothole") |
| latitude | Float | No | Decimal | GPS Latitude |
| longitude | Float | No | Decimal | GPS Longitude |
| timestamp | String | No | ISO8601 | YYYY-MM-DDTHH:MM:SS |

### CivicOS_AI_Orchestrator.process_resolution()
| Field | Type | Required | Format | Description |
|---|---|---|---|---|
| report_id | String | Yes | UUID/ID | ID of the incident being resolved |
| before_image | String | Yes | Path | Path to the image before repair |
| after_image | String | Yes | Path | Path to the image after repair |

## 4. Output Schemas

### Orchestrator process_new_report Output
```json
{
    "report_id": "rep_123",
    "detection": {
        "status": "success",
        "detection_count": 2,
        "detections": [
            { "class_id": 3, "confidence": 0.85, "bbox": [100, 200, 150, 250] }
        ]
    },
    "litter_detection": {
        "status": "success",
        "total_detected": 1,
        "detections": [
            { "category": "Litter", "confidence": 0.92, "bbox": [50, 60, 100, 120], "class_id": 0 }
        ],
        "inference_time_ms": 45.2
    },
    "rdd_detection": {
        "image_path": "path/to/img.jpg",
        "detections": [
            { "class_id": 3, "class_name": "D40 - Pothole", "confidence": 0.88, "bbox": [200, 300, 400, 500] }
        ],
        "inference_time": 0.062
    },
    "verification": {
        "status": "verified",
        "selected_category": "Pothole",
        "detected_category": "Pothole",
        "confidence": 0.85,
        "explanation": "Successfully verified Pothole with 0.85 confidence."
    },
    "duplicates": {
        "report_ids": ["rep_123", "rep_456"],
        "evidence": [
            { "compare_to": "rep_456", "distance": 12.5, "time_diff": 1.2, "similarity": 0.91, "reason": "..." }
        ],
        "recommendation": "duplicate"
    },
    "workflow_status": "processed"
}
```

### Orchestrator process_resolution Output
```json
{
    "report_id": "rep_123",
    "resolution": {
        "status": "appears_resolved",
        "similarity_score": 0.72,
        "before_detections": [],
        "after_detections": [],
        "reason": "Incident detected in 'before' image is no longer present in 'after' image.",
        "confidence": 0.8,
        "recommendation": "Close ticket as resolved and archived."
    },
    "workflow_status": "resolution_verified"
}
```

## 5. Backend Integration Instructions
1. Invocation: Instantiate CivicOS_AI_Orchestrator once as a singleton in the backend service.
2. Image Handling: Save uploaded images to a persistent storage volume and pass the absolute filesystem path to the orchestrator.
3. Coordinate Handling: Pass GPS coordinates as floats. For duplicate detection, provide a list of recent reports from the same geographic area.
4. Human-in-the-Loop: 
   - Any result with status: "needs_review" must be flagged in the municipal dashboard for a human inspector.
   - Any duplicate recommendation of "needs_review" must be manually merged.
5. Database Storage: Store the detection, verification, and rdd_detection results in the incident table for audit trails.

## 6. Model Information
| Model | Classes | Checkpoint | Input | Note |
|---|---|---|---|---|
| Urban Community | 6 | ai_engine/runs/detection/civicos_mini50_final/weights/best.pt | 640x640 | Main detector |
| Mini-TACO50 | 1 | ai_engine/runs/litter_detection/mini_taco50/weights/best.pt | 640x640 | Specialized Litter |
| RDD Synthetic | 4 | ai_engine/runs/detection/rdd2022_synthetic/weights/best.pt | 640x640 | Trained on Synthetic Data |

### RDD Class Mapping
- 0: D00 - Longitudinal Crack
- 1: D10 - Transverse Crack
- 2: D20 - Alligator Crack
- 3: D40 - Pothole

## 7. Error Handling
- Missing Checkpoints: Detectors will print a warning and return a result with status: "error" or empty detections. The orchestrator handles this gracefully.
- Invalid Images: Corrupt files or missing paths result in status: "needs_review" for verification.
- Missing GPS: Duplicate detection will skip geographic checks and rely on temporal/visual similarity.

## 8. Performance
- Inference Time: Total orchestrator pipeline takes ~150-300ms on CPU.
- Accuracy: Based on synthetic/mini-datasets; real-world accuracy will vary.
- Requirements: CPU only (PyTorch CPU), OpenCV, Ultralytics.

## 9. Integration Checklist for Person 4
- [ ] Initialize CivicOS_AI_Orchestrator in backend.
- [ ] Map API request to process_new_report.
- [ ] Implement image upload pipeline to absolute paths.
- [ ] Implement needs_review flagging in Dashboard.
- [ ] Map process_resolution to repair verification workflow.
- [ ] Verify duplicate merging logic in database.
- [ ] End-to-end test from report submission to AI verification.
