import os
import json
import logging
from ultralytics import YOLO
from pathlib import Path

# Configuration
DATA_YAML = "ai_engine/datasets/processed/urban_community_mini50/data.yaml"
PROJECT_DIR = "ai_engine/runs/detection"
RUN_NAME = "civicos_mini50_final"
SAVE_DIR = Path(PROJECT_DIR) / RUN_NAME

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[logging.FileHandler("mini50_training.log"), logging.StreamHandler()]
)

def train_mini50():
    try:
        logging.info("Initializing YOLO11n for 6-class Mini50 training...")
        model = YOLO("yolo11n.pt")

        # Start training
        # Using a separate run name to avoid overwriting anything
        results = model.train(
            data=DATA_YAML,
            epochs=30,
            imgsz=640,
            batch=2,
            workers=0,
            cache=False,
            seed=42,
            device="cpu",
            project=PROJECT_DIR,
            name=RUN_NAME,
            exist_ok=True,
            patience=10
        )
        logging.info(f"Training completed. Results saved to {SAVE_DIR}")
        return True
    except Exception as e:
        logging.error(f"Training failed: {e}")
        return False

if __name__ == "__main__":
    train_mini50()
