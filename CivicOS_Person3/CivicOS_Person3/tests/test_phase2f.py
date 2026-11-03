"""
Phase 2F: Prevention Impact Scoring Tests
---------------------------------------
Tests the mathematical calculations and API integration of the
Prevention Impact Scoring Engine.
"""

import sys
from pathlib import Path
import pandas as pd
import numpy as np
from fastapi.testclient import TestClient
from pydantic import ValidationError

# Setup sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from main import app
from src.prevention_engine.prevention_impact import PreventionImpactEngine
from src.prevention_engine.models import PreventionImpactEvaluation

client = TestClient(app)

def test_pis_math_reduction():
    """Test that a significant reduction in risk leads to a high PIS and IMPROVED status."""
    engine = PreventionImpactEngine()

    # Baseline: High Risk
    baseline = {
        "predictive": {"cascading_probability": 0.8},
        "severity": {"severity_score": 80.0},
        "priority": {"priority_score": 85.0}
    }

    # Intervention: Low Risk
    simulated = {
        "predictive": {"cascading_probability": 0.2},
        "severity": {"severity_score": 20.0},
        "priority": {"priority_score": 30.0}
    }

    eval_res = engine.evaluate_impact("INC-TEST", "drainage_clearance", baseline, simulated)

    assert eval_res.impact_classification == "IMPROVED"
    assert eval_res.prevention_impact_score > 50.0
    assert eval_res.impact_direction == "Positive"
    assert any("Reduction in cascading_probability" in f for f in eval_res.contributing_factors)

def test_pis_math_no_change():
    """Test that negligible changes result in UNCHANGED status."""
    engine = PreventionImpactEngine()

    baseline = {
        "predictive": {"cascading_probability": 0.5},
        "severity": {"severity_score": 50.0},
        "priority": {"priority_score": 50.0}
    }

    simulated = {
        "predictive": {"cascading_probability": 0.501},
        "severity": {"severity_score": 50.1},
        "priority": {"priority_score": 50.1}
    }

    eval_res = engine.evaluate_impact("INC-TEST", "neutral_action", baseline, simulated)

    assert eval_res.impact_classification == "UNCHANGED"
    assert eval_res.impact_direction == "Neutral"

def test_pis_math_worsened():
    """Test that an intervention increasing risk results in WORSENED (or low PIS)."""
    engine = PreventionImpactEngine()

    baseline = {
        "predictive": {"cascading_probability": 0.3},
        "severity": {"severity_score": 30.0},
        "priority": {"priority_score": 30.0}
    }

    simulated = {
        "predictive": {"cascading_probability": 0.7},
        "severity": {"severity_score": 70.0},
        "priority": {"priority_score": 70.0}
    }

    eval_res = engine.evaluate_impact("INC-TEST", "bad_action", baseline, simulated)

    assert eval_res.prevention_impact_score == 0.0
    assert eval_res.impact_classification == "WORSENED"
    assert eval_res.impact_direction == "Negative"

def test_pis_baseline_zero():
    """Test that baseline risk = 0 does not cause division by zero."""
    engine = PreventionImpactEngine()

    baseline = {
        "predictive": {"cascading_probability": 0.0},
        "severity": {"severity_score": 0.0},
        "priority": {"priority_score": 0.0}
    }

    simulated = {
        "predictive": {"cascading_probability": 0.1},
        "severity": {"severity_score": 10.0},
        "priority": {"priority_score": 10.0}
    }

    eval_res = engine.evaluate_impact("INC-TEST", "zero_baseline", baseline, simulated)

    assert eval_res.prevention_impact_score == 0.0
    assert eval_res.impact_classification == "UNCHANGED"

def test_pis_insufficient_data():
    """Test that missing critical metrics result in INSUFFICIENT DATA."""
    engine = PreventionImpactEngine()

    baseline = {
        "predictive": {},
        "severity": {},
        "priority": {"priority_score": 50.0}
    }

    simulated = {
        "predictive": {},
        "severity": {},
        "priority": {"priority_score": 40.0}
    }

    eval_res = engine.evaluate_impact("INC-TEST", "missing_data", baseline, simulated)

    assert eval_res.impact_classification == "INSUFFICIENT DATA"
    assert eval_res.prevention_impact_score == 0.0

def test_pis_measured_intervention():
    """Test MEASURED intervention with valid observed data."""
    engine = PreventionImpactEngine()

    baseline = {
        "predictive": {"cascading_probability": 0.7},
        "severity": {"severity_score": 60.0},
        "priority": {"priority_score": 70.0}
    }

    observed = {
        "cascading_probability": 0.3,
        "severity_score": 30.0,
        "priority_score": 40.0
    }

    eval_res = engine.evaluate_impact(
        "INC-MEAS",
        "field_repair",
        baseline,
        observed_metrics=observed,
        evaluation_type="MEASURED"
    )

    assert eval_res.impact_classification == "IMPROVED"
    assert eval_res.prevention_impact_score > 40.0
    assert "Based on direct field observations." in eval_res.assumptions

