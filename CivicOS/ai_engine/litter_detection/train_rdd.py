from ultralytics import YOLO
import os
from ai_engine.datasets.processed.rdd2022_synthetic import generate_dataset

# Load pretrained model
model = YOLO("yolo11n.pt")

# Start training
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
