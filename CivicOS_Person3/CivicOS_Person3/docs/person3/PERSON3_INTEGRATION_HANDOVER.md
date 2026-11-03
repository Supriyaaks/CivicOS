# CivicOS — Person 3: Predictive Intelligence & Urban Risk Engine
## Complete Integration Handover & Technical Consumer Guide

This guide is prepared for **Person 1 (Frontend / Dashboard)**, **Person 2 (Database / Persistence)**, and the **System Integration Lead** to consume and integrate the Person 3 intelligence backend.

---

### 1. Person 3 Scope & Capabilities Overview

Person 3 provides the **Predictive Intelligence & Urban Risk Microservice** for CivicOS. It exposes high-performance REST APIs and standalone Python engine classes for:
- Forecasting incident failure likelihood and cascading propagation risks.
- Computing 5-factor normalized severity (0–100) and 4-factor operational priority (0–100, weighting Severity 0.40, ML Risk 0.25, Time Urgency 0.20, Cascading 0.15; classifications: CRITICAL $\ge 85$, HIGH $\ge 60$, MEDIUM $\ge 30$, LOW $< 30$).
- Discovering incident relationship graphs (`NetworkX`) and DBSCAN geospatial hotspots.
- Predicting multi-stage consequence trees (Secondary and Tertiary effects) with causal explanations and breaker actions.
- Running "what-if" counterfactual simulations for environmental shocks and municipal interventions.
- Quantifying the exact Prevention Impact Score (PIS) and risk reduction (ARR, RRR) for interventions.
- Assessing meteorological hazards, compound weather interactions, and zone-specific vulnerabilities.

---

### 2. Microservice Startup & Runtime Environment

#### Runtime Requirements
- **Python**: 3.11, 3.12, 3.13, or 3.14
- **Dependencies**: Install from `requirements.txt`:
  ```bash
  pip install -r requirements.txt
  ```

#### How to Start the Person 3 Backend
Run from the microservice root directory (`CivicOS_Person3/CivicOS_Person3`):
```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```
Interactive API Documentation will be available at:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`
- OpenAPI Specification: `http://localhost:8000/openapi.json`

---

### 3. Database-to-Intelligence Mapping Guide (For Person 2)

Person 3's engines operate on dictionary or DataFrame representations of civic incidents. To pass records from Person 2's database tables to Person 3's APIs or engine classes, map fields according to this specification:

| Person 2 DB Column (Proposed) | Person 3 Field Name | Type | Constraints / Valid Values | Description |
|---|---|:---:|---|---|
| `id` / `incident_id` | `incident_id` | `str` | Non-empty string (e.g., `"INC-1001"`) | Primary identifier of the civic report |
| `incident_type` / `title` | `incident_type` | `str` | One of the 10 standard types (see table below) | Domain category of the infrastructure failure |
| `category` | `category` | `str` | `"Environmental"`, `"Utilities"`, `"Infrastructure"`, `"Traffic & Transport"`, `"Public Safety"` | Municipal infrastructure domain |
| `zone` | `zone` | `str` | `"Central Zone"`, `"East Zone"`, `"South Zone"`, `"West Zone"`, `"North Zone"` | Municipal administrative zone |
| `ward` | `ward` | `str` | String (e.g., `"Ward-101"`) | Municipal ward designation |
| `latitude` | `latitude` | `float` | $-90.0 \le \text{lat} \le 90.0$ (Bangalore grid: $12.85 \dots 13.15$) | Decimal latitude coordinates |
| `longitude` | `longitude` | `float` | $-180.0 \le \text{lon} \le 180.0$ (Bangalore grid: $77.45 \dots 77.78$) | Decimal longitude coordinates |
| `severity` / `raw_score` | `severity_score` | `float` | $1.0 \le \text{score} \le 10.0$ | Assessed raw physical intensity rating |
| `impact_radius` | `impact_radius_meters` | `float` | $\ge 1.0$ (typical: $50 \dots 2500$) | Physical disruption radius in meters |
| `affected_population` | `affected_population` | `int` | $\ge 1$ (typical: $100 \dots 20000$) | Estimated count of impacted citizens |
| `parent_id` | `parent_incident_id` | `str` | Optional / nullable string | ID of the triggering parent incident |
| `status` | `status` | `str` | `"Reported"`, `"Investigating"`, `"In Progress"`, `"Resolved"`, `"Mitigated"` | Workflow lifecycle state |
| `rainfall` | `rainfall_mm` | `float` | $\ge 0.0$ (millimeters) | Current/forecast precipitation |
| `wind_speed` | `wind_speed_kmh` | `float` | $\ge 0.0$ (km/h) | Current/forecast wind speed |
| `temperature` | `temperature_c` | `float` | Celsius (typical: $15.0 \dots 45.0$) | Ambient temperature |
| `humidity` | `humidity_pct` | `float` | $0.0 \le \text{pct} \le 100.0$ (optional, default 65.0) | Relative atmospheric humidity |
| `timestamp` / `created_at` | `timestamp` | `str` | Format: `"YYYY-MM-DD HH:MM:SS"` | Initial reporting timestamp |

