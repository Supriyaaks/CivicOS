# CivicOS — Person 3: Predictive Intelligence & Urban Risk Engine
## Complete Technical Architecture & Implementation Documentation

---

### 1. Project Overview

**CivicOS** is an AI-assisted urban intelligence, situational awareness, and risk analysis platform engineered to analyze civic incidents, uncover structural relationships across municipal infrastructure, detect geospatial incident clusters, predict cascading systemic failures, calculate multi-factor severity and operational priorities, simulate mitigation interventions, evaluate prevention impacts, and analyze weather-driven threats.

While baseline civic incident management systems operate as passive ticketing registries, CivicOS provides proactive predictive intelligence, deterministic multi-stage cascading consequence modeling, and evidence-based preventive decision support.

---

### 2. Person 3 Responsibilities & Boundary Separation

Person 3 is exclusively responsible for the **Predictive Intelligence & Urban Risk Engine Backend Microservice**:

- **Predictive Machine Learning**: Scikit-Learn classification pipeline forecasting incident cascading likelihood.
- **Geospatial Intelligence**: Coordinate validation, Haversine spherical distance metrics, DBSCAN spatial hotspot clustering, and GeoJSON map layer exports.
- **Incident Relationship Graph**: Directed NetworkX graph representing parent-child triggers, documented causal affinities, and spatial-administrative affinities.
- **Cascading Impact Modeling**: Deterministic DAG-bounded consequence propagation engine modeling Secondary and Tertiary effects with cascade breaker actions.
- **Severity & Priority Scoring**: Multi-factor normalized severity scoring and dynamic operational priority indexing with missing-data redistribution.
- **What-If Scenario Simulation**: Counterfactual incident simulation assessing the effect of environmental shocks and municipal interventions while strictly preserving baseline incident immutability.
- **Preventive Action Recommendation**: Context-aware rule-based catalog suggesting specific municipal mitigation actions.
- **Prevention Impact Scoring (PIS)**: Mathematical evaluation of absolute and relative risk reduction (ARR/RRR) across physical risk dimensions.
- **Weather-Based Hazard Analysis**: Meteorological stress evaluation incorporating compound weather interactions, Material Stress Index (MSI), and municipal zone vulnerability weights.
- **API Endpoints & Schemas**: FastAPI routes and Pydantic validation models powering all Person 3 capabilities.

#### Explicit Out-of-Scope Boundaries
- **Frontend & Dashboards**: Streamlit application (`dashboard/app.py`), HTML/CSS, React components (handled by Person 1 / Frontend developers).
- **Core Database Schemas**: Person 2 relational persistence layers.
- **Road Repair Verification AI**: Computer vision detection pipelines (`src/resolution/road_repair_verifier.py`, `ai_engine`), gracefully isolated in Person 3 APIs.

---

### 3. Ten Core Feature Descriptions

