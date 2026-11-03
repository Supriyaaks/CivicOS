"""
Phase 3 Comprehensive Test Suite
---------------------------------
Features Tested:
1. Feature 2: Geospatial Intelligence (DBSCAN Hotspots, Buffers, GeoJSON, Maps)
2. Feature 3: Predictive Intelligence (Scikit-Learn ML Training, Leakage Prevention, Metrics, Inference)
3. FastAPI Endpoints:
   - GET /api/geospatial/hotspots
   - GET /api/geospatial/map-layers
   - POST /api/predict/risk
   - GET /api/predict/model-metrics
4. Regression check on Feature 1 and Feature 4.
"""

import sys
from pathlib import Path
import pandas as pd

# Setup sys.path for direct imports
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.config import RAW_DATA_PATH
from src.geospatial.spatial_intelligence import SpatialIntelligenceEngine
from src.predictive.risk_predictor import (
    PredictiveRiskEngine,
    NUMERICAL_FEATURES,
)


# ===========================================================================
# 1. FEATURE 2: GEOSPATIAL INTELLIGENCE TESTS
# ===========================================================================

def test_dbscan_hotspot_detection():
    print("[1/9] Testing DBSCAN spatial hotspot clustering...")
    df = pd.read_csv(RAW_DATA_PATH)
    engine = SpatialIntelligenceEngine()

    df_clustered, hotspots = engine.detect_spatial_hotspots(df, eps_km=1.5, min_samples=3)
    assert "cluster_id" in df_clustered.columns, "Clustered dataframe must contain 'cluster_id'"
    assert len(hotspots) > 0, "DBSCAN should detect at least 1 spatial cluster in the urban area"

    for h in hotspots:
        assert "center_latitude" in h
        assert "center_longitude" in h
        assert h["incident_count"] >= 3
        assert 1.0 <= h["average_severity"] <= 10.0
        assert "risk_tier" in h

    print(f"      [PASS] Detected {len(hotspots)} spatial hotspots (Top Hotspot: {hotspots[0]['incident_count']} incidents, avg sev: {hotspots[0]['average_severity']}).")


def test_circle_buffer_generation():
    print("[2/9] Testing impact radius circle buffer geometry generation...")
    engine = SpatialIntelligenceEngine()
    lats, lons = engine.create_circle_buffer_coordinates(12.9716, 77.5946, radius_meters=1000.0, num_points=24)
    assert len(lats) == 25, "Expected 25 points for closed 24-segment circle"
    assert len(lons) == 25
    # First and last points should match (closed boundary)
    assert abs(lats[0] - lats[-1]) < 1e-5
    assert abs(lons[0] - lons[-1]) < 1e-5
    print("      [PASS] Circle buffer boundary generated with closed geometry.")


def test_geojson_map_layers():
    print("[3/9] Testing GeoJSON map layers serialization...")
    df = pd.read_csv(RAW_DATA_PATH)
    engine = SpatialIntelligenceEngine()

    geojson = engine.generate_map_layers_geojson(df, eps_km=1.5)
    assert geojson["type"] == "FeatureCollection"
    assert len(geojson["features"]) == len(df)
    
    first_feat = geojson["features"][0]
    assert first_feat["geometry"]["type"] == "Point"
    assert len(first_feat["geometry"]["coordinates"]) == 2  # [lon, lat]
    assert "impact_radius_meters" in first_feat["properties"]
    assert "severity_score" in first_feat["properties"]
    print(f"      [PASS] GeoJSON FeatureCollection generated with {len(geojson['features'])} point features.")


def test_zone_density_aggregation():
    print("[4/9] Testing municipal zonal density aggregation...")
    df = pd.read_csv(RAW_DATA_PATH)
    engine = SpatialIntelligenceEngine()

    zone_summary = engine.get_zone_density_summary(df)
    assert len(zone_summary) == 5, f"Expected 5 municipal zones, got {len(zone_summary)}"
    total_counted = sum(z["incident_count"] for z in zone_summary)
    assert total_counted == len(df), f"Expected total {len(df)} across zones, got {total_counted}"
    print(f"      [PASS] Aggregated incident density across all {len(zone_summary)} zones.")