#### Supported 10 Standard Incident Types
1. `Flooding / Waterlogging`
2. `Tree Fall`
3. `Water Main Break`
4. `Power Outage`
5. `Gas Leak Report`
6. `Fire Hazard`
7. `Flyover / Bridge Defect`
8. `Sewer Overflow`
9. `Pothole / Road Damage`
10. `Traffic Signal Failure`

---

### 4. Complete REST API Specifications (For Person 1 & Frontend)

#### Endpoint 1: Predictive Risk Forecasting
- **Method & Path**: `POST /api/predict/risk`
- **Purpose**: Calculate statistical ML probability that an incident triggers secondary failures.
- **Request Body**:
  ```json
  {
    "incident_type": "Flooding / Waterlogging",
    "category": "Environmental",
    "zone": "South Zone",
    "severity_score": 8.0,
    "impact_radius_meters": 1200.0,
    "affected_population": 7500,
    "rainfall_mm": 65.0,
    "wind_speed_kmh": 25.0,
    "temperature_c": 24.0
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "cascading_risk_prediction": 1,
    "cascading_probability": 0.5556,
    "risk_percentage": 55.6,
    "risk_tier": "HIGH CASCADE RISK",
    "tier_color": "#EA580C",
    "recommended_stance": "Deploy proactive zonal barricading and rapid containment squads.",
    "influencing_features": [
      {"factor": "affected_population", "importance_weight": 0.1345, "input_value": 7500},
      {"factor": "severity_score", "importance_weight": 0.1209, "input_value": 8.0}
    ]
  }
  ```

#### Endpoint 2: Cascading Consequence Prediction
- **Method & Path**: `POST /cascade`
- **Purpose**: Retrieve multi-stage consequence tree (Secondary & Tertiary), with causal explanations and breaker actions.
- **Request Body**:
  ```json
  {
    "incident_id": "INC-1001",
    "incident_type": "Water Main Break",
    "severity_score": 8.5,
    "rainfall_mm": 20.0,
    "wind_speed_kmh": 15.0,
    "cascading_risk_flag": 1
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "root_incident_id": "INC-1001",
    "root_incident_type": "Water Main Break",
    "overall_threat_level": "CRITICAL CASCADE DANGER",
    "graph_amplified": false,
    "graph_context": "Incident present in graph, but no high-affinity causal triggers found.",
    "total_consequences_predicted": 4,
    "consequences": [
      {
        "consequence_id": "SEC-1",
        "parent_id": "INC-1001",
        "stage": "Secondary",
        "depth": 1,
        "name": "Sub-surface Soil Erosion & Pavement Cavity Formation",
        "subsystem": "Geotechnical & Road Foundation",
        "reason": "High-velocity water jets liquefy road bed granular sub-base.",
        "risk_level": "CRITICAL",
        "time_horizon": "20 mins - 2 hours",
        "preventive_break_action": "Deploy acoustic leak sensors and cordon off affected lane."
      }
    ]
  }
  ```

