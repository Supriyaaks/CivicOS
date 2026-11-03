import os
import sys
import pandas as pd
import numpy as np
from datetime import datetime

# Set project root
project_root = os.path.abspath('CivicOS_Person3')
os.chdir(project_root)
sys.path.insert(0, project_root)

from src.scoring.priority_scoring import PriorityScoringEngine
from src.scoring.severity_engine import SeverityScoringEngine

def test_priority():
    print("--- Starting Comprehensive Priority Engine Verification ---")
    p_engine = PriorityScoringEngine()
    s_engine = SeverityScoringEngine()
    
    # Mock data for integration
    incident = {
        "incident_id": "INC-01",
        "timestamp": "2026-11-01 10:00:00",
        "status": "Reported",
        "incident_type": "Gas Leak Report"
    }
    
    # Mock outputs from other engines
    sev_res = {"severity_score": 90.0, "severity_level": "CRITICAL"}
    pred_res = {"cascading_probability": 0.85}
    casc_res = {"impact_score": 70.0}
    
    # 1. Normal Calculation
    print("\n[1] Testing Normal Calculation...")
    res = p_engine.calculate_priority(incident, sev_res, pred_res, casc_res)
    print(f"Score: {res['priority_score']} | Level: {res['priority_level']}")
    
    # 2. Minimum/Maximum
    print("\n[2] Testing Min/Max...")
    res_min = p_engine.calculate_priority({"incident_id":"MIN", "status":"Resolved"}, 
                                           {"severity_score":0}, {"cascading_probability":0}, {"impact_score":0})
    print(f"Min Score: {res_min['priority_score']}")
    
    res_max = p_engine.calculate_priority({"incident_id":"MAX", "status":"Reported"}, 
                                           {"severity_score":100}, {"cascading_probability":1.0}, {"impact_score":100})
    print(f"Max Score: {res_max['priority_score']}")

    # 3. Missing Factors (Partial)
    print("\n[3] Testing Partial Missing Factors...")
    res_partial = p_engine.calculate_priority(incident, None, pred_res, None)
    print(f"Score: {res_partial['priority_score']} | Missing: {res_partial['missing_factors']}")
    
    # 4. All Factors Missing
    print("\n[4] Testing All Factors Missing...")
    res_empty = p_engine.calculate_priority({}, None, None, None)
    print(f"Result: {res_empty.get('error', 'No error')}")

    # 5. Ranking and Tie-breaking
    print("\n[5] Testing Ranking & Tie-breaking...")
    results = [
        {"incident_id": "INC-A", "priority_score": 80.0, "component_scores": {"time_urgency": 50.0}},
        {"incident_id": "INC-B", "priority_score": 80.0, "component_scores": {"time_urgency": 70.0}}, # Higher urgency
        {"incident_id": "INC-C", "priority_score": 90.0, "component_scores": {"time_urgency": 10.0}}, # Highest score
        {"incident_id": "INC-D", "priority_score": 80.0, "component_scores": {"time_urgency": 70.0}}, # Same as B, but ID is D
    ]
    ranked = p_engine.rank_incidents(results)
    for r in ranked:
        print(f"Pos {r['ranking_position']}: {r['incident_id']} (Score: {r['priority_score']}, Urgency: {r['component_scores'].get('time_urgency')})")

if __name__ == "__main__":
    test_priority()
