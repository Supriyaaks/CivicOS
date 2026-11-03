import os
import cv2
from pathlib import Path
from collections import Counter

EXTRACT_DIR = Path("ai_engine/datasets/raw/Urban_Community_L Issues/extracted") # Error in path?
# Correcting path based on previous turns
EXTRACT_DIR = Path("ai_engine/datasets/raw/Urban_Community_Issues_clean/extracted")

def inspect():
    # 1. Count files
    all_files = list(EXTRACT_DIR.rglob("*"))
    images = [f for f in all_files if f.suffix.lower() in [".jpg", ".jpeg", ".png"]]
    labels = [f for f in all_files if f.suffix.lower() == ".txt"]
    
    print(f"IMAGE_COUNT: {len(images)}")
    print(f"LABEL_COUNT: {len(labels)}")
    
    if not labels:
        print("NO_LABELS_FOUND")
        return

    # 2. Annotation Format & Classes
    # Read first label file to check format
    with open(labels[0], "r") as f:
        first_line = f.readline()
        print(f"ANNOTATION_FORMAT: YOLO (Sample: {first_line.strip()})")
    
    # 3. Extract all classes
    all_classes = []
    matching_count = 0
    for img in images:
        # Look for matching label (same filename, .txt extension)
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

    # 4. OpenCV Validation
    if images:
        try:
            img = cv2.imread(str(images[0]))
            if img is not None:
                print(f"OPENCV_READ: Success | Dim: {img.shape}")
            else:
                print("OPENCV_READ: Failed")
        except Exception as e:
            print(f"OPENCV_ERROR: {e}")

    # 5. data.yaml check
    yaml_path = EXTRACT_DIR / "data.yaml"
    if yaml_path.exists():
        with open(yaml_path, "r") as f:
            print(f"YAML_CONTENTS: {f.read()}")
    else:
        print("YAML_NOT_FOUND")

if __name__ == "__main__":
    inspect()
