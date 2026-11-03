import os
import sys
import pandas as pd
import numpy as np
from datetime import datetime

# Set project root
project_root = os.path.abspath('CivicOS_Person3')
os.chdir(project_root)
sys.path.insert(0, project_root)

from src.recommendation.action_recommender import ActionRecommendationEngine
from src.predictive.risk_predictor import PredictiveRiskEngine
from src.scoring.severity_engine import SeverityScoringEngine
from src.scoring.priority_scoring import PriorityScoringEngine

def test_recommendations():
    print("--- Starting Comprehensive Recommendation Verification ---")
    
    # Initialize all engines
    rec_eng = ActionRecommendationEngine()
    pred_eng = PredictiveRiskEngine()
    df = pd.read_csv('data/raw/urban_incidents.csv')
    pred_eng.train(df)
    sev_eng = SeverityScoringEngine()
    prio_eng = PriorityScoringEngine()
    
    # Test Case 1: Flooding (High Risk)
    print("\n[1] Testing Flooding Incident (High Risk)...")
    incident_flood = {
        "incident_id": "INC-F01",
        "incident_type": "Flooding / Waterlogging",
        "severity_score": 8.5,
        "affected_population": 12000,
        "rainfall_mm": 80.0,
        "status": "In Progress",
        "timestamp": "2026-09-01 07:00:00"
    }
    # Run through intelligence pipeline first
    pred_res = pred_eng.predict(incident_flood)
    sev_res = sev_eng.calculate_severity(incident_flood)
    # Need to pass pred_res to severity engine as it uses cascading_probability
    # I'll manually simulate the flow for this test
    sev_res = sev_eng.calculate_severity({**incident_flood, "cascading_probability": pred_res["cascading_probability"]})
    prio_res = prio_eng.calculate_priority(incident_flood, sev_res, pred_res)
    
    rec_res = rec_eng.recommend(incident_flood, pred_res, sev_res, prio_res)
    print(f"Number of recommendations: {len(rec_res['recommendations'])}")
    if rec_res['recommendations']:
        print(f"Top recommendation: {rec_res['recommendations'][0]['action']}")
        print(f"Reason: {rec_res['recommendations'][0]['reason']}")
        print(f"Urgency: {rec_res['recommendations'][0]['urgency']}")

    # Test Case 2: Road Damage (Low Risk)
    print("\n[2] Testing Road Damage (Low Risk)...")
    incident_road = {
        "incident_id": "INC-R01",
        "incident_type": "Tree Fall",
        "severity_score": 3.0,
        "affected_population": 100,
        "rainfall_mm": 5.0,
        "status": "Reported",
        "timestamp": "2026-09-01 10:00:00"
    }
    pred_res_r = pred_eng.predict(incident_road)
    sev_res_r = sev_eng.calculate_severity({**incident_road, "cascading_probability": pred_res_r["cascading_probability"]})
    prio_res_r = prio_eng.calculate_priority(incident_road, sev_res_r, pred_res_r)
    
    rec_res_r = rec_eng.recommend(incident_road, pred_res_r, sev_res_r, prio_res_r)
    print(f"Number of recommendations: {len(rec_res_r['recommendations'])}")
    if rec_res_r['recommendations']:
        print(f"Top recommendation: {rec_res_r['recommendations'][0]['action']}")

    # Test Case 3: Unknown Incident Type
    print("\n[3] Testing Unknown Incident Type...")
    incident_unk = {
        "incident_id": "INC-U01",
        "incident_type": "Alien Invasion",
        "severity_score": 5.0,
        "status": "Reported"
    }
    rec_res_u = rec_eng.recommend(incident_unk, {}, {}, {})
    print(f"Recommendation for unknown type: {rec_res_u['recommendations'][0]['action']}")

    # Test Case 4: Missing Intelligence Data
    print("\n[4] Testing Missing Intelligence Data...")
    rec_res_m = rec_eng.recommend(incident_flood, None, None, None)
    print(f"Confidence: {rec_res_m['recommendations'][0]['confidence']}")

if __name__ == "__main__":
    test_recommendations()
