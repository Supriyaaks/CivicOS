# CivicOS — Complete Team Integration Verification Checklist
## Person 3: Predictive Intelligence & Urban Risk Engine Integration Verification

This checklist is provided for the **Integration Lead**, **Person 1 (Frontend)**, and **Person 2 (Database)** to step-by-step verify the integration of Person 3's intelligence microservice into the complete CivicOS platform.

---

### Phase 1: Microservice Startup & Pre-flight Checks
- [ ] **Python Version**: Verified Python 3.11+ is installed.
- [ ] **Dependencies**: Ran `pip install -r requirements.txt` without dependency conflicts.
- [ ] **Data Files Available**: Verified `data/raw/urban_incidents.csv` exists.
- [ ] **Model Files Available**: Verified `data/processed/risk_model.joblib` exists.
- [ ] **Regression Suite**: Executed `pytest -v` and confirmed all 35 tests pass (0 failures).
- [ ] **Microservice Launch**: Started backend via `uvicorn main:app --port 8000 --reload`.
- [ ] **Health Probe**: Sent `GET http://localhost:8000/health` and received HTTP 200 with status `"healthy"`.
- [ ] **OpenAPI Spec**: Confirmed `http://localhost:8000/docs` and `/openapi.json` are accessible.

---

### Phase 2: Database Integration & Data Mapping (Person 2)
- [ ] **Field Name Mapping**: Checked that database schema maps to Person 3 field names:
  - `incident_id` (string)
  - `incident_type` (one of the 10 standard types)
  - `category` (Environmental, Utilities, Infrastructure, Traffic & Transport, Public Safety)
  - `zone` (Central Zone, East Zone, South Zone, West Zone, North Zone)
  - `ward` (string)
  - `latitude` / `longitude` (decimal floats)
  - `severity_score` (float 1.0 to 10.0)
  - `impact_radius_meters` (float >= 1.0)
  - `affected_population` (integer >= 1)
  - `rainfall_mm` / `wind_speed_kmh` / `temperature_c` (floats >= 0)
  - `humidity_pct` (float 0 to 100)
- [ ] **Parent Incident Lineage**: Ensured `parent_incident_id` is populated when an incident is triggered by another incident.
- [ ] **Null Handling**: Ensured missing numeric values default to 0.0 or median rather than nulls.

---

### Phase 3: Frontend Dashboard & API Connectivity (Person 1)
- [ ] **CORS Configuration**: Verified FastAPI CORS middleware allows frontend origin (`*` enabled).
- [ ] **Predictive Risk Display**:
  - Sent incident data to `POST /api/predict/risk`.
  - Frontend displays `cascading_probability` (as a percentage).
  - Frontend renders the appropriate badge using `risk_tier` and `tier_color`.
  - Frontend lists the top `influencing_features` drivers.
- [ ] **Cascading Consequence DAG Display**:
  - Sent incident ID to `POST /cascade`.
  - Frontend renders Secondary and Tertiary consequence cards.
  - Verified `overall_threat_level` banner (`CRITICAL CASCADE DANGER` / `HIGH PROPAGATION RISK`).
  - Rendered `reason` and `preventive_break_action` for each consequence.
  - Checked `graph_amplified` indicator to show whether risk is amplified by graph topology.
- [ ] **Severity & Priority Score Display**:
  - Sent incident metrics to `POST /api/scoring/evaluate`.
  - Rendered standardized 0–100 severity meter and 0–100 operational priority gauge.
  - Displayed factor contribution breakdown.
- [ ] **Weather Hazard Analysis Display**:
  - Sent ambient weather conditions to `POST /api/weather/analyze`.
  - Rendered `threat_level` indicator (`GREEN / NORMAL`, `AMBER WARNING`, `RED ALERT`).
  - Rendered active weather alerts list.
- [ ] **Geospatial Map Layers Display**:
  - Fetched GeoJSON from `GET /api/geospatial/map-layers`.
  - Rendered incident markers and cluster boundaries on map.
  - Fetched hotspots from `GET /api/geospatial/hotspots` and highlighted high-density zones.
- [ ] **Relationship Graph Visualizer**:
  - Fetched connected network from `GET /relationships?incident_id=<id>`.
  - Displayed connected graph edges, relationship types (`PARENT_TRIGGER`, `CAUSAL_AFFINITY`), and weights.

---

### Phase 4: What-If Simulation & Prevention Impact Workflow
- [ ] **Intervention Selection**:
  - User selects recommended action (e.g. `drainage_clearance` or `road_closure`).
  - Triggered `POST /intelligence/prevention-impact` with `incident_id` and `intervention_name`.
- [ ] **Impact Score Display**:
  - Rendered `prevention_impact_score` (PIS on 0–100 scale).
  - Rendered `impact_classification` (`IMPROVED`, `UNCHANGED`, `WORSENED`).
  - Rendered before-and-after comparison table showing Absolute Risk Reduction (ARR) and Relative Risk Reduction (RRR).
- [ ] **Original Incident Immutability**:
  - Confirmed the original incident record in the database is not modified by running what-if simulations.

---

### Phase 5: Error Handling & Edge Cases
- [ ] **Invalid Incident ID (404)**: Confirmed querying a non-existent incident returns a 404 with a helpful error message.
- [ ] **Input Validation Errors (422)**: Confirmed out-of-bound inputs (e.g., negative population, humidity > 100) return HTTP 422 with field-specific detail.
- [ ] **External Dependency Graceful Degradation**: Confirmed the microservice runs cleanly even if Person 2's computer vision package (`ai_engine`) is uninstalled.

---

### Integration Sign-off

| Role | Sign-off Name | Date | Status |
|---|---|---|:---:|
| **Person 3 — Predictive Engine** | Completed & Handed Over | 03-Nov-2026 | **PASSED** |
| **Person 2 — Database / Persistence** | ____________________ | ___________ | [ ] PENDING |
| **Person 1 — Dashboard / Frontend** | ____________________ | ___________ | [ ] PENDING |
| **Integration Lead / Evaluator** | ____________________ | ___________ | [ ] PENDING |
