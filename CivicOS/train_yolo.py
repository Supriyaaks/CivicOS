from ultralytics import YOLO
import os

# Paths
MODEL_NAME = "yolo11n.pt"
DATA_YAML = "ai_engine/datasets/processed/urban_community_filtered/data.yaml"
RUN_DIR = "ai_engine/runs/detection/civicos_v1"

def train_model():
    # Load pretrained model
    model = YOLO(MODEL_NAME)
    
    # Train the model
    # We use device="cpu" and a small batch size to avoid memory issues.
    model.train(
        data=DATA_YAML,
        epochs=50,
        imgsz=640,
        batch=4,
        patience=10,
        device="cpu",
        seed=42,
        project="ai_engine/runs/detection",
        name="civicos_v1",
        verbose=True
    )

if __name__ == "__main__":
    train_model()
