"""
Phase 2: Comprehensive Test Suite - Stabilized
---------------------------------
"""

import sys
from pathlib import Path
import pandas as pd
import networkx as nx

# Setup sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.graph_engine.relationship_graph import (
    IncidentGraphEngine,
    CascadingImpactEngine,
    calculate_haversine_distance,
    KNOWN_CAUSAL_AFFINITIES,
)
from src.config import RAW_DATA_PATH

def test_haversine_distance():
    print("[1/8] Testing Haversine distance calculation...")
    lat1, lon1 = 12.9742, 77.5980
    lat2, lon2 = 12.9830, 77.6380
    dist = calculate_haversine_distance(lat1, lon1, lat2, lon2)
    assert 4.0 <= dist <= 5.0, f"Expected approx 4.4 km, got {dist}"
    assert calculate_haversine_distance(lat1, lon1, lat1, lon1) == 0.0
    print("      [PASS] Haversine distance passed.")

def test_graph_engine_build_from_csv():
    print("[2/8] Testing graph construction from synthetic CSV dataset...")
    assert RAW_DATA_PATH.exists(), f"Missing dataset at {RAW_DATA_PATH}"
    df = pd.read_csv(RAW_DATA_PATH)
    assert len(df) >= 100, f"Expected at least 100 records, got {len(df)}"

    engine = IncidentGraphEngine()
    G = engine.build_graph_from_dataframe(df)

    assert G.number_of_nodes() == len(df), f"Node count mismatch: {G.number_of_nodes()} vs {len(df)}"
    assert G.number_of_edges() > 0, "Graph should have established relationship edges"

    first_node = list(G.nodes())[0]
    assert first_node in G.nodes
    print(f"      [PASS] Graph built successfully: {G.number_of_nodes()} nodes, {G.number_of_edges()} edges.")

def test_deterministic_graph_fixture():
    print("[3/8] Testing parent-child trigger relationship edges (Deterministic Fixture)...")
    data = {
        "incident_id": ["INC-F1", "INC-F2", "INC-F3"],
        "incident_type": ["Flooding / Waterlogging", "Power Outage", "Traffic Signal Failure"],
        "category": ["Environmental", "Utilities", "Traffic & Transport"],
        "zone": ["Central Zone", "Central Zone", "Central Zone"],
        "ward": ["Ward-101", "Ward-101", "Ward-101"],
        "latitude": [12.97, 12.971, 12.972],
        "longitude": [77.59, 77.591, 77.592],
        "severity_score": [8.0, 7.0, 6.0],
        "priority_score": [80, 70, 60],
        "impact_radius_meters": [1000, 1000, 1000],
        "affected_population": [5000, 5000, 5000],
        "weather_condition": ["Heavy Rain", "Heavy Rain", "Heavy Rain"],
        "rainfall_mm": [60.0, 60.0, 60.0],
        "wind_speed_kmh": [20.0, 20.0, 20.0],
        "status": ["Reported", "Reported", "Reported"],
        "parent_incident_id": ["", "INC-F1", "INC-F2"], # F1 -> F2 -> F3
        "timestamp": ["2026-09-01 10:00:00", "2026-09-01 10:30:00", "2026-09-01 11:00:00"],
        "recommended_action": ["Action 1", "Action 2", "Action 3"],
        "prevention_impact_score": [50, 50, 50]
    }
    df = pd.DataFrame(data)
    engine = IncidentGraphEngine()
    G = engine.build_graph_from_dataframe(df)

    assert G.has_edge("INC-F1", "INC-F2"), "Expected edge INC-F1 -> INC-F2"
    assert G.has_edge("INC-F2", "INC-F3"), "Expected edge INC-F2 -> INC-F3"

    edge_data = G.get_edge_data("INC-F1", "INC-F2")
    assert edge_data["relationship_type"] == "PARENT_TRIGGER"
    print("      [PASS] Deterministic parent-child trigger verified.")

def test_search_connected_incidents():
    print("[4/8] Testing neighborhood query for specific incidents...")
    df = pd.read_csv(RAW_DATA_PATH)
    engine = IncidentGraphEngine()
    engine.build_graph_from_dataframe(df)

    first_node = list(engine.graph.nodes())[0]
    results = engine.get_connected_incidents(first_node)
    assert isinstance(results, list)
    for item in results:
        assert "incident_id" in item
        assert "weight" in item
        assert "relationship_type" in item
        assert 0.0 <= item["weight"] <= 1.0

    assert engine.get_connected_incidents("INC-9999") == []
    print(f"      [PASS] Incident search passed: {first_node} has {len(results)} connected neighbors.")

def test_graph_plotly_visualization():
    print("[5/8] Testing Plotly graph visualization generator...")
    df = pd.read_csv(RAW_DATA_PATH)
    engine = IncidentGraphEngine()
    engine.build_graph_from_dataframe(df)

    first_node = list(engine.graph.nodes())[0]
    fig = engine.generate_plotly_figure(selected_incident_id=first_node, subgraph_only=True)
    assert fig is not None
    assert len(fig.data) >= 2
    print("      [PASS] Plotly graph figure generated successfully.")

