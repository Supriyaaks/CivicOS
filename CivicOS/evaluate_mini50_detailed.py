import torch
from ultralytics import YOLO
import numpy as np
from pathlib import Path

MODEL_PATH = "ai_engine/runs/detection/civicos_mini50_final/weights/best.pt"
DATA_YAML = "ai_engine/datasets/processed/urban_community_mini50/data.yaml"

def detailed_eval():
    print(f"Loading model: {MODEL_PATH}")
    model = YOLO(MODEL_PATH)
    
    print(f"Model Classes: {model.names}")
    results = model.val(data=DATA_YAML, split='test', plots=True)
    
    print("\n--- Detailed Metrics ---")
    print(f"mAP50: {results.results_dict['metrics/mAP50(B)']:.4f}")
    print(f"mAP50-95: {results.results_dict['metrics/mAP50-95(B)']:.4f}")
    
    # In Ultralytics, the per-class mAP is often in results.box.map
    # If it's a scalar, it's the mean. We want the array.
    # Let's try to access it safely.
    try:
        maps = results.box.map
        if isinstance(maps, (float, np.float64, np.float32)):
            print("Warning: results.box.map is a scalar. Per-class breakdown not available in this object.")
        else:
            for i, name in model.names.items():
                val = maps[i] if i < len(maps) else 0.0
                print(f"Class {i} ({name}): mAP50-95 = {val:.4f}")
    except Exception as e:
        print(f"Could not extract per-class metrics: {e}")

if __name__ == "__main__":
    detailed_eval()