def test_pis_priority_only_reduction():
    """Test priority reduction without physical risk reduction (PIS should not increase)."""
    engine = PreventionImpactEngine()

    baseline = {
        "predictive": {"cascading_probability": 0.5},
        "severity": {"severity_score": 50.0},
        "priority": {"priority_score": 80.0}
    }

    # Physical risks stay same, priority drops
    simulated = {
        "predictive": {"cascading_probability": 0.5},
        "severity": {"severity_score": 50.0},
        "priority": {"priority_score": 20.0}
    }

    eval_res = engine.evaluate_impact("INC-PRIO", "admin_reclassification", baseline, simulated)

    # PIS should be 0 because it only weights prob and severity
    assert eval_res.prevention_impact_score == 0.0
    assert eval_res.impact_classification == "UNCHANGED"

def test_pis_measured_insufficient_data():
    """Test MEASURED evaluation where observed metrics are missing."""
    engine = PreventionImpactEngine()
    baseline = {"predictive": {"cascading_probability": 0.5}, "severity": {"severity_score": 50.0}}

    eval_res = engine.evaluate_impact(
        "INC-FAIL", "forgot_data", baseline,
        observed_metrics=None,
        evaluation_type="MEASURED"
    )

    assert eval_res.impact_classification == "INSUFFICIENT DATA"
    assert "Observed metrics missing" in eval_res.contributing_factors[0]

def test_api_end_to_end():
    """Test the API endpoint from Recommendation -> Simulation -> Impact."""
    res = client.post("/intelligence/prevention-impact", json={
        "incident_id": "INC-1001",
        "intervention_name": "drainage_clearance"
    })

    assert res.status_code == 200
    data = res.json()
    assert "evaluation_id" in data
    assert "prevention_impact_score" in data
    assert "impact_classification" in data
    assert "baseline_metrics" in data
    assert "intervention_metrics" in data

def test_api_invalid_incident():
    """Test that a non-existent incident ID returns 404."""
    res = client.post("/intelligence/prevention-impact", json={
        "incident_id": "NON-EXISTENT",
        "intervention_name": "drainage_clearance"
    })
    assert res.status_code == 404

def test_worsening_intervention_classification_and_score():
    """Regression Test: A worsening intervention must return WORSENED, Negative, and PIS 0."""
    engine = PreventionImpactEngine()
    baseline = {
        "predictive": {"cascading_probability": 0.25},
        "severity": {"severity_score": 25.0},
        "priority": {"priority_score": 30.0}
    }
    simulated = {
        "predictive": {"cascading_probability": 0.75},
        "severity": {"severity_score": 75.0},
        "priority": {"priority_score": 80.0}
    }
    eval_res = engine.evaluate_impact("INC-REG-WORSE", "hazardous_action", baseline, simulated)
    assert eval_res.impact_classification == "WORSENED"
    assert eval_res.impact_direction == "Negative"
    assert eval_res.prevention_impact_score == 0.0

def test_unchanged_intervention_classification_and_score():
    """Regression Test: An unchanged intervention must return UNCHANGED, Neutral, and PIS 0."""
    engine = PreventionImpactEngine()
    baseline = {
        "predictive": {"cascading_probability": 0.40},
        "severity": {"severity_score": 40.0},
        "priority": {"priority_score": 45.0}
    }
    simulated = {
        "predictive": {"cascading_probability": 0.401},
        "severity": {"severity_score": 40.1},
        "priority": {"priority_score": 45.1}
    }
    eval_res = engine.evaluate_impact("INC-REG-SAME", "neutral_monitoring", baseline, simulated)
    assert eval_res.impact_classification == "UNCHANGED"
    assert eval_res.impact_direction == "Neutral"
    assert eval_res.prevention_impact_score == 0.0

def test_improving_intervention_classification_and_score():
    """Regression Test: An improving intervention must return IMPROVED and a positive PIS."""
    engine = PreventionImpactEngine()
    baseline = {
        "predictive": {"cascading_probability": 0.80},
        "severity": {"severity_score": 80.0},
        "priority": {"priority_score": 85.0}
    }
    simulated = {
        "predictive": {"cascading_probability": 0.20},
        "severity": {"severity_score": 20.0},
        "priority": {"priority_score": 30.0}
    }
    eval_res = engine.evaluate_impact("INC-REG-IMPROVE", "rapid_containment", baseline, simulated)
    assert eval_res.impact_classification == "IMPROVED"
    assert eval_res.impact_direction == "Positive"
    assert eval_res.prevention_impact_score > 0.0
    assert eval_res.prevention_impact_score == 75.0