| Feature | Feature Name | Description | Key Modules |
|---|---|---|---|
| **Feature 1** | Urban Incident Relationship Graph | Builds a directed multigraph of urban incidents identifying parent triggers, causal affinities, and spatial proximity. Generates interactive Plotly graphs. | `src/graph_engine/relationship_graph.py` (`IncidentGraphEngine`) |
| **Feature 2** | Geospatial Intelligence | Identifies spatial incident clusters and hotspots using DBSCAN on Haversine distances; calculates buffer boundaries and exports GeoJSON layers. | `src/geospatial/spatial_intelligence.py` (`SpatialIntelligenceEngine`) |
| **Feature 3** | Predictive Intelligence | Random Forest classification pipeline predicting probability of an incident triggering secondary cascading failures with zero data leakage. | `src/predictive/risk_predictor.py` (`PredictiveRiskEngine`) |
| **Feature 4** | Cascading Impact Prediction | Deterministic DAG consequence engine modeling Secondary and Tertiary failures with causal explanations, breaker actions, and graph-aware amplification. | `src/graph_engine/relationship_graph.py` (`CascadingImpactEngine`) |
| **Feature 5** | Impact and Severity Scoring | Normalized weighted scoring model (0–100) aggregating intensity, affected population, geographical impact radius, urgency, and cascading potential. | `src/scoring/severity_engine.py` (`SeverityScoringEngine`) |
| **Feature 6** | Smart Priority Engine | Operational dispatch prioritization combining physical severity, statistical ML failure probability, time-decay urgency, and cascading threat. | `src/scoring/priority_scoring.py` (`PriorityScoringEngine`) |
| **Feature 7** | What-If Simulation | Counterfactual simulation framework evaluating environmental changes and municipal interventions while preserving original incident immutability. | `src/simulation/what_if_engine.py` (`WhatIfSimulationEngine`) |
| **Feature 8** | Preventive Action Recommendation | Catalog-driven recommendation engine matching incident types, weather triggers, and severity thresholds to actionable municipal interventions. | `src/recommendation/action_recommender.py` (`ActionRecommendationEngine`) |
| **Feature 9** | Prevention Impact Scoring | Quantifies risk reduction from interventions using Absolute Risk Reduction (ARR), Relative Risk Reduction (RRR), and a weighted Prevention Impact Score (PIS). | `src/prevention_engine/prevention_impact.py` (`PreventionImpactEngine`) |
| **Feature 10** | Weather-Based Risk Analysis | Assesses meteorological hazard levels (Rain, Wind, Temperature, Humidity), calculates compound interactions, and applies zone-specific vulnerability weights. | `src/weather/weather_risk_engine.py` (`WeatherRiskEngine`) |

---

### 4. Architecture and Module Structure

```
CivicOS_Person3/
├── main.py                     # FastAPI application gateway & API route registrations
├── requirements.txt            # Microservice runtime and test dependencies
├── data/
│   ├── raw/
│   │   └── urban_incidents.csv # Baseline synthetic urban incidents dataset (130 records)
│   └── processed/
│       ├── risk_model.joblib   # Persisted Scikit-learn predictive classification pipeline
│       └── model_metadata.joblib # Persisted model metrics and feature definitions
├── src/
│   ├── config.py               # Central paths, bounds, vulnerability weights, thresholds
│   ├── graph_engine/
│   │   └── relationship_graph.py # Feature 1 & Feature 4 (Graph & Cascade engines)
│   ├── geospatial/
│   │   └── spatial_intelligence.py # Feature 2 (DBSCAN, GeoJSON, Buffers)
│   ├── location_intelligence/
│   │   └── location_engine.py  # Geographic filtering (Zone, Ward, Radius, Bounding Box)
│   ├── predictive/
│   │   └── risk_predictor.py   # Feature 3 (Scikit-Learn ML pipeline)
│   ├── scoring/
│   │   ├── severity_engine.py  # Feature 5 (5-Factor Normalized Severity)
│   │   └── priority_scoring.py # Feature 6 (4-Factor Operational Priority)
│   ├── simulation/
│   │   └── what_if_engine.py   # Feature 7 (Counterfactual Shock & Intervention Simulator)
│   ├── recommendation/
│   │   └── action_recommender.py # Feature 8 (Preventive Action Knowledge Base)
│   ├── prevention_engine/
│   │   ├── models.py           # Pydantic schemas for Feature 9
│   │   └── prevention_impact.py# Feature 9 (ARR, RRR, PIS Calculator)
│   ├── weather/
│   │   └── weather_risk_engine.py # Feature 10 (Weather Hazards, Compound Risk, MSI)
│   └── resolution/             # Person 2 CV integration boundary (safely guarded)
└── tests/
    ├── test_integration_e2e.py # Complete 9-stage end-to-end intelligence test
    ├── test_phase2.py          # Phase 2 graph, cascade, distance & API tests (8 tests)
    ├── test_phase2f.py         # Phase 2F prevention impact scoring tests (10 tests)
    ├── test_phase3.py          # Phase 3 geospatial, predictive ML & API tests (9 tests)
    └── test_weather_risk.py    # Phase 2G weather hazards & threshold tests (7 tests)
```

---

### 5. Important Classes and Functions

