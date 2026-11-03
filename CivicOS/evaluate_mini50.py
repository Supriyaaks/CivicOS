import torch
from ultralytics import YOLO
import pandas as pd
import numpy as np
from pathlib import Path

# Configuration
MODEL_PATH = "ai_engine/runs/detection/civicos_mini50_final/weights/best.pt"
DATA_YAML = "ai_engine/datasets/processed/urban_community_mini50/data.yaml"

def evaluate_model():
    print(f"Loading model from {MODEL_PATH}...")
    try:
        model = YOLO(MODEL_PATH)
    except Exception as e:
        print(f"Error loading model: {e}")
        return

    # Run validation on the test split
    print("Running evaluation on test split...")
    results = model.val(data=DATA_YAML, split='test', plots=True)

    # Global Metrics
    # results.results_dict contains keys like 'metrics/precision(B)'
    metrics = {
        "precision": results.results_dict.get('metrics/precision(B)', 0.0),
        "recall": results.results_dict.get('metrics/recall(B)', 0.0),
        "mAP50": results.results_dict.get('metrics/mAP50(B)', 0.0),
        "mAP50-95": results.results_dict.get('metrics/mAP50-95(B)', 0.0),
    }

    # Per-class metrics are in results.box.map (array)
    class_metrics = {}
    # model.names is a dict {id: name}
    for i, name in model.names.items():
        try:
            # result.box.map is typically a numpy array of mAP50-95 per class
            val = results.box.map[i]
        except:
            val = 0.0
        class_metrics[name] = float(val)

    print("\n--- Final Evaluation Report ---")
    print(f"Precision: {metrics['precision']:.4f}")
    print(f"Recall: {metrics['recall']:.4f}")
    print(f"mAP50: {metrics['mAP50']:.4f}")
    print(f"mAP50-95: {metrics['mAP50-95']:.4f}")
    print("\nPer-Class mAP50-95:")
    for name, val in class_metrics.items():
        print(f"{name}: {val:.4f}")

    return metrics, class_metrics

if __name__ == "__main__":
    evaluate_model()
