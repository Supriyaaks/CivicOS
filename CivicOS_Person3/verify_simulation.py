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
    print("--- Starting Comprehensive What-If Simulation Verification ---")
    
    # Initialize all engines
    pred_eng = PredictiveRiskEngine()
    # Train the predictor with the real dataset
    df = pd.read_csv('data/raw/urban_incidents.csv')
    pred_eng.train(df)
    
    sev_eng = SeverityScoringEngine()
    prio_eng = PriorityScoringEngine()
    
    sim_eng = WhatIfSimulationEngine(pred_eng, sev_eng, prio_eng)
    
    # Test Case 1: Rainfall Increase
    print("\n[1] Testing Rainfall Increase Scenario...")
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
    params = {"additional_rainfall": 50.0}
    res = sim_eng.simulate_scenario(incident, params)
    print(f"Baseline Priority: {res['baseline_results']['priority']['priority_score']}")
    print(f"Simulated Priority: {res['simulated_results']['priority']['priority_score']}")
    print(f"Change: {res['score_differences']['priority_score']['abs_diff']}")

    # Test Case 2: Response Delay
    print("\n[2] Testing Response Delay Scenario...")
    params_delay = {"response_delay_hours": 12.0}
    res_delay = sim_eng.simulate_scenario(incident, params_delay)
    print(f"Baseline Priority: {res_delay['baseline_results']['priority']['priority_score']}")
    print(f"Simulated Priority: {res_delay['simulated_results']['priority']['priority_score']}")
    print(f"Change: {res_delay['score_differences']['priority_score']['abs_diff']}")

    # Test Case 3: Preventive Intervention
    print("\n[3] Testing Preventive Intervention (Drainage)...")
    params_int = {"intervention": "drainage_clearance"}
    res_int = sim_eng.simulate_scenario(incident, params_int)
    print(f"Baseline Priority: {res_int['baseline_results']['priority']['priority_score']}")
    print(f"Simulated Priority: {res_int['simulated_results']['priority']['priority_score']}")
    print(f"Change: {res_int['score_differences']['priority_score']['abs_diff']}")

    # Test Case 4: Combined Scenario
    print("\n[4] Testing Combined Scenario (Rain + Delay)...")
    params_comb = {"additional_rainfall": 30.0, "response_delay_hours": 5.0}
    res_comb = sim_eng.simulate_scenario(incident, params_comb)
    print(f"Baseline Priority: {res_comb['baseline_results']['priority']['priority_score']}")
    print(f"Simulated Priority: {res_comb['simulated_results']['priority']['priority_score']}")
    print(f"Change: {res_comb['score_differences']['priority_score']['abs_diff']}")

    # Test Case 5: Validation - Negative Rainfall
    print("\n[5] Testing Validation (Negative Rainfall)...")
    try:
        sim_eng.simulate_scenario(incident, {"additional_rainfall": -10.0})
        print("FAILED: Should have raised ValueError")
    except ValueError as e:
        print(f"SUCCESS: Caught expected error: {e}")

    # Test Case 6: Dataset Unchanged
    print("\n[6] Verifying Dataset Unchanged...")
    # The simulation uses a copy, but we check again
    df_after = pd.read_csv('data/raw/urban_incidents.csv')
    if len(df_after) == len(df):
        print("SUCCESS: Dataset size unchanged.")
    else:
        print("FAILED: Dataset modified.")

if __name__ == "__main__":
    test_simulation()