#### `IncidentGraphEngine` (`src/graph_engine/relationship_graph.py`)
- `build_graph_from_dataframe(df: pd.DataFrame) -> nx.DiGraph`: Constructs directed graph from incidents, establishing `PARENT_TRIGGER`, `CAUSAL_AFFINITY`, and `SPATIAL_PROXIMITY` edges.
- `get_connected_incidents(incident_id: str) -> List[Dict[str, Any]]`: Returns all inbound and outbound connected incidents with relationship metadata, sorted by weight.
- `generate_plotly_figure(selected_incident_id: Optional[str], subgraph_only: bool) -> go.Figure`: Renders interactive network graph visualizing nodes, weights, and categories.

#### `SpatialIntelligenceEngine` (`src/geospatial/spatial_intelligence.py`)
- `detect_spatial_hotspots(df: pd.DataFrame, eps_km: float = 1.5, min_samples: int = 3) -> Tuple[pd.DataFrame, List[Dict[str, Any]]]`: Performs DBSCAN spatial clustering using radian coordinates and Haversine metric.
- `create_circle_buffer_coordinates(lat: float, lon: float, radius_meters: float, num_points: int = 24) -> Tuple[List[float], List[float]]`: Computes closed polygon coordinates representing spatial impact zones.
- `generate_map_layers_geojson(df: pd.DataFrame, eps_km: float = 1.5) -> Dict[str, Any]`: Generates GeoJSON FeatureCollection formatted for GIS and web map rendering.

#### `PredictiveRiskEngine` (`src/predictive/risk_predictor.py`)
- `train(df: pd.DataFrame) -> Dict[str, Any]`: Trains a 100-estimator Random Forest classifier via a `ColumnTransformer` pipeline with median/constant imputers and One-Hot encoding.
- `predict(incident: Dict[str, Any]) -> Dict[str, Any]`: Generates calibrated cascading failure probability, risk tier, and influential feature drivers.
- `save_model()`, `load_model()`: Persists and restores the trained pipeline and metadata via `joblib`.

#### `CascadingImpactEngine` (`src/graph_engine/relationship_graph.py`)
- `predict_cascade(incident_type: str, severity_score: float, rainfall_mm: float, wind_speed_kmh: float, root_id: str, graph_engine: Optional[Any]) -> Dict[str, Any]`: Evaluates multi-stage consequence tree (Secondary & Tertiary), with selective graph-aware risk amplification based on structural `PARENT_TRIGGER` or high `CAUSAL_AFFINITY` edges.
- `generate_cascade_tree_plotly(cascade_result: Dict[str, Any]) -> go.Figure`: Generates interactive tree diagram mapping root incident to cascading consequences.

#### `SeverityScoringEngine` (`src/scoring/severity_engine.py`)
- `calculate_severity(incident: Dict[str, Any]) -> Dict[str, Any]`: Normalizes intensity, affected population, impact radius, structural urgency, and cascading potential into a 0–100 score. Dynamically redistributes weights if factors are missing.

#### `PriorityScoringEngine` (`src/scoring/priority_scoring.py`)
- `calculate_priority(incident: Dict[str, Any], severity_result: Optional[Dict], predictive_result: Optional[Dict], cascading_result: Optional[Dict]) -> Dict[str, Any]`: Computes operational dispatch priority (0–100) weighting severity (0.40), predictive ML risk (0.25), time urgency (0.20), and cascading impact (0.15). Classifies into CRITICAL ($\ge 85$), HIGH ($\ge 60$), MEDIUM ($\ge 30$), and LOW ($< 30$). Dynamically redistributes weights when factors are missing.

#### `WhatIfSimulationEngine` (`src/simulation/what_if_engine.py`)
- `simulate_scenario(incident: Dict[str, Any], scenario_params: Dict[str, Any]) -> Dict[str, Any]`: Evaluates environmental changes (`additional_rainfall`, `additional_wind_speed`, `temperature_delta`, `humidity_delta`, `response_delay_hours`) and municipal interventions (`drainage_clearance`, `road_closure`) on an isolated copy of the incident, computing metric deltas against baseline.

#### `PreventionImpactEngine` (`src/prevention_engine/prevention_impact.py`)
- `evaluate_impact(incident_id: str, intervention_name: str, baseline_results: Dict, simulated_results: Optional[Dict], observed_metrics: Optional[Dict], evaluation_type: str) -> PreventionImpactEvaluation`: Computes ARR and RRR across physical risk dimensions and returns the weighted Prevention Impact Score (PIS).

