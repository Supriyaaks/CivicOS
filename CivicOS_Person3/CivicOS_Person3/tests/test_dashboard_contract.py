"""
Unit & Contract Tests for Dashboard Integration & Stabilization
--------------------------------------------------------------
Verifies that all data contracts required by both the Streamlit
dashboard and the React officer portal intelligence pages are fully satisfied.
"""

import pytest
import pandas as pd
from starlette.testclient import TestClient
from main import app
from src.config import RAW_DATA_PATH
from src.predictive.risk_predictor import PredictiveRiskEngine
from src.geospatial.spatial_intelligence import SpatialIntelligenceEngine
from src.graph_engine.relationship_graph import IncidentGraphEngine, CascadingImpactEngine


@pytest.fixture(scope="module")
def client():
    return TestClient(app)


@pytest.fixture(scope="module")
def df_incidents():
    return pd.read_csv(RAW_DATA_PATH)


def test_predictive_engine_feature_importances_attribute(df_incidents):
    """
    Prevents Streamlit View 4 crash:
    `predictive_engine.feature_importances[:8]` in dashboard/app.py.
    """
    engine = PredictiveRiskEngine()
    engine.train(df_incidents)
    assert hasattr(engine, "feature_importances"), "PredictiveRiskEngine must expose 'feature_importances' attribute."
    assert isinstance(engine.feature_importances, list)
    assert len(engine.feature_importances) > 0
    assert "feature" in engine.feature_importances[0]
    assert "importance" in engine.feature_importances[0]


def test_spatial_engine_generate_plotly_map_buffers(df_incidents):
    """
    Prevents Streamlit View 2 crash:
    `generate_plotly_map(..., show_impact_buffers=True)` in dashboard/app.py.
    """
    engine = SpatialIntelligenceEngine()
    fig = engine.generate_plotly_map(
        df_incidents,
        show_impact_buffers=True,
        enable_hotspots=True,
        eps_km=1.5,
        min_samples=3
    )
    assert fig is not None
    assert len(fig.data) > 0


def test_spatial_engine_zone_density_total_population_alias(df_incidents):
    """
    Verifies total_population alias is present for React frontend consumption.
    """
    engine = SpatialIntelligenceEngine()
    summary = engine.get_zone_density_summary(df_incidents)
    assert len(summary) > 0
    for z in summary:
        assert "total_affected_population" in z
        assert "total_population" in z
        assert z["total_population"] == z["total_affected_population"]


def test_api_model_metrics_flattened_contract(client):
    """
    Prevents React Predictive Intelligence Blank Page:
    Guarantees test_f1_score, roc_auc, test_accuracy, etc. exist at top level as numbers
    so `.toFixed()` calls never throw TypeError.
    """
    res = client.get("/api/predict/model-metrics")
    assert res.status_code == 200
    data = res.json()

    # Required top-level metrics for React PredictiveIntelligence.tsx
    assert "test_accuracy" in data and isinstance(data["test_accuracy"], (int, float))
    assert "test_precision" in data and isinstance(data["test_precision"], (int, float))
    assert "test_recall" in data and isinstance(data["test_recall"], (int, float))
    assert "test_f1_score" in data and isinstance(data["test_f1_score"], (int, float))
    assert "roc_auc" in data and isinstance(data["roc_auc"], (int, float))

    # Confusion matrix with normalized keys
    assert "confusion_matrix" in data
    cm = data["confusion_matrix"]
    assert "true_negative" in cm
    assert "false_positive" in cm
    assert "false_negative" in cm
    assert "true_positive" in cm

    # Feature importances
    assert "feature_importances" in data
    assert isinstance(data["feature_importances"], list)
    assert len(data["feature_importances"]) > 0


def test_api_relationships_top_connected_hubs_contract(client):
    """
    Verifies top_connected_hubs contract for RootCauseAnalysis.tsx.
    """
    res = client.get("/relationships")
    assert res.status_code == 200
    data = res.json()
    summary = data.get("graph_summary", {})
    assert "top_connected_hubs" in summary
    assert isinstance(summary["top_connected_hubs"], list)
    if summary["top_connected_hubs"]:
        hub = summary["top_connected_hubs"][0]
        assert "incident_id" in hub
        assert "connections" in hub
        assert "dominant_type" in hub
        assert "zone" in hub


def test_api_geospatial_hotspots_zonal_density_dict_contract(client):
    """
    Verifies zonal_density contract for IncidentClustering.tsx.
    """
    res = client.get("/api/geospatial/hotspots?eps_km=1.5&min_samples=3")
    assert res.status_code == 200
    data = res.json()
    assert "zonal_density" in data
    zd = data["zonal_density"]
    assert isinstance(zd, dict)
    assert len(zd) > 0
    # First zone should be a zone name (string) with stats
    first_zone_name = list(zd.keys())[0]
    assert "Zone" in first_zone_name or len(first_zone_name) > 2
    stats = zd[first_zone_name]
    assert "incident_count" in stats
    assert "average_severity" in stats
    assert "total_population" in stats


def test_api_cascade_resilience_and_wrapper(client):
    """
    Verifies cascading prediction returns valid tree and includes wrapper alias.
    """
    payload = {
        "incident_type": "Flooding / Waterlogging",
        "severity_score": 8.0,
        "rainfall_mm": 60.0,
        "wind_speed_kmh": 35.0,
        "cascading_risk_flag": 1
    }
    res = client.post("/cascade", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "consequences" in data
    assert "cascade" in data
    assert len(data["consequences"]) > 0


def test_api_route_aliases(client):
    """
    Verifies all route aliases for both /api/v1/predictive and direct paths.
    """
    # Cascade alias
    res_cas = client.post("/api/cascade", json={"incident_type": "Flooding / Waterlogging"})
    assert res_cas.status_code == 200

    # Relationships alias
    res_rel = client.get("/api/relationships")
    assert res_rel.status_code == 200

    # Hotspots alias
    res_hot = client.get("/api/hotspots")
    assert res_hot.status_code == 200

    # Scoring alias
    res_sco = client.post("/api/scoring", json={"severity_score": 7.0, "impact_radius_meters": 1000, "affected_population": 5000})
    assert res_sco.status_code == 200

    # Weather alias
    res_wea = client.post("/api/weather", json={"rainfall_mm": 50.0, "wind_speed_kmh": 30.0, "temperature_c": 25.0})
    assert res_wea.status_code == 200
