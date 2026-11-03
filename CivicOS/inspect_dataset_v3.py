import os
import cv2
from pathlib import Path
from collections import Counter

# The structure is: Data_sets/{class}/{images|labels}/{file}
ROOT_DIR = Path("ai_engine/datasets/raw/Urban_Community_Issues_clean/extracted/Data_sets")

def inspect():
    all_images = list(ROOT_DIR.rglob("images/*.jpg")) + list(ROOT_DIR.rglob("images/*.png")) + list(ROOT_DIR.rglob("images/*.jpeg"))
    all_labels = list(ROOT_DIR.rglob("labels/*.txt"))
    
    print(f"IMAGE_COUNT: {len(all_images)}")
    print(f"LABEL_COUNT: {len(all_labels)}")
    
    if not all_labels:
        print("NO_LABELS_FOUND")
        return

    with open(all_labels[0], "r") as f:
        first_line = f.readline()
        print(f"ANNOTATION_FORMAT: YOLO (Sample: {first_line.strip()})")
    
    all_classes = []
    matching_count = 0
    
    for img_path in all_images:
        # Convert .../images/img1.jpg to .../labels/img1.txt
        label_path = Path(str(img_path).replace("/images/", "/labels/").replace("\\images\\", "\\labels\\")).with_suffix(".txt")
        if label_path.exists():
            matching_count += 1
            with open(label_path, "r") as f:
                for line in f:
                    parts = line.split()
                    if parts:
                        all_classes.append(parts[0])
        
    print(f"MATCHING_IMAGES: {matching_count}")
    print(f"IMAGES_WITHOUT_LABELS: {len(all_images) - matching_count}")
    
    class_counts = Counter(all_classes)
    print(f"CLASSES_FOUND: {dict(class_counts)}")

    if all_images:
        img = cv2.imread(str(all_images[0]))
        if img is not None:
            print(f"OPENCV_READ: Success | Dim: {img.shape}")
        else:
            print("OPENCV_READ: Failed")

if __name__ == "__main__":
    inspect()
