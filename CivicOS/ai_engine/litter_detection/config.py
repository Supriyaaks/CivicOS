"""
Configuration for the Mini-TACO50 Litter Detection Model.
This model is separate from the main CivicOS six-class civic incident detector.
"""

import os
from pathlib import Path

# Project Root
PROJECT_ROOT = Path(r"C:\Users\WCT\Desktop\CivicOS")

# Dataset Configuration
DATASET_YAML = str(PROJECT_ROOT / "ai_engine/datasets/processed/mini_taco50/data.yaml")

# Model Configuration
MODEL_NAME = "yolo11n.pt"  # Using YOLO11n as requested

# Training Hyperparameters
TRAINING_CONFIG = {
    "data": DATASET_YAML,
    "epochs": 30,
    "imgsz": 640,
    "batch": 2,
    "device": "cpu",
    "workers": 0,
    "seed": 42,
    "optimizer": "auto",
    "patience": 10,
}

# Output Directory
# All litter-specific runs are isolated to avoid interfering with main incident detection
RUNS_DIR = str(PROJECT_ROOT / "ai_engine/runs/litter_detection/mini_taco50")

# Category Mapping (Derived from data.yaml)
LITTER_CLASSES = {
    0: "Litter"
}