#### `WeatherRiskEngine` (`src/weather/weather_risk_engine.py`)
- `evaluate_weather_risk(rainfall_mm: float, wind_speed_kmh: float, temperature_c: float, humidity_pct: Optional[float], zone: Optional[str]) -> Dict[str, Any]`: Computes hazard alerts, risk multiplier, threat level (GREEN / AMBER / RED), and heuristic Material Stress Index (MSI).

---

### 6. API Endpoint Documentation

The Person 3 backend registers 19 complete endpoints covering all intelligence capabilities and location services:

| Method | Endpoint | Feature | Description |
|---|---|---|---|
| `GET` | `/` | System | Project manifest, active features summary, and health status |
| `GET` | `/health` | System | Service health, dataset availability, node/edge counts, ML accuracy |
| `GET` | `/relationships` | Feature 1 | Global graph summary or incident-specific neighborhood query |
| `GET` | `/api/geospatial/hotspots` | Feature 2 | DBSCAN spatial cluster detection and zonal density summary |
| `GET` | `/api/geospatial/map-layers` | Feature 2 | GeoJSON FeatureCollection of all incidents with attributes |
| `POST` | `/api/predict/risk` | Feature 3 | Forecast cascading likelihood using Random Forest ML pipeline |
| `GET` | `/api/predict/model-metrics` | Feature 3 | Retrieve trained model accuracy, ROC-AUC, and feature importances |
| `POST` | `/cascade` | Feature 4 | Rule-based and graph-aware cascading consequence tree |
| `POST` | `/api/scoring/evaluate` | Feature 5, 6 | Evaluate multi-factor severity and operational priority scores |
| `POST` | `/intelligence/prevention-impact` | Feature 9 | Complete Recommendation → Simulation → PIS pipeline |
| `POST` | `/api/weather/analyze` | Feature 10 | Meteorological risk analysis with zone vulnerability weighting |
| `GET` | `/api/incidents/summary` | Analytics | Statistical summary of incidents by zone, category, and status |
| `GET` | `/api/location/options` | Location | Available location filtering tiers, zones, and wards |
| `GET` | `/api/location/zone` | Location | Filter incident records by municipal zone |
| `GET` | `/api/location/ward` | Location | Filter incident records by municipal ward |
| `GET` | `/api/location/radius` | Location | Haversine distance-based radius filtering around GPS coordinates |
| `GET` | `/api/location/bounding-box` | Location | Bounding-box coordinate window filtering |
| `GET` | `/api/location/summary/zone` | Location | Zone-level incident summary and analytics |
| `GET` | `/api/location/summary/ward` | Location | Ward-level incident summary and analytics |

---

### 7. Request and Response Examples Based on Actual Code

#### Example 1: Predictive Risk (`POST /api/predict/risk`)
**Request:**
```json
{
  "incident_type": "Flooding / Waterlogging",
  "category": "Environmental",
  "zone": "South Zone",
  "severity_score": 8.0,
  "impact_radius_meters": 1000.0,
  "affected_population": 6000,
  "rainfall_mm": 55.0,
  "wind_speed_kmh": 20.0,
  "temperature_c": 24.0
}
```
**Response:**
```json
{
  "incident_type": "Flooding / Waterlogging",
  "cascading_probability": 0.5586,
  "risk_tier": "HIGH CASCADE RISK",
  "prediction": 1,
  "influencing_features": [
    {"feature": "affected_population", "value": 6000, "importance_rank": 1},
    {"feature": "impact_radius_meters", "value": 1000.0, "importance_rank": 2},
    {"feature": "severity_score", "value": 8.0, "importance_rank": 3}
  ],
  "model_version": "RandomForest-v1.0-Synthetic"
}
```

