import os
import json
import random
import shutil
import sqlite3
import csv
from pathlib import Path
from collections import defaultdict

# Configuration
RAW_ANNO_PATH = "ai_engine/datasets/raw/TACO/repo_content/TACO-master/data/annotations.json"
RAW_IMAGES_ROOT = Path("ai_engine/datasets/raw/TACO/images")
OUTPUT_ROOT = Path("ai_engine/datasets/processed/mini_taco50")
SEED = 42

def create_mini_taco():
    random.seed(SEED)

    # 1. Load original annotations
    if not os.path.exists(RAW_ANNO_PATH):
        print(f"Error: Annotations file not found at {RAW_ANNO_PATH}")
        return False

    with open(RAW_ANNO_PATH, 'r') as f:
        data = json.load(f)

    images_all = data['images']
    annotations_all = data['annotations']
    categories_all = data['categories']

    # Map annotations to images
    img_to_annos = defaultdict(list)
    for anno in annotations_all:
        img_to_annos[anno['image_id']].append(anno)

    # 2. Selection Process: Exactly 50 annotated objects
    selected_annos = []
    selected_images = set()

    # Shuffle annotations to get random samples
    all_annos_list = list(annotations_all)
    random.shuffle(all_annos_list)

    for anno in all_annos_list:
        if len(selected_annos) >= 50:
            break

        img_id = anno['image_id']
        img_record = next((img for img in images_all if img['id'] == img_id), None)
        if not img_record:
            continue

        file_name = img_record['file_//name'] if 'file_//name' in img_record else img_record.get('file_name')
        # Search for the image in raw subdirectories
        img_path = None
        for p in RAW_IMAGES_ROOT.rglob(file_name):
            img_path = p
            break

        if img_path and img_path.exists():
            selected_annos.append(anno)
            selected_images.add(img_id)

    if len(selected_annos) < 50:
        print(f"Error: Only found {len(selected_annos)} valid instances.")
        return False

    # 3. Create Directory Structure
    # Clear existing to ensure a clean slate for the "independence" requirement
    if OUTPUT_ROOT.exists():
        shutil.rmtree(OUTPUT_ROOT)

    for split in ['train', 'val', 'test']:
        (OUTPUT_ROOT / "images" / split).mkdir(parents=True, exist_ok=True)

    # 4. Split Images
    img_ids_list = list(selected_images)
    random.shuffle(img_ids_list)

    total_imgs = len(img_ids_list)
    train_count = int(total_imgs * 0.7)
    val_count = int(total_imgs * 0.15)

    train_ids = set(img_ids_list[:train_count])
    val_ids = set(img_ids_list[train_count : train_count + val_count])
    test_ids = set(img_ids_list[train_count + val_count:])

    # Copy images
    for split_name, target_ids in [("train", train_ids), ("val", val_ids), ("test", test_ids)]:
        for img_id in target_ids:
            img_record = next((img for img in images_all if img['id'] == img_id), None)
            if not img_record: continue

            file_name = img_record['file_//name'] if 'file_//name' in img_record else img_record.get('file_name')
            src_path = None
            for p in RAW_IMAGES_ROOT.rglob(file_name):
                src_path = p
                break

            if src_path:
                dest_path = OUTPUT_ROOT / "images" / split_name / file_name
                dest_path.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(src_path, dest_path)

    # 5. Create the Mini-TACO JSON
    mini_taco_json = {
        "images": [img for img in images_all if img['id'] in selected_images],
        "annotations": selected_annos,
        "categories": categories_all
    }
    with open(OUTPUT_ROOT / "annotations.json", "w") as f:
        json.dump(mini_taco_json, f, indent=2)

    # 6. Database Creation
    db_path = OUTPUT_ROOT / "mini_taco50.db"
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    cursor.execute("CREATE TABLE dataset_info (key TEXT, value TEXT)")
    cursor.execute("CREATE TABLE images (id INTEGER PRIMARY KEY, file_name TEXT, width INTEGER, height INTEGER)")
    cursor.execute("CREATE TABLE categories (id INTEGER PRIMARY KEY, name TEXT, supercategory TEXT)")
    cursor.execute("CREATE TABLE annotations (id INTEGER PRIMARY KEY, image_id INTEGER, category_id INTEGER, bbox TEXT)")

    for img in mini_taco_json["images"]:
        fname = img.get('file_//name') or img.get('file_name')
        cursor.execute("INSERT INTO images VALUES (?, ?, ?, ?)", (img['id'], fname, img['width'], img['height']))
    for cat in categories_all:
        cursor.execute("INSERT INTO categories VALUES (?, ?, ?)", (cat['id'], cat['name'], cat.get('supercategory', '')))
    for anno in selected_annos:
        cursor.execute("INSERT INTO annotations VALUES (?, ?, ?, ?)", (anno['id'], anno['image_id'], anno['category_id'], str(anno['bbox'])))

    conn.commit()
    conn.close()

    print(f"SUCCESS: Mini-TACO50 created with {len(selected_annos)} annotations.")
    return True

if __name__ == "__main__":
    create_mini_taco()