#### Endpoint 3: Severity & Priority Scoring
- **Method & Path**: `POST /api/scoring/evaluate`
- **Purpose**: Calculate standardized 0–100 severity score and 0–100 dispatch priority.
- **Request Body**:
  ```json
  {
    "severity_score": 8.5,
    "impact_radius_meters": 1200,
    "affected_population": 5000,
    "cascading_risk_flag": 1
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "incident_evaluation": {
      "severity_score": 68.76,
      "priority_score": 62.51,
      "severity_tier": "HIGH",
      "priority_tier": "HIGH",
      "factors": {
        "intensity": 85.0,
        "population": 25.0,
        "geographical": 48.0,
        "cascading": 100.0
      },
      "severity_details": {
        "incident_id": "UNKNOWN",
        "severity_score": 68.76,
        "severity_level": "HIGH",
        "calculation_explanation": "Calculated using 4 factors. Missing: urgency. Weights redistributed."
      },
      "priority_details": {
        "incident_id": "UNKNOWN",
        "priority_score": 62.51,
        "priority_level": "HIGH",
        "priority_explanation": "Priority 62.51 based on highest contribution from severity (68.76). Missing factors: predicted_risk, cascading_impact."
      }
    }
  }
  ```

#### Endpoint 4: Weather Hazard Analysis
- **Method & Path**: `POST /api/weather/analyze`
- **Purpose**: Evaluate meteorological hazard level, active alerts, and zone vulnerability.
- **Request Body**:
  ```json
  {
    "rainfall_mm": 75.0,
    "wind_speed_kmh": 45.0,
    "temperature_c": 22.0,
    "humidity_pct": 85.0
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "threat_level": "RED ALERT",
    "risk_multiplier": 2.0,
    "active_alerts": [
      "CRITICAL: Severe precipitation alert - flash flood risk",
      "CRITICAL: High wind alert - high danger of uprooted trees",
      "WARNING: Compound Risk - High humidity exacerbating waterlogging"
    ],
    "material_stress_index": 1.258
  }
  ```

#### Endpoint 5: Prevention Impact Evaluation (PIS)
- **Method & Path**: `POST /intelligence/prevention-impact`
- **Purpose**: Simulate intervention and calculate ARR, RRR, and Prevention Impact Score (PIS).
- **Request Body**:
  ```json
  {
    "incident_id": "INC-1001",
    "intervention_name": "drainage_clearance",
    "evaluation_type": "SIMULATED",
    "observed_metrics": null
  }
  ```
  *(Note: `incident_id` and `intervention_name` are required. For `evaluation_type: "MEASURED"`, provide `observed_metrics` dictionary containing `cascading_probability` and `severity_score`)*
- **Response (200 OK)**:
  ```json
  {
    "evaluation_id": "EVAL-191DE701",
    "incident_id": "INC-1001",
    "intervention_name": "drainage_clearance",
    "evaluation_type": "SIMULATED",
    "prevention_impact_score": 13.58,
    "impact_classification": "IMPROVED",
    "impact_direction": "Positive",
    "metric_level_differences": {
      "cascading_probability": {"baseline": 0.5556, "intervention": 0.4676, "absolute_reduction": 0.088, "relative_reduction": 15.84},
      "severity_score": {"baseline": 61.84, "intervention": 55.54, "absolute_reduction": 6.30, "relative_reduction": 10.19}
    }
  }
  ```
- **Classification Behavior**:
  - `IMPROVED` (`Positive`): Weighted relative reduction $> +0.5\%$ ($\text{PIS} = \text{raw\_score}$).
  - `WORSENED` (`Negative`): Weighted relative reduction $< -0.5\%$ ($\text{PIS} = 0.0$).
  - `UNCHANGED` (`Neutral`): Weighted relative reduction within $\pm 0.5\%$ ($\text{PIS} = 0.0$).
  - `INSUFFICIENT DATA` (`Neutral`): Missing baseline or intervention physical metrics ($\text{PIS} = 0.0$).

#### Endpoint 6: Geospatial Hotspots & Map Layers
- **Method & Path**: `GET /api/geospatial/hotspots?eps_km=1.5&min_samples=3`
- **Method & Path**: `GET /api/geospatial/map-layers` (Returns GeoJSON `FeatureCollection` for Leaflet/Deck.gl/Mapbox).

