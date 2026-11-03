import json
import cv2
from pathlib import Path

# Configuration
ANNO_PATH = "ai_engine/datasets/processed/mini_taco50/annotations.json"
IMAGES_ROOT = Path("ai_engine/datasets/processed/mini_taco50/images")

def audit_bboxes():
    with open(ANNO_PATH, 'r') as f:
        data = json.load(f)

    images = {img['id']: img for img in data['images']}
    annotations = data['annotations']

    print("--- Bounding Box Audit ---")
    invalid_annos = []

    for anno in annotations:
        bbox = anno.get('bbox', [])
        img_id = anno.get('image_id')
        img_record = images.get(img_id)

        if not img_record:
            print(f"Error: Annotation {anno['id']} references missing image {img_id}")
            continue

        img_w = img_record['width']
        img_h = img_record['height']

        # COCO bbox: [x_min, y_min, width, height]
        if len(bbox) != 4:
            invalid_annos.append((anno['id'], "Wrong dimensions"))
            continue

        x, y, w, h = bbox
        # Check for negative values or zeros
        if x < 0 or y < 0 or w <= 0 or h <= 0:
            invalid_annos.append((anno['id'], f"Invalid values: {bbox}"))
            continue

        # Check if bbox exceeds image boundaries
        if x + w > img_w or y + h > img_h:
            invalid_annos.append((anno['id'], f"Exceeds image bounds ({img_w}x{img_h}): {bbox}"))
            continue

    if not invalid_annos:
        print("All bounding boxes are valid.")
    else:
        print(f"Found {len(invalid_annos)} invalid annotations:")
        for aid, reason in invalid_annos:
            print(f"ID {aid}: {reason}")

if __name__ == "__main__":
    audit_bboxes()
