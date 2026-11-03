import os
from pathlib import Path

# Model paths
MODEL_PATH = os.path.abspath("ai_engine/runs/detection/rdd2022_synthetic/weights/best.pt")
DATASET_ROOT = os.path.abspath("ai_engine/datasets/processed/rdd2022_synthetic")

# Class mapping
CLASS_NAMES = {
    0: "D00 - Longitudinal Crack",
    1: "D10 - Transverse Crack",
    2: "D20 - Alligator Crack",
    3: "D40 - Pothole"
}

# Confidence threshold
CONF_THRESHOLD = 0.25
