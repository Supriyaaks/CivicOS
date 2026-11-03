import zipfile
import os
import cv2
from pathlib import Path
from collections import Counter

FINAL_ZIP = Path("ai_engine/datasets/raw/Urban_Community_Issues_fresh/Data_sets_final.zip")
EXTRACT_DIR = Path("ai_engine/datasets/raw/Urban_Community_Issues_fresh/extracted")
EXPECTED_SIZE = 703063005

def inspect_dataset():
    if not FINAL_ZIP.exists():
        print("FILE_NOT_FOUND")
        return

    # 1. Size check
    actual_size = FINAL_ZIP.stat().st_size
    print(f"Actual Size: {actual_size}, Expected: {EXPECTED_SIZE}")
    if actual_size != EXPECTED_SIZE:
        print(f"SIZE_MISMATCH: {actual_size} != {EXPECTED_SIZE}")
        return

    # 2. Integrity check & Extraction
    try:
        with zipfile.ZipFile(FINAL_ZIP, "r") as zip_ref:
            if zip_ref.testzip():
                print("ZIP_CORRUPT")
                return
            
            # Path traversal check
            for member in zip_ref.namelist():
                if ".." in member or member.startswith("/") or member.startswith("C:"):
                    print(f"SECURITY_RISK: {member}")
                    return
            
            zip_ref.extractall(EXTRACT_DIR)
            print("EXTRACTION_SUCCESS")
    except Exception as e:
        print(f"EXTRACTION_ERROR: {e}")
        return

    # 3. Inspection
    images = list(EXTRACT_DIR.rglob("*.jpg")) + list(EXTRACT_DIR.rglob("*.png")) + list(EXTRACT_DIR.rglob("*.jpeg"))
    labels = list(EXTRACT_DIR.rglob("*.txt"))
    
    print(f"IMAGE_COUNT: {len(images)}")
    print(f"LABEL_COUNT: {len(labels)}")

    # Sample class extraction
    classes = []
    if labels:
        with open(labels[0], "r") as f:
            for line in f:
                classes.append(line.split()[0])
    
    print(f"SAMPLE_CLASSES: {set(classes)}")
    
    # OpenCV read test
    if images:
        img = cv2.imread(str(images[0]))
        print("OPENCV_READ: Success" if img is not None else "OPENCV_READ: Failed")

if __name__ == "__main__":
    inspect_dataset()
