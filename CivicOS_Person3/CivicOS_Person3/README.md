# CivicOS – Person 3: Predictive Intelligence & Urban Risk Engine

Welcome to **CivicOS – Person 3**, an intelligent decision-support system designed for modern municipal command centers, urban planners, and emergency dispatch teams. 

This engine forecasts incident occurrence, evaluates spatial and network-level cascading failures across municipal infrastructure (e.g., how localized stormwater flooding triggers tree falls, power grid failures, and traffic paralysis), and calculates proactive intervention strategies.

---

## 🎯 The 10 Core Features

1. **Urban Incident Relationship Graph (Phase 2 Active)**: Graph-theoretic modeling of urban infrastructure where nodes represent municipal incidents and edges capture causal, temporal, or spatial linkages using NetworkX (`GET /relationships`).
2. **Geospatial Intelligence (Phase 3 Active)**: GIS-powered OpenStreetMap incident mapping, impact-radius buffer rings (`impact_radius_meters`), DBSCAN spatial clustering for hotspot detection, and municipal zone density metrics (`GET /api/geospatial/hotspots`, `GET /api/geospatial/map-layers`).
3. **Predictive Intelligence (Phase 3 Active)**: Supervised Scikit-learn machine learning classification (Random Forest) predicting cascading failure risk (`cascading_risk_flag`), with zero data leakage, genuine hold-out test metrics, feature importances, and interactive inference (`POST /api/predict/risk`, `GET /api/predict/model-metrics`).
4. **Cascading Impact Prediction (Phase 2 Active)**: Multi-hop reachability algorithms that trace secondary and tertiary failure domino effects with causal reasons and prevention break playbooks (`POST /cascade`).
5. **Impact and Severity Scoring**: Multi-dimensional composite scoring weighing infrastructure criticality, physical damage radius, and population exposure.
6. **Smart Priority Engine**: Dynamic real-time dispatch prioritization indexing which civic incidents require emergency action first.
7. **What-If Simulation**: Counterfactual urban shock simulation (e.g., simulating a sudden +60 mm/hr cloudburst or power substation trip).
8. **Preventive Action Recommendation**: Prescriptive playbook matching incidents with actionable municipal department mitigation tasks.
9. **Prevention Impact Score**: Quantitative metric (1–100) evaluating the net risk reduction and cost savings achieved when proactive prevention is applied.
10. **Weather-Based Risk Analysis**: Real-time integration of meteorological factors (rainfall, wind gusts, temperature extremes) with vulnerability multipliers.

---

## 📁 Project Directory Structure

```text
CivicOS_Person3/
│
├── data/                                # Data layer
│   ├── raw/
│   │   └── urban_incidents.csv          # 125 realistic synthetic urban incidents
│   ├── processed/                       # Cleaned, normalized, or feature-engineered datasets
│   │   └── .gitkeep
│   └── generate_dataset.py              # Reproducible dataset generator script
│
├── src/                                 # Core business logic & algorithms organized by feature
│   ├── __init__.py                      # Package initialization
│   ├── config.py                        # Central configuration, file paths, bounds, thresholds
│   │
│   ├── graph_engine/                    # Features 1 & 4 (ACTIVE)
│   │   ├── __init__.py
│   │   └── relationship_graph.py        # NetworkX relationship graph, Plotly visuals, cascading engine
│   │
│   ├── geospatial/                      # Feature 2 (ACTIVE)
│   │   ├── __init__.py
│   │   └── spatial_intelligence.py      # DBSCAN hotspot clustering, buffer rings, GeoJSON, OpenStreetMap
│   │
│   ├── predictive/                      # Feature 3 (ACTIVE)
│   │   ├── __init__.py
│   │   └── risk_predictor.py            # Scikit-learn Random Forest, leakage prevention, metrics, inference
│   │
│   ├── scoring/                         # Features 5, 6 & 9
│   │   ├── __init__.py
│   │   └── priority_scoring.py          # Severity, smart priority & prevention impact scoring
│   │
│   ├── simulation/                      # Feature 7
│   │   ├── __init__.py
│   │   └── what_if_engine.py            # What-if scenario modeling & stress test simulations
│   │
│   ├── recommendation/                  # Feature 8
│   │   ├── __init__.py
│   │   └── action_recommender.py        # Mitigation playbooks & dispatch recommendations
│   │
│   └── weather/                         # Feature 10
│       ├── __init__.py
│       └── weather_risk_engine.py       # Weather risk multipliers & hazard alert thresholds
│
├── dashboard/                           # Frontend presentation layer
│   ├── __init__.py
│   └── app.py                           # Interactive Streamlit + Plotly visual dashboard (Features 1, 2, 3, 4 active)
│
├── tests/                               # Automated Test Suite
│   ├── __init__.py
│   ├── test_phase2.py                   # 8 unit and integration tests (Features 1 & 4)
│   └── test_phase3.py                   # 9 unit and integration tests (Features 2 & 3)
│
├── main.py                              # FastAPI REST API backend & endpoint gateway
├── requirements.txt                     # Python package dependencies
└── README.md                            # Comprehensive project documentation
```

