import os
import sys
import pandas as pd
import numpy as np
import joblib

# Set project root
project_root = os.path.abspath('CivicOS_Person3')
os.chdir(project_root)
sys.path.insert(0, project_root)

from src.predictive.risk_predictor import PredictiveRiskEngine

def test_pipeline():
    print("--- Starting ML Pipeline Persistence Verification ---")
    csv_path = 'data/raw/urban_incidents.csv'
    if not os.path.exists(csv_path):
        print(f"ERROR: Dataset not found at {csv_path}")
        return

    df = pd.read_csv(csv_path)
    engine = PredictiveRiskEngine()
    
    # 1. Training
    print("\n[1/4] Training model...")
    summary = engine.train(df)
    print(f"Training Complete. F1 Score: {summary['metrics']['f1_score']}")
    
    # 2. Persistence
    print("\n[2/4] Verifying Persistence...")
    model_path = 'data/processed/risk_model.joblib'
    meta_path = 'data/processed/model_metadata.joblib'
    
    if os.path.exists(model_path) and os.path.exists(meta_path):
        print(f"Files found: {model_path}, {meta_path}")
    else:
        print("FAILED: Model files were not created on disk.")
        return

    engine_new = PredictiveRiskEngine()
    loaded = engine_new.load_model()
    if loaded:
        print("Model loaded successfully from disk.")
    else:
        print("FAILED: Model load_model() returned False.")
        return

    # 3. Prediction
    print("\n[3/4] Testing Prediction with Loaded Model...")
    sample_incident = {
        "severity_score": 8.5,
        "impact_radius_meters": 1500,
        "affected_population": 12000,
        "rainfall_mm": 75.0,
        "wind_speed_kmh": 35.0,
        "temperature_c": 22.0,
        "incident_type": "Flooding / Waterlogging",
        "category": "Environmental",
        "zone": "South Zone"
    }
    prediction = engine_new.predict(sample_incident)
    print(f"Prediction: {prediction['risk_tier']} (Prob: {prediction['cascading_probability']})")

    # 4. Robustness
    print("\n[4/4] Testing Robustness (Missing values)...")
    incomplete_incident = {
        "severity_score": 5.0,
        "incident_type": "Pothole / Road Damage"
    }
    try:
        pred_incomplete = engine_new.predict(incomplete_incident)
        print("Prediction with missing values handled successfully.")
    except Exception as e:
        print(f"FAILED: Missing values caused crash: {e}")

if __name__ == "__main__":
    test_pipeline()
