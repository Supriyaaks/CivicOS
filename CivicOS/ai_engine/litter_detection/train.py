import os
import logging
from ultralytics import YOLO
from pathlib import Path
from ai_engine.litter_detection.config import DATA_YAML, PROJECT_ROOT, RUNS_DIR, RUN_NAME, BATCH_SIZE, EPOCHS, DEVICE, IMG_SIZE

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[logging.FileHandler("litter_training.log"), logging.StreamHandler()]
)

def train_litter_model():
    try:
        logging.info("Initializing YOLO11n for Mini-TACO50 training...")
        # Use pretrained weights to accelerate convergence on tiny dataset
        model = YOLO("yolo11n.pt")

        logging.info(f"Training on {DATA_YAML} for {EPOCHS} epochs...")
        results = model.train(
            data=str(DATA_YAML),
            epochs=EPOCHS,
            imgsz=IMG_SIZE,
            batch=BATCH_SIZE,
            workers=0,
            cache=False,
            seed=42,
            device=DEVICE,
            project=str(RUNS_DIR),
            name=RUN_NAME,
            exist_ok=True,
            patience=10
        )
        logging.info(f"Training completed. Results saved to {RUNS_DIR / RUN_NAME}")
        return True
    except Exception as e:
        logging.error(f"Training failed: {e}")
        return False

if __name__ == "__main__":
    train_litter_model()
