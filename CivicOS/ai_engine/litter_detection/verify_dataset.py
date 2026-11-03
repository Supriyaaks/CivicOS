import os
import json
import sqlite3
import cv2
from pathlib import Path
from collections import defaultdict

# Configuration
DATASET_ROOT = Path("ai_engine/datasets/processed/mini_taco50")
ANNO_FILE = DATASET_ROOT / "annotations.json"
DB_FILE = DATASET_ROOT / "mini_taco50.db"

def validate_mini_taco():
    results = {
        "total_annotations": 0,
        "valid_images": 0,
        "invalid_images": 0,
        "invalid_annos": 0,
        "bbox_errors": 0,
        "category_errors": 0,
        "split_overlap": False,
        "all_images_readable": True
    }

    if not ANNO_FILE.exists():
        print(f"Error: Annotations not found at {ANNO_FILE}")
        return None

    with open(ANNO_FILE, 'r') as f:
        data = json.load(f)

    images = data.get('images', [])
    annotations = data.get('annotations', [])
    categories = data.get('categories', [])

    results["total_annotations"] = len(annotations)

    # 1. Check images
    img_paths = []
    for img in images:
        # Mini-TACO images are in images/train, images/val, images/test
        # We search for the file in the whole images directory
        file_name = img['file_name']
        found = False
        for p in (DATASET_ROOT / "images").rglob(file_name):
            if p.exists():
                # Try to open image
                if cv2.imread(str(p)) is not None:
                    found = True
                    img_paths.append(p)
                    break

        if found:
            results["valid_images"] = results.get("valid_images", 0) + 1
        else:
            results["invalid_images"] = results.get("invalid_images", 0) + 1
            results["all_images_readable"] = False

    # 2. Check annotations
    for anno in annotations:
        # Bbox check [x, y, width, height]
        bbox = anno.get('bbox', [])
        if len(bbox) != 4 or any(v < 0 for v in bbox):
            results["bbox_errors"] += 1

        # Category check
        cat_id = anno.get('category_id')
        if not any(c['id'] == cat_id for c in categories):
            results["category_errors"] += 1

    # 3. Check for split overlap
    # We check if the same image file exists in multiple split folders
    split_files = defaultdict(set)
    for split in ['train', 'val', 'test']:
        split_dir = DATASET_ROOT / "images" / split
        if split_dir.exists():
            for img in split_dir.glob("*.jpg"):
                split_files[split].add(img.name)

    # Check intersections
    train_set = split_files['train']
    val_set = split_files['val']
    test_set = split_files['test']

    if (train_set & val_set) or (train_set & test_set) or (val_set & test_set):
        results["split_overlap"] = True

    # 4. DB Verification
    try:
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        cursor.execute("SELECT count(*) FROM annotations")
        db_annos = cursor.fetchone()[0]
        if db_annos != len(annotations):
            results["db_mismatch"] = True
        conn.close()
    except Exception as e:
        results["db_error"] = str(e)

    return results

if __name__ == "__main__":
    res = validate_mini_taco()
    if res:
        print("--- Mini-TACO50 Validation Report ---")
        for k, v in res.items():
            print(f"{k}: {v}")
