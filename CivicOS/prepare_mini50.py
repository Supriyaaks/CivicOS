import os
import random
import shutil
import csv
import cv2
from pathlib import Path
from collections import defaultdict

# Paths
RAW_DATA_ROOT = Path("ai_engine/datasets/raw/Urban_Community_Issues_clean/extracted/Data_sets")
OUTPUT_ROOT = Path("ai_engine/datasets/processed/urban_community_mini50")
SEED = 42

# Class mapping as per prompt
CLASS_MAP = {
    "animal": 0,
    "traffic_lights": 1,
    "waste_container": 2,
    "pothole": 3,
    "cracks": 4,
    "open_manhole": 5
}
INV_CLASS_MAP = {v: k for k, v in CLASS_MAP.items()}

def validate_yolo_label(file_path):
    """Checks if a YOLO label file has valid normalized coordinates and class IDs."""
    try:
        with open(file_path, 'r') as f:
            for line in f:
                parts = line.strip().split()
                if not parts: continue
                cls = int(parts[0])
                if cls not in CLASS_MAP.values(): return False
                coords = [float(x) for x in parts[1:]]
                if any(c < 0 or c > 1 for c in coords): return False
        return True
    except Exception:
        return False

def prepare_mini_dataset():
    random.seed(SEED)

    # 1. Collect all available images and their categories
    category_images = defaultdict(list)
    all_negative_images = []

    # Process each category folder
    for cat_name, cat_id in CLASS_MAP.items():
        cat_dir = RAW_DATA_ROOT / cat_name
        img_dir = cat_dir / "images"
        lbl_dir = cat_dir / "labels"

        if not img_dir.exists(): continue

        for img_file in img_dir.glob("*.jpg"):
            lbl_file = lbl_dir / (img_file.stem + ".txt")
            if lbl_file.exists() and validate_yolo_label(lbl_file):
                category_images[cat_name].append((img_file, lbl_file))

    # Process negative images (good_road)
    neg_dir = RAW_DATA_ROOT / "good_road"
    if neg_dir.exists():
        # Check if images are directly in good_road or in a subfolder
        img_files = list(neg_dir.glob("**/*.jpg"))
        for img_file in img_files:
            # Negative images usually don't have labels or have empty ones
            all_negative_images.append(img_file)

    # 2. Sampling
    selected_images = []
    selected_labels = []
    class_counts = {cat: 0 for cat in CLASS_MAP}

    # Ensure every category is represented at least once
    for cat_name in CLASS_MAP:
        available = category_images[cat_name]
        if not available:
            continue
        # Pick one guaranteed image
        img, lbl = random.choice(available)
        selected_images.append(img)
        selected_labels.append(lbl)
        class_counts[cat_name] += 1

    # Fill the remaining slots up to 50
    all_pos_candidates = []
    for cat_list in category_images.values():
        all_pos_candidates.extend(cat_list)

    # Remove already selected
    picked_set = {str(img) for img, lbl in zip(selected_images, selected_labels)}
    remaining_pos = [item for item in all_pos_candidates if str(item[0]) not in picked_set]

    # Sample remaining from positive and negatives
    needed = 50 - len(selected_images)

    # Mix of remaining positives and some negatives
    sampled_pos = random.sample(remaining_pos, min(len(remaining_pos), int(needed * 0.8)))
    sampled_neg = random.sample(all_negative_images, min(len(all_negative_images), needed - len(sampled_pos)))

    # Add sampled positives
    for img, lbl in sampled_pos:
        selected_images.append(img)
        selected_labels.append(lbl)
        # Update counts (simple approximation: count first object in file)
        try:
            with open(lbl, 'r') as f:
                first_line = f.readline()
                if first_line:
                    cls_id = int(first_line.split()[0])
                    class_counts[INV_CLASS_MAP[cls_id]] += 1
        except: pass

    # Add sampled negatives
    for img in sampled_neg:
        selected_images.append(img)
        # Create empty label file for negatives
        dummy_lbl = Path("temp_empty.txt")
        dummy_lbl.write_text("")
        selected_labels.append(dummy_lbl)

    # Trim to exactly 50 if we overshot slightly
    selected_images = selected_images[:50]
    selected_labels = selected_labels[:50]

    # 3. Split: Train(35), Val(7), Test(8)
    combined = list(zip(selected_images, selected_labels))
    random.shuffle(combined)

    train_set = combined[:35]
    val_set = combined[35:42]
    test_set = combined[42:50]

    splits = {"train": train_set, "val": val_set, "test": test_set}

    # 4. Create Directories and Copy Files
    manifest_data = []

    for split_name, items in splits.items():
        img_out = OUTPUT_ROOT / "images" / split_name
        lbl_out = OUTPUT_ROOT / "labels" / split_name
        img_out.mkdir(parents=True, exist_ok=True)
        lbl_out.mkdir(parents=True, exist_ok=True)

        for img, lbl in items:
            dest_img = img_out / img.name
            dest_lbl = lbl_out / (img.stem + ".txt")

            shutil.copy2(img, dest_img)
            if lbl.exists():
                shutil.copy2(lbl, dest_lbl)
            else:
                dest_lbl.write_text("") # Ensure empty label exists

            manifest_data.append({
                "image": img.name,
                "label": dest_lbl.name,
                "split": split_name
            })

    # 5. Generate data.yaml
    yaml_content = f"""
path: {OUTPUT_ROOT.absolute()}
train: images/train
val: images/val
test: images/test

names:
  0: animal
  1: traffic_light
  2: waste_container
  3: pothole
  4: cracks
  5: open_manhole
"""
    (OUTPUT_ROOT / "data.yaml").write_text(yaml_content)

    # 6. Generate manifest.csv
    with open(OUTPUT_ROOT / "dataset_manifest.csv", "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=["image", "label", "split"])
        writer.writeheader()
        writer.writerows(manifest_data)

    # 7. Generate README
    readme_content = f"""# Urban Community Mini50 Dataset
A lightweight subset of the Urban Community Issues dataset for fast prototyping.

## Stats
- Total Images: 50
- Train: 35 | Val: 7 | Test: 8
- Classes: 6 (Animal, Traffic Light, Waste Container, Pothole, Cracks, Open Manhole)

## Structure
- images/{{train,val,test}}: Original JPEG images.
- labels/{{train,val,test}}: YOLO format .txt annotations.
"""
    (OUTPUT_ROOT / "README.md").write_text(readme_content)

    return len(selected_images), class_counts, len(all_negative_images)

if __name__ == "__main__":
    import shutil
    try:
        count, classes, neg_total = prepare_mini_dataset()
        print(f"SUCCESS: Prepared {count} images.")
        print(f"Class Distribution: {classes}")
        print(f"Total Available Negatives: {neg_total}")
    except Exception as e:
        print(f"ERROR: {e}")
