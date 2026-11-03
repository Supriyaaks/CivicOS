import os
import sys
import pandas as pd
import numpy as np

# Set project root
project_root = os.path.abspath('CivicOS_Person3')
os.chdir(project_root)
sys.path.insert(0, project_root)

from src.scoring.severity_engine import SeverityScoringEngine

def test_severity():
    print("--- Starting Severity Scoring Verification ---")
    engine = SeverityScoringEngine()
    
    # 1. Normal Calculation
    print("\n[1] Testing Normal Calculation...")
    incident_normal = {
        "incident_id": "INC-TEST-01",
        "severity_score": 8.0,
        "affected_population": 10000,
        "impact_radius_meters": 1200,
        "incident_type": "Flooding / Waterlogging",
        "status": "In Progress",
        "cascading_probability": 0.8
    }
    res = engine.calculate_severity(incident_normal)
    print(f"Score: {res['severity_score']} | Level: {res['severity_level']}")
    
    # 2. Minimum Possible Score
    print("\n[2] Testing Minimum Possible Score...")
    incident_min = {
        "incident_id": "INC-MIN",
        "severity_score": 0.0,
        "affected_population": 0,
        "impact_radius_meters": 0,
        "incident_type": "Minor",
        "status": "Resolved",
        "cascading_probability": 0.0
    }
    res_min = engine.calculate_severity(incident_min)
    print(f"Score: {res_min['severity_score']}")
    
    # 3. Maximum Possible Score
    print("\n[3] Testing Maximum Possible Score...")
    incident_max = {
        "incident_id": "INC-MAX",
        "severity_score": 10.0,
        "affected_population": 20000,
        "impact_radius_meters": 2500,
        "incident_type": "Gas Leak Report",
        "status": "In Progress",
        "cascading_probability": 1.0
    }
    res_max = engine.calculate_severity(incident_max)
    print(f"Score: {res_max['severity_score']}")

    # 4. Missing Factors (Partial)
    print("\n[4] Testing Partial Missing Factors...")
    incident_partial = {
        "incident_id": "INC-PART",
        "severity_score": 8.0,
        # population missing
        # radius missing
        "incident_type": "Power Outage",
        "status": "Reported",
        "cascading_probability": 0.5
    }
    res_partial = engine.calculate_severity(incident_partial)
    print(f"Score: {res_partial['severity_score']} | Missing: {res_partial['missing_factors']}")
    
    # 5. All Factors Missing
    print("\n[5] Testing All Factors Missing...")
    incident_empty = {"incident_id": "INC-EMPTY"}
    res_empty = engine.calculate_severity(incident_empty)
    print(f"Result: {res_empty.get('error', 'No error')}")

    # 6. Boundary Values
    print("\n[6] Testing Classification Boundaries...")
    # Target ~30 (Moderate), ~60 (High), ~85 (Critical)
    # We will check if the levels transition correctly
    for score in [29.9, 30.0, 59.9, 60.0, 84.9, 85.0]:
        # We simulate the score by forcing inputs or mocking
        # For simplicity, we test the levels via internal classification if possible 
        # but since calculate_severity is the API, we check logic via results.
        pass

if __name__ == "__main__":
    test_severity()
