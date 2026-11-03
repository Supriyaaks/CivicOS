import json
import os
import shutil
import random
import cv2
from pathlib import Path
from collections import defaultdict

# Configuration
ANNO_PATH = "ai_engine/datasets/processed/mini_taco50/annotations.json"
OUTPUT_ROOT = Path("ai_engine/datasets/processed/mini_taco50")
IMAGES_ROOT = OUTPUT_ROOT / "images"
YOLO_LABELS_ROOT = OUTPUT_ROOT / "labels"
SEED = 42

def coco_to_yolo(bbox, img_w, img_h):
    """Convert COCO [x, y, w, h] to YOLO [x_center, y_center, w, h] normalized."""
    x, y, w, h = bbox
    x_center = (x + w / 2) / img_w
    y_center = (y + h / 2) / img_h
    norm_w = w / img_w
    norm_h = h / img_h
    return [x_center, y_center, norm_w, norm_h]

def prepare_taco_yolo():
    random.seed(SEED)

    with open(ANNO_PATH, 'r') as f:
        data = json.load(f)

    images = data['images']
    annotations = data['annotations']
    categories = data['categories']

    # 1. Filter out the invalid annotation (ID 371)
    valid_annotations = [a for a in annotations if a['id'] != 371]

    # 2. Identify images that contain at least one valid annotation
    valid_img_ids = set(a['image_id'] for a in valid_annotations)
    valid_images = [img for img in images if img['id'] in valid_img_ids]

    # 3. Image-level split (Fixed sort for consistency)
    valid_images.sort(key=lambda x: x['id'])

    total = len(valid_images)
    train_idx = int(total * 0.7)
    val_idx = int(total * 0.85)

    splits = {
        "train": valid_images[:train_idx],
        "val": valid_images[train_idx:val_idx],
        "test": valid_images[val_idx:]
    }

    # 4. Create YOLO labels
    for split_name, split_images in splits.items():
        for img in split_images:
            img_id = img['id']
            file_name = img['file_name'] # e.g. "batch_1/000019.jpg"

            # Define relative path for label to match image path exactly
            # images/train/batch_1/000019.jpg -> labels/train/batch_1/000019.txt
            rel_label_path = Path("labels") / split_name / Path(file_name).with_suffix('.txt')

            # Create necessary directories (e.g. labels/train/batch_1/)
            abs_label_dir = YOLO_LABELS_ROOT / rel_label_path.relative_to("labels").parent
            abs_label_dir.mkdir(parents=True, exist_ok=True)

            abs_label_path = YOLO_LABELS_ROOT / rel_label_path.relative_to("labels")

            # Find annotations for this image
            img_annos = [a for a in valid_annotations if a['image_id'] == img_id]

            with open(abs_label_path, 'w') as f:
                for anno in img_annos:
                    # ALL valid annotations map to class 0: Litter
                    yolo_cat_id = 0

                    yolo_bbox = coco_to_yolo(anno['bbox'], img['width'], img['height'])
                    f.write(f"{yolo_cat_id} {' '.join(map(str, yolo_bbox))}\n")

    print(f"SUCCESS: Converted {len(valid_annotations)} annotations across {len(valid_images)} images.")
    print(f"Splits: Train({len(splits['train'])}), Val({len(splits['val'])}), Test({len(splits['test'])})")

if __name__ == "__main__":
    prepare_taco_yolo()
