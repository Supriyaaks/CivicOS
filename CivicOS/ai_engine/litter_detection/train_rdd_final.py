from ultralytics import YOLO
import os

# Configuration
DATASET_YAML = "ai_engine/datasets/processed/rdd2022_synthetic/data.yaml"
PROJECT = "ai_engine/runs/detection"
NAME = "rdd2022_synthetic"

def train_model():
    # Load pretrained model
    model = YOLO("yolo11n.pt")

    # Start training
    # We use the specified hyperparameters
    model.train(
        data=DATASET_YAML,
        epochs=20,
        imgsz=640,
        batch=2,
        device="cpu",
        workers=0,
        project=PROJECT,
        name=NAME,
        exist_ok=True
    )

if __name__ == "__main__":
    train_model()
