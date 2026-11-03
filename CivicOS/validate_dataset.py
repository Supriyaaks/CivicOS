import os
import cv2
import numpy as np
from pathlib import Path
from collections import Counter

PROC_ROOT = Path("ai_engine/datasets/processed/urban_community_filtered")

def validate_labels():
    stats = {"train": {}, "val": {}, "test": {}}
    global_class_counts = Counter()
    global_instance_counts = Counter()
    total_images = 0
    invalid_labels = 0
    
    # We need to check if the class IDs in the .txt files are [3, 4, 2] or [0, 1, 2]
    # The user wants them remapped to [0, 1, 2].
    
    for split in ["train", "val", "test"]:
        img_dir = PROC_ROOT / split / "images"
        lbl_dir = PROC_ROOT / split / "labels"
        
        images = list(img_dir.glob("*.*"))
        split_images = len(images)
        split_instances = 0
        split_classes = Counter()
        
        for img in images:
            total_images += 1
            lbl_path = lbl_dir / img.with_suffix(".txt").name
            if not lbl_path.exists():
                continue
            
            with open(lbl_path, "r") as f:
                for line in f:
                    parts = line.split()
                    if len(parts) != 5:
                        invalid_labels += 1
                        continue
                    try:
                        cls = int(parts[0])
                        x, y, w, h = map(float, parts[1:])
                        if not (0 <= x <= 1 and 0 <= y <= 1 and 0 <= w <= 1 and 0 <= h <= 1):
                            invalid_labels += 1
                            continue
                        
                        split_classes[cls] += 1
                        global_class_counts[cls] += 1
                        split_instances += 1
                    except ValueError:
                        invalid_labels += 1
        
        stats[split] = {
            "images": split_images,
            "instances": split_instances,
            "classes": dict(split_classes)
        }
        
    print(f"TOTAL_IMAGES: {total_images}")
    print(f"INVALID_LABELS: {invalid_labels}")
    print(f"DISTRIBUTION: {stats}")
    return stats

if __name__ == "__main__":
    validate_labels()
