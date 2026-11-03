import os
import cv2
from pathlib import Path
from collections import Counter

ROOT_DIR = Path("ai_engine/datasets/raw/Urban_Community_L Issues/extracted/Data_sets")
# Correcting path to the clean version
ROOT_DIR = Path("ai_engine/datasets/raw/Urban_Community_Issues_clean/extracted/Data_sets")

def audit():
    all_images = list(ROOT_DIR.rglob("images/*.jpg")) + list(ROOT_DIR.rglob("images/*.png")) + list(ROOT_DIR.rglob("images/*.jpeg"))
    
    invalid_labels = 0
    empty_labels = 0
    total_instances = 0
    class_distribution = Counter()
    
    for img_path in all_images:
        label_path = Path(str(img_path).replace("/images/", "/labels/").replace("\\images\\", "\\labels\\")).with_suffix(".txt")
        if not label_path.exists():
            continue
            
        with open(label_path, "r") as f:
            lines = f.readlines()
            if not lines:
                empty_labels += 1
                continue
                
            for line in lines:
                parts = line.split()
                if len(parts) != 5:
                    invalid_labels += 1
                    continue
                
                try:
                    cls, x, y, w, h = map(float, parts)
                    if not (0 <= cls < 100 and 0 <= x <= 1 and 0 <= y <= 1 and 0 <= w <= 1 and 0 <= h <= 1):
                        invalid_labels += 1
                        continue
                    
                    class_distribution[int(cls)] += 1
                    total_instances += 1
                except ValueError:
                    invalid_labels += 1

    print(f"TOTAL_IMAGES: {len(all_images)}")
    print(f"EMPTY_LABELS: {empty_labels}")
    print(f"INVALID_LABELS: {invalid_labels}")
    print(f"TOTAL_INSTANCES: {total_instances}")
    print(f"CLASS_DISTRIBUTION: {dict(class_distribution)}")

if __name__ == "__main__":
    audit()