#### Endpoint 7: Urban Incident Relationship Network
- **Method & Path**: `GET /relationships?incident_id=INC-1001`
- **Method & Path**: `GET /relationships?limit=50&min_weight=0.35` (Returns global graph summary and sample edges).

#### Endpoint 8: Universal Location Intelligence APIs
- `GET /api/location/options`: Available municipal zones and wards.
- `GET /api/location/zone?zone=South%20Zone`: Filter incident records by zone.
- `GET /api/location/ward?ward=Ward-101`: Filter incident records by ward.
- `GET /api/location/radius?latitude=12.9716&longitude=77.5946&radius_km=2.0`: Distance-based radius filtering.
- `GET /api/location/bounding-box?min_lat=12.90&min_lon=77.55&max_lat=13.00&max_lon=77.65`: Spatial bounding-box window filtering.
- `GET /api/location/summary/zone?zone=South%20Zone`: High-level zonal risk summary and distribution.
- `GET /api/location/summary/ward?ward=Ward-101`: High-level ward risk summary and distribution.

#### Endpoint 9: Analytics & System Metadata
- `GET /api/incidents/summary`: Returns statistical distribution across zones, categories, and priority tiers.
- `GET /api/predict/model-metrics`: Returns trained ML model accuracy, ROC-AUC, confusion matrix, and feature importances.
- `GET /health`: Service health check, loaded record count, graph node/edge counts, and ML model status.
- `GET /`: Microservice root manifest and capability list.

---

### 5. Standalone Python Engine Interfaces (In-Process Consumption)

Teammates who wish to call Person 3 engines directly in Python (without HTTP) can import the engine classes:

```python
from src.predictive.risk_predictor import PredictiveRiskEngine
from src.scoring.severity_engine import SeverityScoringEngine
from src.scoring.priority_scoring import PriorityScoringEngine
from src.graph_engine.relationship_graph import IncidentGraphEngine, CascadingImpactEngine
from src.weather.weather_risk_engine import WeatherRiskEngine
from src.simulation.what_if_engine import WhatIfSimulationEngine
from src.prevention_engine.prevention_impact import PreventionImpactEngine

# 1. Predictive Risk
pred = PredictiveRiskEngine()
pred.load_model()
prob = pred.predict(incident_dict)["cascading_probability"]

# 2. Severity (0-100)
sev = SeverityScoringEngine()
sev_score = sev.calculate_severity(incident_dict)["severity_score"]

# 3. Priority (0-100)
prio = PriorityScoringEngine()
prio_score = prio.calculate_priority(incident_dict, severity_result={"severity_score": sev_score})["priority_score"]

# 4. What-If Simulation
sim = WhatIfSimulationEngine(pred, sev, prio)
sim_delta = sim.simulate_scenario(incident_dict, {"intervention": "drainage_clearance"})

# 5. Prevention Impact Score
pis_eng = PreventionImpactEngine()
evaluation = pis_eng.evaluate_impact("INC-1001", "drainage_clearance", sim_delta["baseline_results"], sim_delta["simulated_results"])
print("PIS Score:", evaluation.prevention_impact_score)
```

---

### 6. Recommended Team Integration Sequence

1. **Step 1 — Verify Environment**: Run `pytest -v` to ensure all 35 tests pass in your local environment.
2. **Step 2 — Launch Microservice**: Run `uvicorn main:app --port 8000` and confirm `/health` returns `200 OK`.
3. **Step 3 — Ingest Database Records (Person 2)**: Map database incident models to the Person 3 fields defined in Section 3.
4. **Step 4 — Wire Frontend Dashboard (Person 1)**: Connect Streamlit or React frontend to the REST endpoints listed in Section 4.
5. **Step 5 — End-to-End Triage Workflow**: From the frontend, submit an incident, view predicted cascading consequences (`/cascade`), trigger an intervention simulation, and render the resulting Prevention Impact Score (`/intelligence/prevention-impact`).
