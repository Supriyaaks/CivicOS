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
    print("--- Starting Comprehensive Severity Scoring Verification ---")
    engine = SeverityScoringEngine()
    
    test_cases = [
        {
            "name": "Normal Calculation",
            "data": {
                "incident_id": "INC-01",
                "severity_score": 8.0,
                "affected_population": 10000,
                "impact_radius_meters": 1200,
                "incident_type": "Flooding / Waterlogging",
                "status": "In Progress",
                "cascading_probability": 0.8
            },
            "expect": "score_range(60, 100)"
        },
        {
            "name": "Minimum possible score",
            "data": {
                "incident_id": "INC-MIN",
                "severity_score": 0.0,
                "affected_population": 0,
                "impact_radius_meters": 0,
                "incident_type": "None",
                "status": "Resolved",
                "cascading_probability": 0.0
            },
            "expect": "score(0.0)"
        },
        {
            "name": "Maximum possible score",
            "data": {
                "incident_id": "INC-MAX",
                "severity_score": 10.0,
                "affected_population": 20000,
                "impact_radius_meters": 2500,
                "incident_type": "Gas Leak Report",
                "status": "In Progress",
                "cascading_probability": 1.0
            },
            "expect": "score(100.0)"
        },
        {
            "name": "Missing Population & Radius",
            "data": {
                "incident_id": "INC-PARTIAL",
                "severity_score": 8.0,
                "incident_type": "Power Outage",
                "status": "Reported",
                "cascading_probability": 0.5
            },
            "expect": "missing(['population', 'geographical'])"
        },
        {
            "name": "All factors missing",
            "data": {},
            "expect": "error(Insufficient data)"
        },
        {
            "name": "Invalid negative input",
            "data": {
                "incident_id": "INC-NEG",
                "severity_score": -5.0,
                "affected_population": -100,
                "impact_radius_meters": -100
            },
            "expect": "treat_as_missing"
        }
    ]

    for case in test_cases:
        print(f"\nTesting: {case['name']}")
        res = engine.calculate_severity(case['data'])
        print(f"Result: {res.get('severity_score')} | Level: {res.get('severity_level')} | Missing: {res.get('missing_factors')}")
        if 'error' in res:
            print(f"Error: {res['error']}")

if __name__ == "__main__":
    test_severity()