---

## 🌐 FastAPI REST API Endpoints

### 1. Feature 1: Urban Incident Relationship Graph
* **`GET /relationships`**
  * `incident_id` (optional): Query an incident's direct ego-network.
  * `max_distance_km`, `min_weight`, `limit`.

### 2. Feature 2: Geospatial Intelligence (New in Phase 3)
* **`GET /api/geospatial/hotspots`**
  * Query parameters: `eps_km` (default 1.5), `min_samples` (default 3).
  * Returns: Detected DBSCAN spatial clusters, cluster centroids, dominant hazards, incident counts, and municipal zone densities.
* **`GET /api/geospatial/map-layers`**
  * Query parameters: `category`, `zone`, `min_severity`.
  * Returns: Standard GeoJSON `FeatureCollection` with GPS coordinates, impact radius in meters, severity, and status.

### 3. Feature 3: Predictive Intelligence (New in Phase 3)
* **`POST /api/predict/risk`**
  * Request Body: `incident_type`, `category`, `zone`, `severity_score`, `impact_radius_meters`, `affected_population`, `rainfall_mm`, `wind_speed_kmh`, `temperature_c`.
  * Returns: `cascading_risk_prediction` (0 or 1), `cascading_probability` (0.0 to 1.0), `risk_tier` (Critical, High, Moderate, Low), and top influencing drivers.
* **`GET /api/predict/model-metrics`**
  * Returns: Real test accuracy, precision, recall, F1-score, confusion matrix, and feature importances.

### 4. Feature 4: Cascading Impact Prediction
* **`POST /cascade`**
  * Multi-stage secondary and tertiary consequence propagation with causal rationales and cascade breaker actions.

---

## 📊 Dashboard Views (`dashboard/app.py`)

Run the Streamlit dashboard to access interactive graphical tools:
1. **Overview & Incident Explorer**: Summary KPI metrics, incident category bar charts, municipal zone distribution, and searchable dataset explorer.
2. **Feature 1: Urban Incident Relationship Graph**:
   * Interactive incident search dropdown.
   * View toggles: "Focused Ego-Subgraph" or "Citywide Relationship Graph".
   * Plotly 2D interactive network visualization (color-coded by civic domain, node sizes by severity).
   * Detailed connected incidents breakdown table and top 5 urban risk hubs.
3. **Feature 2: Geospatial Intelligence**:
   * Interactive OpenStreetMap layer (no API key required).
   * Category-coded incident markers sized by severity.
   * Dynamic impact-radius buffer rings drawn from `impact_radius_meters`.
   * DBSCAN spatial clustering with adjustable neighborhood distance (`eps_km`) and minimum cluster size.
   * Detected High-Risk Hotspots table with center coordinates, incident counts, and dominant hazards.
   * Municipal zone incident density & population exposure comparison charts.
4. **Feature 3: Predictive Intelligence**:
   * Model Performance Dashboard: Genuine test accuracy, precision, recall, F1-score.
   * Hold-Out Test Confusion Matrix heatmap (True Negatives, False Positives, False Negatives, True Positives).
   * Top Predictive Risk Drivers (Gini feature importance bar chart).
   * Live Interactive Prediction Simulator: Sliders for severity, rainfall, wind, population, and impact radius.
   * Real-time Risk Probability Gauge (0% to 100%) and recommended municipal containment stance.
5. **Feature 4: Cascading Impact Prediction**:
   * Multi-stage propagation tree (Root ➔ Secondary ➔ Tertiary).
   * Tabbed breakdown of Secondary and Tertiary consequences with risk badges, time horizons, causal reasons, and prevention barrier actions.

---

## 🚀 Running the Project

### 1. Run the FastAPI Backend Server
```powershell
python main.py
```
- Interactive Swagger UI: `http://127.0.0.1:8000/docs`
- Redoc UI: `http://127.0.0.1:8000/redoc`

### 2. Run the Interactive Streamlit Dashboard
```powershell
streamlit run dashboard/app.py
```
- Dashboard URL: `http://localhost:8501`

### 3. Run Automated Tests
```powershell
# Run Phase 2 Tests (Features 1 & 4)
python tests/test_phase2.py

# Run Phase 3 Tests (Features 2 & 3)
python tests/test_phase3.py
```
