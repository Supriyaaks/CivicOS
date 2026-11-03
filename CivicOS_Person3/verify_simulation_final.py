import os
import sys
import pandas as pd
import numpy as np
from datetime import datetime

# Set project root
project_root = os.path.abspath('CivicOS_Person3')
os.chdir(project_root)
sys.path.insert(0, project_root)

from src.simulation.what_if_engine import WhatIfSimulationEngine
from src.predictive.risk_predictor import PredictiveRiskEngine
from src.scoring.severity_engine import SeverityScoringEngine
from src.scoring.priority_scoring import PriorityScoringEngine

def test_simulation():
    print("--- Starting FINAL What-If Simulation Verification ---")
    
    # Initialize all engines
    pred_eng = PredictiveRiskEngine()
    df = pd.read_csv('data/raw/urban_incidents.csv')
    pred_eng.train(df)
    
    sev_eng = SeverityScoringEngine()
    prio_eng = PriorityScoringEngine()
    
    sim_eng = WhatIfSimulationEngine(pred_eng, sev_eng, prio_eng)
    
    # Test Case: Rainfall Increase
    # We use an incident where rainfall is a key factor
    incident = {
        "incident_id": "INC-1001",
        "severity_score": 8.4,
        "impact_radius_meters": 1200,
        "affected_population": 9500,
        "rainfall_mm": 68.5,
        "wind_speed_kmh": 32.0,
        "temperature_c": 22.4,
        "incident_type": "Flooding / Waterlogging",
        "status": "In Progress",
        "timestamp": "2026-09-01 07:15:00"
    }
    
    print("\n[1] Testing Rainfall Increase (Expect Priority change)...")
    params = {"additional_rainfall": 100.0}
    res = sim_eng.simulate_scenario(incident, params)
    print(f"Baseline Priority: {res['baseline_results']['priority']['priority_score']}")
    print(f"Simulated Priority: {res['simulated_results']['priority']['priority_score']}")
    print(f"Diff: {res['score_differences']['priority_score']['abs_diff']}")

    print("\n[2] Testing Response Delay (Expect Urgency change)...")
    params_delay = {"response_delay_hours": 100.0} # Large delay to ensure bin change
    res_delay = sim_eng.simulate_scenario(incident, params_delay)
    print(f"Baseline Priority: {res_delay['baseline_results']['priority']['priority_score']}")
    print(f"Simulated Priority: {res_delay['simulated_results']['priority']['priority_score']}")
    print(f"Diff: {res_delay['score_differences']['priority_score']['abs_diff']}")

    print("\n[3] Testing Intervention (Expect Severity reduction)...")
    params_int = {"intervention": "drainage_clearance"}
    res_int = sim_eng.simulate_scenario(incident, params_int)
    print(f"Baseline Priority: {res_int['baseline_results']['priority']['priority_score']}")
    print(f"Simulated Priority: {res_int['simulated_results']['priority']['priority_score']}")
    print(f"Diff: {res_int['score_differences']['priority_score']['abs_diff']}")

    print("\n[4] Validation - Negative Rainfall...")
    try:
        sim_eng.simulate_scenario(incident, {"additional_rainfall": -10.0})
        print("FAILED: Negative rainfall accepted")
    except ValueError as e:
        print(f"SUCCESS: Caught error: {e}")

if __name__ == "__main__":
    test_simulation()