# ===========================================================================
# 2. FEATURE 3: PREDICTIVE INTELLIGENCE TESTS
# ===========================================================================

def test_ml_training_and_data_leakage():
    print("[5/9] Testing ML model training and data leakage safeguards...")
    df = pd.read_csv(RAW_DATA_PATH)
    ml_engine = PredictiveRiskEngine()

    summary = ml_engine.train(df, test_size=0.25, random_state=42)
    assert ml_engine.is_trained is True
    assert ml_engine.pipeline is not None

    # Verify zero data leakage: target column must NOT be in feature_names
    from src.predictive.risk_predictor import TARGET_COLUMN
    for feat in ml_engine.feature_names:
        assert feat != TARGET_COLUMN, f"DATA LEAKAGE DETECTED: Target '{TARGET_COLUMN}' found in model features!"

    metrics = summary["metrics"]
    acc = metrics["accuracy"]
    f1 = metrics["f1_score"]
    assert 0.50 <= acc <= 1.0, f"Expected genuine test accuracy >= 50%, got {acc}"
    assert 0.40 <= f1 <= 1.0, f"Expected genuine test F1-score >= 40%, got {f1}"

    # Verify confusion matrix
    cm = metrics["confusion_matrix"]
    # In current implementation, confusion_matrix is a dict: {"true_negatives": ..., ...}
    total_test = metrics["test_samples"]
    sum_cm = cm["true_negatives"] + cm["false_positives"] + cm["false_negatives"] + cm["true_positives"]
    assert sum_cm == total_test

    print(f"      [PASS] Random Forest trained successfully: Test Accuracy = {acc*100:.1f}%, F1 = {f1*100:.1f}%. Zero data leakage verified.")


def test_ml_feature_importances():
    print("[6/9] Testing feature importances extraction...")
    df = pd.read_csv(RAW_DATA_PATH)
    ml_engine = PredictiveRiskEngine()
    ml_engine.train(df)

    importances = ml_engine.training_summary["top_features"]
    assert len(importances) > 0

    # We check that at least one feature has a positive importance
    top_feat = importances[0]
    assert top_feat["importance"] > 0
    print(f"      [PASS] Feature importances validated (Top Driver: '{top_feat['feature']}' with weight {top_feat['importance']:.3f}).")


def test_ml_single_incident_prediction():
    print("[7/9] Testing live scenario inference and probability generation...")
    df = pd.read_csv(RAW_DATA_PATH)
    ml_engine = PredictiveRiskEngine()
    ml_engine.train(df)

    # Test high-risk scenario (Heavy storm + High severity)
    high_risk_input = {
        "incident_type": "Flooding / Waterlogging",
        "category": "Environmental",
        "zone": "South Zone",
        "severity_score": 9.0,
        "impact_radius_meters": 1500.0,
        "affected_population": 12000,
        "rainfall_mm": 85.0,
        "wind_speed_kmh": 45.0,
        "temperature_c": 21.0
    }
    pred_high = ml_engine.predict(high_risk_input)
    assert 0.0 <= pred_high["cascading_probability"] <= 1.0
    assert pred_high["risk_tier"] in ["CRITICAL CASCADE RISK", "HIGH CASCADE RISK", "MODERATE PROPAGATION RISK", "LOW PROPAGATION RISK"]
    assert len(pred_high["influencing_features"]) > 0

    # Test low-risk scenario (Minor pothole, clear weather)
    low_risk_input = {
        "incident_type": "Pothole / Road Damage",
        "category": "Infrastructure",
        "zone": "Central Zone",
        "severity_score": 2.5,
        "impact_radius_meters": 30.0,
        "affected_population": 200,
        "rainfall_mm": 0.0,
        "wind_speed_kmh": 5.0,
        "temperature_c": 28.0
    }
    pred_low = ml_engine.predict(low_risk_input)
    assert pred_low["cascading_probability"] < pred_high["cascading_probability"], "High storm incident should have higher cascading probability than minor pothole"

    print(f"      [PASS] Inference validated: Severe flood probability = {pred_high['cascading_probability']*100:.1f}% vs minor pothole = {pred_low['cascading_probability']*100:.1f}%.")