#### Example 2: Cascading Consequence Prediction (`POST /cascade`)
**Request:**
```json
{
  "incident_id": "INC-1001",
  "incident_type": "Water Main Break",
  "severity_score": 8.5,
  "rainfall_mm": 25.0,
  "wind_speed_kmh": 20.0,
  "cascading_risk_flag": 1
}
```
**Response:**
```json
{
  "root_incident_id": "INC-1001",
  "root_incident_type": "Water Main Break",
  "root_severity": 8.5,
  "weather_amplified": false,
  "graph_amplified": false,
  "graph_context": "Incident present in graph, but no high-affinity causal triggers found. Risk not amplified by graph topology.",
  "connected_causal_nodes_count": 0,
  "overall_threat_level": "CRITICAL CASCADE DANGER",
  "total_consequences_predicted": 4,
  "critical_consequences_count": 2,
  "high_consequences_count": 1,
  "consequences": [
    {
      "consequence_id": "SEC-1",
      "parent_id": "INC-1001",
      "stage": "Secondary",
      "depth": 1,
      "name": "Sub-surface Soil Erosion & Pavement Cavity Formation",
      "subsystem": "Geotechnical & Road Foundation",
      "reason": "High-velocity water jets liquefy road bed granular sub-base, creating hidden underground voids.",
      "risk_level": "CRITICAL",
      "time_horizon": "20 mins - 2 hours",
      "preventive_break_action": "Deploy acoustic leak sensors and ground-penetrating radar; cordon off affected lane."
    }
  ],
  "prediction_type": "Deterministic Domain Rule-Based Simulation (Transparent Causal Modeling)"
}
```

#### Example 3: Weather Analysis (`POST /api/weather/analyze`)
**Request:**
```json
{
  "rainfall_mm": 75.0,
  "wind_speed_kmh": 45.0,
  "temperature_c": 22.0,
  "humidity_pct": 85.0
}
```
**Response:**
```json
{
  "threat_level": "RED ALERT",
  "risk_multiplier": 2.0,
  "active_alerts": [
    "CRITICAL: Severe precipitation alert - flash flood risk",
    "CRITICAL: High wind alert - high danger of uprooted trees & snapped lines",
    "ADVISORY: High humidity - potential for increased material stress and heat index",
    "WARNING: Compound Risk - High humidity exacerbating waterlogging"
  ],
  "material_stress_index": 1.258,
  "parameters": {
    "rainfall_mm": 75.0,
    "wind_speed_kmh": 45.0,
    "temperature_c": 22.0,
    "humidity_pct": 85.0
  }
}
```

#### Example 4: Prevention Impact Evaluation (`POST /intelligence/prevention-impact`)
**Request:**
```json
{
  "incident_id": "INC-1001",
  "intervention_name": "drainage_clearance"
}
```
**Response:**
```json
{
  "evaluation_id": "PIS-EVAL-1730600000",
  "incident_id": "INC-1001",
  "intervention_name": "drainage_clearance",
  "evaluation_type": "SIMULATED",
  "baseline_metrics": {
    "cascading_probability": 0.5586,
    "severity_score": 65.72,
    "priority_score": 63.83
  },
  "intervention_metrics": {
    "cascading_probability": 0.3972,
    "severity_score": 57.68,
    "priority_score": 55.30
  },
  "metric_level_differences": {
    "cascading_probability": {
      "baseline": 0.5586,
      "intervention": 0.3972,
      "absolute_reduction": 0.1614,
      "relative_reduction": 28.89
    },
    "severity_score": {
      "baseline": 65.72,
      "intervention": 57.68,
      "absolute_reduction": 8.04,
      "relative_reduction": 12.23
    },
    "priority_score": {
      "baseline": 63.83,
      "intervention": 55.30,
      "absolute_reduction": 8.53,
      "relative_reduction": 13.36
    }
  },
  "prevention_impact_score": 22.23,
  "impact_classification": "IMPROVED",
  "impact_direction": "Positive",
  "contributing_factors": [
    "Reduction in cascading_probability by 28.89%",
    "Reduction in severity_score by 12.23%"
  ],
  "assumptions": "Calculated via simulated counterfactual pipeline.",
  "limitations": "Model assumes static environmental conditions during intervention.",
  "data_quality": "HIGH"
}
```

---

### 8. Machine Learning Pipeline Methodology

