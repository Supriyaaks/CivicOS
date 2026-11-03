from ultralytics import YOLO
import os
import sys

# Set project root for absolute imports
sys.path.append(os.getcwd())

try:
    model = YOLO("yolo11n.pt")
    model.train(
        data="ai_engine/datasets/processed/rdd2022_synthetic/data.yaml",
        epochs=20,
        imgsz=640,
        batch=2,
        device="cpu",
        workers=0,
        project="ai_engine/runs/detection",
        name="rdd2022_synthetic",
        exist_ok=True
    )
except Exception as e:
    print(f"TRAINING_ERROR: {e}")