# ===========================================================================
# 3. FASTAPI INTEGRATION TESTS FOR PHASE 3
# ===========================================================================

def test_fastapi_phase3_endpoints():
    print("[8/9] Testing Phase 3 FastAPI endpoints (GET /api/geospatial/*, POST /api/predict/risk)...")
    from starlette.testclient import TestClient
    from main import app

    client = TestClient(app)

    # 1. Hotspots endpoint
    res_hotspots = client.get("/api/geospatial/hotspots?eps_km=1.5&min_samples=3")
    assert res_hotspots.status_code == 200
    data_hot = res_hotspots.json()
    assert "hotspots" in data_hot
    assert "zonal_density" in data_hot
    assert data_hot["hotspots_detected_count"] > 0

    # 2. Map layers GeoJSON endpoint
    res_layers = client.get("/api/geospatial/map-layers")
    assert res_layers.status_code == 200
    data_geo = res_layers.json()
    assert data_geo["type"] == "FeatureCollection"
    assert len(data_geo["features"]) >= 100

    # 3. Model metrics endpoint
    res_metrics = client.get("/api/predict/model-metrics")
    assert res_metrics.status_code == 200
    data_metrics = res_metrics.json()
    assert "metrics" in data_metrics
    assert data_metrics["metrics"]["accuracy"] > 0.50

    # 4. Predict risk endpoint
    payload = {
        "incident_type": "Tree Fall",
        "category": "Infrastructure",
        "zone": "North Zone",
        "severity_score": 7.5,
        "impact_radius_meters": 300.0,
        "affected_population": 2500,
        "rainfall_mm": 45.0,
        "wind_speed_kmh": 50.0,
        "temperature_c": 23.0
    }
    res_pred = client.post("/api/predict/risk", json=payload)
    assert res_pred.status_code == 200
    data_pred = res_pred.json()
    assert "cascading_probability" in data_pred
    assert "risk_tier" in data_pred
    assert "influencing_features" in data_pred
    print("      [PASS] Phase 3 FastAPI endpoints operational.")


def test_regression_phase2_endpoints():
    print("[9/9] Testing regression on Phase 2 endpoints (GET /relationships, POST /cascade)...")
    from starlette.testclient import TestClient
    from main import app

    client = TestClient(app)

    # Ensure Feature 1 relationships endpoint still works
    res_rel = client.get("/relationships?incident_id=INC-1001")
    assert res_rel.status_code == 200
    assert "connected_incidents" in res_rel.json()

    # Ensure Feature 4 cascade endpoint still works
    res_casc = client.post("/cascade", json={"incident_id": "INC-1001"})
    assert res_casc.status_code == 200
    assert "consequences" in res_casc.json()
    print("      [PASS] Regression passed: Feature 1 and Feature 4 endpoints fully intact.")


if __name__ == "__main__":
    print("=" * 70)
    print("CIVICOS - PERSON 3: PHASE 3 TEST SUITE")
    print("=" * 70)
    test_dbscan_hotspot_detection()
    test_circle_buffer_generation()
    test_geojson_map_layers()
    test_zone_density_aggregation()
    test_ml_training_and_data_leakage()
    test_ml_feature_importances()
    test_ml_single_incident_prediction()
    test_fastapi_phase3_endpoints()
    test_regression_phase2_endpoints()
    print("=" * 70)
    print("ALL 9 PHASE 3 TESTS PASSED SUCCESSFULLY!")
    print("=" * 70)
