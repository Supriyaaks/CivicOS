import os
import cv2
from pathlib import Path
from collections import Counter

EXTRACT_DIR = Path("ai_engine/datasets/raw/Urban_Community_Issues_clean/extracted/Data_sets")

def inspect():
    all_files = list(EXTRACT_DIR.rglob("*"))
    images = [f for f in all_files if f.suffix.lower() in [".jpg", ".jpeg", ".png"]]
    labels = [f for f in all_files if f.suffix.lower() == ".txt"]
    
    print(f"IMAGE_COUNT: {len(images)}")
    print(f"LABEL_COUNT: {len(labels)}")
    
    if not labels:
        print("NO_LABELS_FOUND")
        return

    # Format check
    with open(labels[0], "r") as f:
        first_line = f.readline()
        print(f"ANNOTATION_FORMAT: YOLO (Sample: {first_line.strip()})")
    
    # Class extraction and matching
    all_classes = []
    matching_count = 0
    
    for img in images:
        # Find corresponding label in the same folder
        label_path = img.with_suffix(".txt")
        if label_path.exists():
            matching_count += 1
            with open(label_path, "r") as f:
                for line in f:
                    parts = line.split()
                    if parts:
                        all_classes.append(parts[0])
        
    print(f"MATCHING_IMAGES: {matching_count}")
    print(f"IMAGES_WITHOUT_LABELS: {len(images) - matching_count}")
    
    class_counts = Counter(all_classes)
    print(f"CLASSES_FOUND: {dict(class_counts)}")

    if images:
        img = cv2.imread(str(images[0]))
        if img is not None:
            print(f"OPENCV_READ: Success | Dim: {img.shape}")
        else:
            print("OPENCV_READ: Failed")

if __name__ == "__main__":
    inspect()