def test_api_scoring_evaluate_valid_input():
    """Regression Test: POST /api/scoring/evaluate returns HTTP 200 with severity and priority details."""
    payload = {
        "severity_score": 8.5,
        "impact_radius_meters": 1200,
        "affected_population": 5000,
        "cascading_risk_flag": 1
    }
    res = client.post("/api/scoring/evaluate", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "incident_evaluation" in data
    eval_data = data["incident_evaluation"]
    assert "severity_score" in eval_data
    assert "priority_score" in eval_data
    assert eval_data["severity_tier"] in ["LOW", "MODERATE", "HIGH", "CRITICAL"]
    assert eval_data["priority_tier"] in ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
    assert "severity_details" in eval_data
    assert "priority_details" in eval_data
    assert "factors" in eval_data
    assert eval_data["severity_score"] > 0
    assert eval_data["priority_score"] > 0

def test_api_scoring_evaluate_invalid_input():
    """Regression Test: Invalid scoring input returns HTTP 422 validation error."""
    invalid_payload = {
        "severity_score": 15.0,  # Invalid: > 10.0
        "impact_radius_meters": -50,  # Invalid: < 1
        "affected_population": 0,  # Invalid: < 1
        "cascading_risk_flag": 5  # Invalid: not 0 or 1
    }
    res = client.post("/api/scoring/evaluate", json=invalid_payload)
    assert res.status_code == 422
    err = res.json()
    assert "detail" in err
    error_fields = [e["loc"][-1] for e in err["detail"]]
    assert "severity_score" in error_fields

def test_api_prevention_impact_worsened_vs_unchanged_distinct():
    """Regression Test: Confirm WORSENED and UNCHANGED remain distinct in actual HTTP API responses."""
    # 1. Worsened measured intervention
    worsened_payload = {
        "incident_id": "INC-1001",
        "intervention_name": "faulty_barrier_deployment",
        "evaluation_type": "MEASURED",
        "observed_metrics": {
            "cascading_probability": 0.95,
            "severity_score": 95.0
        }
    }
    res_worsened = client.post("/intelligence/prevention-impact", json=worsened_payload)
    assert res_worsened.status_code == 200
    data_worsened = res_worsened.json()
    assert data_worsened["impact_classification"] == "WORSENED"
    assert data_worsened["impact_direction"] == "Negative"
    assert data_worsened["prevention_impact_score"] == 0.0

    # 2. Unchanged simulated intervention
    unchanged_payload = {
        "incident_id": "INC-1001",
        "intervention_name": "neutral_monitoring_no_change",
        "evaluation_type": "SIMULATED"
    }
    res_unchanged = client.post("/intelligence/prevention-impact", json=unchanged_payload)
    assert res_unchanged.status_code == 200
    data_unchanged = res_unchanged.json()
    assert data_unchanged["impact_classification"] == "UNCHANGED"
    assert data_unchanged["impact_direction"] == "Neutral"
    assert data_unchanged["prevention_impact_score"] == 0.0

    # 3. Explicitly verify distinctness
    assert data_worsened["impact_classification"] != data_unchanged["impact_classification"]
    assert data_worsened["impact_direction"] != data_unchanged["impact_direction"]

if __name__ == "__main__":
    print("=" * 70)
    print("CIVICOS - PERSON 3: PHASE 2F PREVENTION IMPACT TESTS")
    print("=" * 70)
    try:
        test_pis_math_reduction()
        print("[PASS] test_pis_math_reduction")
        test_pis_math_no_change()
        print("[PASS] test_pis_math_no_change")
        test_pis_math_worsened()
        print("[PASS] test_pis_math_worsened")
        test_pis_baseline_zero()
        print("[PASS] test_pis_baseline_zero")
        test_pis_insufficient_data()
        print("[PASS] test_pis_insufficient_data")
        test_pis_measured_intervention()
        print("[PASS] test_pis_measured_intervention")
        test_pis_priority_only_reduction()
        print("[PASS] test_pis_priority_only_reduction")
        test_pis_measured_insufficient_data()
        print("[PASS] test_pis_measured_insufficient_data")
        test_api_end_to_end()
        print("[PASS] test_api_end_to_end")
        test_api_invalid_incident()
        print("[PASS] test_api_invalid_incident")
        test_worsening_intervention_classification_and_score()
        print("[PASS] test_worsening_intervention_classification_and_score")
        test_unchanged_intervention_classification_and_score()
        print("[PASS] test_unchanged_intervention_classification_and_score")
        test_improving_intervention_classification_and_score()
        print("[PASS] test_improving_intervention_classification_and_score")
        test_api_scoring_evaluate_valid_input()
        print("[PASS] test_api_scoring_evaluate_valid_input")
        test_api_scoring_evaluate_invalid_input()
        print("[PASS] test_api_scoring_evaluate_invalid_input")
        test_api_prevention_impact_worsened_vs_unchanged_distinct()
        print("[PASS] test_api_prevention_impact_worsened_vs_unchanged_distinct")
        print("\nALL TESTS PASSED SUCCESSFULLY!")
    except Exception as e:
        import traceback
        traceback.print_exc()
        print("\nTESTS FAILED!")
        sys.exit(1)