def test_cascading_prediction_structure():
    print("[6/8] Testing rule-based cascading impact prediction...")
    engine = CascadingImpactEngine()
    result = engine.predict_cascade(
        incident_type="Flooding / Waterlogging",
        severity_score=8.5,
        rainfall_mm=75.0,
        wind_speed_kmh=30.0,
        cascading_risk_flag=1,
        root_id="TEST-INC"
    )

    assert result["root_incident_id"] == "TEST-INC"
    assert result["root_incident_type"] == "Flooding / Waterlogging"
    assert result["total_consequences_predicted"] > 0
    assert "overall_threat_level" in result

    consequences = result["consequences"]
    stages = {c["stage"] for c in consequences}
    assert "Secondary" in stages
    assert "Tertiary" in stages
    print(f"      [PASS] Cascade predicted: {len(consequences)} total consequences across Secondary & Tertiary stages.")

def test_no_duplicate_consequences_and_no_loops():
    print("[7/8] Testing loop prevention, duplicate prevention, and causal explanations...")
    engine = CascadingImpactEngine()
    for inc_type in KNOWN_CAUSAL_AFFINITIES.keys():
        result = engine.predict_cascade(incident_type=inc_type, severity_score=8.0)
        consequences = result["consequences"]

        names = [c["name"] for c in consequences]
        assert len(names) == len(set(names)), f"Duplicate consequences detected for {inc_type}: {names}"

        for c in consequences:
            assert c["depth"] in [1, 2]
            assert c["parent_id"] is not None
            assert len(c["reason"]) > 10, "Causal reason must be provided"
            assert len(c["preventive_break_action"]) > 10, "Break action must be provided"

    print("      [PASS] Loop prevention verified: All 10 incident types produce loop-free, unique DAG cascades.")

def test_fastapi_endpoints():
    print("[8/8] Testing FastAPI backend endpoints (GET /relationships, POST /cascade)...")
    from starlette.testclient import TestClient
    from main import app

    client = TestClient(app)

    # 1. Health check
    res_health = client.get("/health")
    assert res_health.status_code == 200, f"Health check failed: {res_health.text}"
    data_health = res_health.json()
    assert data_health["status"] == "healthy"
    assert data_health["graph_nodes"] >= 100

    # 2. GET /relationships (Global Overview)
    res_rel_global = client.get("/relationships?limit=10")
    assert res_rel_global.status_code == 200, f"GET /relationships failed: {res_rel_global.text}"
    data_rel = res_rel_global.json()
    assert "graph_summary" in data_rel
    assert "edges" in data_rel

    # 3. GET /relationships with valid incident_id
    df = pd.read_csv(RAW_DATA_PATH)
    first_id = df.iloc[0]["incident_id"]
    res_rel_node = client.get(f"/relationships?incident_id={first_id}")
    assert res_rel_node.status_code == 200, f"GET /relationships?incident_id={first_id} failed: {res_rel_node.text}"
    data_node = res_rel_node.json()
    assert data_node["search_query"] == first_id
    assert "connected_incidents" in data_node

    # 4. GET /relationships with non-existent incident
    res_rel_invalid = client.get("/relationships?incident_id=NON-EXISTENT")
    assert res_rel_invalid.status_code == 404

    # 5. POST /cascade with existing incident_id
    res_cascade_id = client.post("/cascade", json={"incident_id": "INC-1001"})
    assert res_cascade_id.status_code == 200, f"POST /cascade (existing ID) failed: {res_cascade_id.text}"
    data_casc = res_cascade_id.json()
    assert data_casc["root_incident_id"] == "INC-1001"
    assert len(data_casc["consequences"]) > 0

    # 6. POST /cascade with custom scenario
    res_cascade_custom = client.post("/cascade", json={
        "incident_type": "Water Main Break",
        "severity_score": 8.5,
        "rainfall_mm": 25.0,
        "wind_speed_kmh": 20.0
    })
    assert res_cascade_custom.status_code == 200, f"POST /cascade (custom) failed: {res_cascade_custom.text}"
    data_custom = res_cascade_custom.json()
    assert data_custom["root_incident_type"] == "Water Main Break"
    assert data_custom["total_consequences_predicted"] > 0
    print("      [PASS] FastAPI endpoints validated: GET /relationships and /cascade operational.")

if __name__ == "__main__":
    print("=" * 70)
    print("CIVICOS - PERSON 3: PHASE 2 TEST SUITE")
    print("=" * 70)
    test_haversine_distance()
    test_graph_engine_build_from_csv()
    test_deterministic_graph_fixture()
    test_search_connected_incidents()
    test_graph_plotly_visualization()
    test_cascading_prediction_structure()
    test_no_duplicate_consequences_and_no_loops()
    test_fastapi_endpoints()
    print("=" * 70)
    print("ALL 8 TESTS PASSED SUCCESSFULLY!")
    print("=" * 70)
