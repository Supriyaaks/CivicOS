"""
CivicOS - Person 3: End-to-End Intelligence Integration Test
Verifies the full pipeline from Incident Input to Prevention Impact Score.
"""

import sys
from pathlib import Path
import pandas as pd
import numpy as np
from typing import Dict, Any

# Setup sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.predictive.risk_predictor import PredictiveRiskEngine
from src.scoring.severity_engine import SeverityScoringEngine
from src.scoring.priority_scoring import PriorityScoringEngine
from src.recommendation.action_recommender import ActionRecommendationEngine
from src.simulation.what_if_engine import WhatIfSimulationEngine
from src.prevention_engine.prevention_impact import PreventionImpactEngine

def run_e2e_test():
    print("Starting End-to-End Intelligence Integration Test...")

    # 1. Initialize Engines
    pred_engine = PredictiveRiskEngine()
    pred_engine.load_model()
    sev_engine = SeverityScoringEngine()
    prio_engine = PriorityScoringEngine()
    rec_engine = ActionRecommendationEngine()
    sim_engine = WhatIfSimulationEngine(pred_engine, sev_engine, prio_engine)
    pis_engine = PreventionImpactEngine()

    # 2. Input Incident
    # Using a manually constructed incident to ensure deterministic test
    incident = {
        "incident_id": "INC-E2E-001",
        "incident_type": "Flooding / Waterlogging",
        "category": "Environmental",
        "zone": "South Zone",
        "severity_score": 7.5,
        "impact_radius_meters": 1000,
        "affected_population": 6000,
        "rainfall_mm": 45.0,
        "wind_speed_kmh": 15.0,
        "temperature_c": 24.0,
        "humidity_pct": 85.0,
        "status": "Reported"
    }
    original_incident = incident.copy()
    print("[1] Incident Input: OK")

    # 3. Prediction
    pred_res = pred_engine.predict(incident)
    assert "cascading_probability" in pred_res
    print(f"[2] Prediction: OK (Prob: {pred_res['cascading_probability']})")

    # 4. Severity Calculation
    # Note: Severity engine depends on predictive result for cascading probability
    pipeline_incident = incident.copy()
    pipeline_incident["cascading_probability"] = pred_res["cascading_probability"]
    sev_res = sev_engine.calculate_severity(pipeline_incident)
    assert "severity_score" in sev_res
    print(f"[3] Severity: OK (Score: {sev_res['severity_score']})")

    # 5. Priority Calculation
    prio_res = prio_engine.calculate_priority(incident, severity_result=sev_res, predictive_result=pred_res)
    assert "priority_score" in prio_res
    print(f"[4] Priority: OK (Score: {prio_res['priority_score']})")

    # 6. Preventive Action Recommendation
    rec_res = rec_engine.recommend(incident, predictive_res=pred_res, severity_res=sev_res, priority_res=prio_res)
    assert len(rec_res["recommendations"]) > 0
    top_rec = rec_res["recommendations"][0]["action"]
    print(f"[5] Recommendation: OK (Top Action: {top_rec})")

    # 7. What-If Simulation
    # Map the recommendation to a simulation parameter
    intervention = "drainage_clearance" if "drainage" in top_rec.lower() else "general_mitigation"
    scenario_params = {"intervention": intervention}
    sim_res = sim_engine.simulate_scenario(incident, scenario_params)

    assert "baseline_results" in sim_res
    assert "simulated_results" in sim_res
    print(f"[6] Simulation: OK (Intervention: {intervention})")

    # 8. Prevention Impact Scoring
    pis_res = pis_engine.evaluate_impact(
        incident_id=incident["incident_id"],
        intervention_name=intervention,
        baseline_results=sim_res["baseline_results"],
        simulated_results=sim_res["simulated_results"]
    )

    assert pis_res.prevention_impact_score >= 0
    assert pis_res.impact_classification in ["IMPROVED", "UNCHANGED", "WORSENED", "INSUFFICIENT DATA"]
    print(f"[7] Prevention Impact: OK (PIS: {pis_res.prevention_impact_score}, Class: {pis_res.impact_classification})")

    # 9. Final Verifications
    # Immutability
    assert incident == original_incident, "Original incident was mutated!"
    print("[8] Immutability: OK")

    # Schema consistency
    assert isinstance(pis_res.prevention_impact_score, float)
    print("[9] Schema consistency: OK")

    print("\nEND-TO-END INTEGRATION TEST PASSED SUCCESSFULLY!")

def test_e2e_pipeline():
    run_e2e_test()

if __name__ == "__main__":
    try:
        run_e2e_test()
    except Exception as e:
        import traceback
        traceback.print_exc()
        sys.exit(1)