#### Preprocessing & Architecture
- **Features Used**:
  - Numerical (7): `severity_score`, `impact_radius_meters`, `affected_population`, `rainfall_mm`, `wind_speed_kmh`, `temperature_c`, `humidity_pct`.
  - Categorical (3): `incident_type`, `category`, `zone`.
- **Target**: `cascading_risk_flag` (Binary: 0 or 1).
- **Leakage Prevention**: Strictly excludes post-incident features: `parent_incident_id`, `status`, `recommended_action`, `prevention_impact_score`, and computed `priority_score`.
- **Pipeline Structure**:
  - Numerical Pipeline: `SimpleImputer(strategy='median')` followed by `StandardScaler()`.
  - Categorical Pipeline: `SimpleImputer(strategy='constant', fill_value='Unknown')` followed by `OneHotEncoder(handle_unknown='ignore', sparse_output=False)`.
  - Classifier: `RandomForestClassifier(n_estimators=100, max_depth=5, min_samples_split=4, min_samples_leaf=2, random_state=42)`.
- **Cross-Validation**: 5-fold stratified cross-validation on synthetic training dataset.
- **Persistence**: Persisted using `joblib` into `data/processed/risk_model.joblib`.

---

### 9. Severity and Priority Methodology

#### Severity Scoring Model
Normalized weighted index spanning 0 to 100:
$$\text{Severity} = 0.25 \times I + 0.20 \times P + 0.15 \times G + 0.15 \times U + 0.25 \times C$$
- **Intensity ($I$)**: Scaled raw severity ($0\text{--}10 \to 0\text{--}100$).
- **Population ($P$)**: Affected count normalized against $20{,}000$ cap.
- **Geographical ($G$)**: Impact radius normalized against $2{,}500\text{m}$ cap.
- **Urgency ($U$)**: Base $50$ + hazard keyword bonus ($+30$ for gas, fire, flood) + reporting status bonus.
- **Cascading ($C$)**: Predicted cascading probability ($0\text{--}1 \to 0\text{--}100$).
- **Dynamic Missing-Data Redistribution**: If any factor is unavailable, remaining weights are re-normalized to sum to $1.0$.

#### Priority Scoring Model
Operational dispatch scheduling index spanning 0 to 100:
$$\text{Priority} = 0.40 \times \text{Severity} + 0.25 \times \text{Risk}_{\text{ML}} + 0.20 \times \text{Urgency}_{\text{Time}} + 0.15 \times \text{Cascade}_{\text{Tree}}$$
- **Weights**: Severity ($40\%$), ML Predicted Risk ($25\%$), Time Urgency ($20\%$), Cascading Impact ($15\%$).
- **Classification Tiers**:
  - `CRITICAL`: Priority $\ge 85$
  - `HIGH`: Priority $\ge 60$
  - `MEDIUM`: Priority $\ge 30$
  - `LOW`: Priority $< 30$
- **Dynamic Weight Redistribution**: If any factor is missing (NaN), weights of available factors are normalized:
  $$\text{effective\_weight}_i = \frac{w_i}{\sum_{j \in \text{available}} w_j}$$
- **Deterministic Incident Ranking**: Sorted by priority score (descending), time urgency (descending), and incident ID (ascending).
- **Double-Counting Analysis**: While cascading likelihood informs both severity and priority, it serves distinct analytical purposes: severity evaluates immediate physical damage severity, whereas priority evaluates operational dispatch urgency over time.

---

### 10. Graph and Cascading Methodology

#### Graph Construction (`NetworkX`)
- **Nodes**: Incidents enriched with spatial coordinates, ward, zone, severity, priority, and weather parameters.
- **Edges**:
  - `PARENT_TRIGGER` (weight $0.85$): Recorded causal lineage (`parent_incident_id`).
  - `CAUSAL_AFFINITY` (weight $0.70$): Domain cause-and-effect catalog (`KNOWN_CAUSAL_AFFINITIES`).
  - `SPATIAL_PROXIMITY` (weight $0.50$): Within $1.5\text{km}$ in the same municipal zone/ward.

