import os
import sys
import pandas as pd
import numpy as np

# Set path to the project root
project_root = os.path.abspath('CivicOS_Person3')
sys.path.insert(0, project_root)

from src.predictive.risk_predictor import PredictiveRiskEngine

def test_pipeline():
    print("--- Starting ML Pipeline Verification ---")
    csv_path = os.path.join(project_root, 'data/raw/urban_incidents.csv')
    if not os.path.exists(csv_path):
        print(f"ERROR: Dataset not found at {csv_path}")
        return

    df = pd.read_csv(csv_path)
    engine = PredictiveRiskEngine()
    
    # 1. Training
    print("\n[1/4] Training model...")
    try:
        summary = engine.train(df)
        print(f"Training Complete. F1 Score: {summary['metrics']['f1_score']}")
        print(f"Accuracy: {summary['metrics']['accuracy']}")
        print(f"ROC-AUC: {summary['metrics']['roc_auc']}")
    except Exception as e:
        print(f"FAILED Training: {e}")
        import traceback
        traceback.print_exc()
        return

    # 2. Persistence
    print("\n[2/4] Verifying Persistence...")
    engine_new = PredictiveRiskEngine()
    # The engine.save_model() uses relative path 'data/processed/risk_model.joblib'
    # We must ensure it is relative to the project root when loading.
    # I will temporarily change the directory to project root.
    os.chdir(project_root)
    loaded = engine_new.load_model()
    if loaded:
        print("Model loaded successfully from disk.")
    else:
        print("FAILED: Model could not be loaded.")
        return

    # 3. Prediction
    print("\n[3/4] Testing Prediction...")
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

    # 4. Robustness (Missing values)
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
