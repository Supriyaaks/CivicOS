import os
from pathlib import Path

# Resolve paths relative to the project root
PROJECT_ROOT = Path(__file__).resolve().parent.parent

# Model Configuration
# Using project root to ensure paths work regardless of where the script is called from
MODEL_PATHS = {
    "v1_3class": str(PROJECT_ROOT / "runs" / "detection" / "civicos_v1" / "weights" / "best.pt"),
    "mini50_6class": str(PROJECT_ROOT / "runs" / "detection" / "civicos_mini50_final" / "weights" / "best.pt"),
}
# Default active model
ACTIVE_MODEL_KEY = "v1_3class"
CONFIDENCE_THRESHOLD = 0.25
IMAGE_SIZE = 640


# Duplicate Detection
GEO_DISTANCE_THRESHOLD_METERS = 50
TIME_DIFF_THRESHOLD_HOURS = 48
IMAGE_SIMILARITY_THRESHOLD = 0.85

# Resolution Verification
RESOLUTION_CONFIDENCE_THRESHOLD = 0.7