#### Cascading Consequence Engine
- **Propagation Depth**: Strictly bounded directed acyclic graph (DAG) preventing infinite loops. Depth 1 = Secondary, Depth 2 = Tertiary.
- **Deduplication**: Set tracking of visited consequence names prevents duplicate consequences.
- **Graph-Aware Selective Amplification**: When an incident graph is present, only structural `PARENT_TRIGGER` or strong `CAUSAL_AFFINITY` ($\ge 0.70$) edges amplify consequence risk levels. Spatial proximity alone does not amplify risk.
- **Explainability**: Every consequence includes explicit causal justification (`reason`), affected municipal subsystem (`subsystem`), expected timeline (`time_horizon`), and operational mitigation (`preventive_break_action`).

---

### 11. What-If Simulation Methodology

Counterfactual scenario evaluation follows an immutable pipeline:
1. Baseline metrics computed via `_run_intelligence_pipeline(incident)`.
2. A deep copy `sim_incident = incident.copy()` is modified according to scenario parameters.
3. Supported environmental shocks: `additional_rainfall`, `additional_wind_speed`, `temperature_delta`, `humidity_delta`, `response_delay_hours`.
4. Supported interventions: `drainage_clearance` (halves effective rainfall, reduces severity by 20%), `road_closure` (reduces geographic impact radius by 30%).
5. The original input incident remains 100% immutable.
6. Metric deltas and risk change directions (`INCREASED`, `DECREASED`, `UNCHANGED`) are computed.

---

### 12. Prevention Impact Scoring (PIS) Formulas

#### Absolute Risk Reduction (ARR)
$$\text{ARR} = \text{Baseline Risk} - \text{Intervention Risk}$$

#### Relative Risk Reduction (RRR)
$$\text{RRR} = \left(\frac{\text{Baseline Risk} - \text{Intervention Risk}}{\text{Baseline Risk}}\right) \times 100$$
- If $\text{Baseline Risk} \le 0$, RRR is set to `None` to prevent division by zero.
- For PIS calculation, individual RRR metrics are clamped: $\text{RRR}_{\text{capped}} = \max(\min(\text{RRR}, 100.0), -100.0)$.

#### Prevention Impact Score (PIS)
PIS measures risk reduction across physical risk metrics only:
$$\text{raw\_score} = \frac{\sum w_i \times \text{RRR}_{\text{capped}, i}}{\sum w_i} = 0.6 \times \text{RRR}_{\text{capped}}(\text{cascading\_probability}) + 0.4 \times \text{RRR}_{\text{capped}}(\text{severity\_score})$$
$$\text{PIS} = \max(\min(\text{raw\_score}, 100.0), 0.0)$$
- **Score Scale**: $0.0 \dots 100.0$ (interventions that worsen conditions clamp to $0.0$ PIS).
- **Physical Metrics Only**: Priority score is strictly excluded from PIS weights to focus purely on physical risk reduction.

#### Impact Classification
Impact direction and status are classified using the unconstrained weighted relative reduction ($\text{raw\_score}$) against the numerical tolerance ($\text{tolerance} = 0.5\%$):
- `IMPROVED`: $\text{raw\_score} > 0.5\%$, Impact Direction: `Positive` ($\text{PIS} = \text{raw\_score}$).
- `WORSENED`: $\text{raw\_score} < -0.5\%$, Impact Direction: `Negative` ($\text{PIS} = 0.0$).
- `UNCHANGED`: $|\text{raw\_score}| \le 0.5\%$, Impact Direction: `Neutral` ($\text{PIS} = 0.0$ or negligible non-negative value).
- `INSUFFICIENT DATA`: Physical metrics unavailable for comparison, Impact Direction: `Neutral` ($\text{PIS} = 0.0$).

This guarantees that worsening interventions and unchanged conditions are distinct and clearly distinguishable in API and audit responses.

---

### 13. Weather Analysis Methodology

- **Meteorological Parameters**: Rainfall ($\text{mm}$), Wind Speed ($\text{km/h}$), Temperature ($^{\circ}\text{C}$), Humidity ($\%$, $0\text{--}100$).
- **Zone Vulnerability Weights**: Configurable municipal multipliers reflecting infrastructure resilience:
  - South Zone: Low-lying flood basin (Rainfall: $1.3$, Humidity: $1.2$).
  - Central Zone: Dense urban core (Rainfall: $1.1$, Temperature: $1.2$).
  - West Zone: Elevated hilly corridor (Wind: $1.2$).
- **Compound Risks**:
  - Heavy Rain ($\ge 30\text{mm}$) + High Humidity ($\ge 70\%$) $\to$ Waterlogging compound alert ($+0.15$ multiplier).
  - Extreme Heat ($\ge 35^{\circ}\text{C}$) + High Humidity ($\ge 70\%$) $\to$ Heat stress compound alert ($+0.10$ multiplier).
- **Material Stress Index (MSI)**: Normalized engineering proxy estimating asphalt and equipment degradation:
  $$\text{MSI} = W_{\text{rain}} \cdot \min\left(\frac{\text{Rain}}{100}, 1\right) + W_{\text{temp}} \cdot \max\left(0, \frac{\text{Temp}-20}{25}\right) + W_{\text{hum}} \cdot \max\left(0, \frac{\text{Hum}-50}{40}\right)$$
- **Alert Levels**:
  - `RED ALERT`: Multiplier $\ge 1.7$
  - `AMBER WARNING`: Multiplier $\ge 1.3$
  - `GREEN / NORMAL`: Multiplier $< 1.3$

---

### 14. Validation and Error Handling

- **Pydantic V2 Schemas**: Strict type checking, boundary enforcement (`ge`, `le`), and custom example payloads.
- **Missing Data Handling**:
  - In ML: SimpleImputer with median values for numerical and 'Unknown' category handling.
  - In Scoring: Dynamic weight redistribution ensures scores remain valid when factors are omitted.
  - In Prevention Engine: Emits `INSUFFICIENT DATA` classification when core metrics are unavailable.
- **HTTP Exceptions**: Proper REST status codes:
  - `404 Not Found`: Non-existent incident IDs.
  - `400 Bad Request`: Invalid parameters or unsupported interventions.
  - `500 Internal Server Error`: Dataset path or engine initialization failures.

---

### 15. Dependencies and Installation

Install dependencies from `requirements.txt`:
```bash
pip install -r requirements.txt
```
Core packages:
- `fastapi>=0.110.0`, `uvicorn[standard]>=0.28.0`, `pydantic>=2.6.0`
- `pandas>=2.2.0`, `numpy>=1.26.0`, `scikit-learn>=1.4.0`
- `geopandas>=0.14.0`, `shapely>=2.0.0`, `networkx>=3.2.0`, `plotly>=5.20.0`
- `pytest>=8.0.0`, `httpx>=0.27.0`

---

### 16. How to Run the Backend

From the project root (`CivicOS_Person3/CivicOS_Person3`):
```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```
Interactive API documentation:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

---

### 17. How to Run Tests

From `CivicOS_Person3/CivicOS_Person3`:
```bash
# Run complete test suite via pytest
pytest -v

# Run individual test modules
python tests/test_integration_e2e.py
python tests/test_phase2.py
python tests/test_phase3.py
python tests/test_weather_risk.py
python tests/test_phase2f.py
```

---

### 18. Known Limitations & Engineering Assumptions

1. **Synthetic Training Data**: The baseline dataset of 130 incidents is synthetically generated. Model accuracy (~57.6%) reflects patterns in synthetic data and does not establish real-world predictive validity without municipal field data.
2. **Tree Ensembles & Non-Monotonic Predictions**: Due to orthogonal partition splits in Random Forest decision trees, simultaneous changes in continuous weather variables may occasionally yield non-monotonic probability changes in sparse feature regions.
3. **Linear Intervention Scaling**: What-If interventions apply linear reductions to rainfall and impact radius rather than hydrodynamic fluid simulation models.
4. **Material Stress Index (MSI)**: MSI is an engineering heuristic indicator for multi-variable environmental stress, not an empirical pavement thermodynamics model.
5. **Predefined Action Catalog**: Recommendations are currently matched from a predefined municipal catalog of operational interventions rather than an open-vocabulary generative model.
6. **External AI Engine Dependency**: Road repair verification (`src/resolution/road_repair_verifier.py`) requires external computer vision dependencies (`ai_engine`) that belong to Person 2. Person 3 isolates this router safely so the core predictive microservice remains 100% operational.
