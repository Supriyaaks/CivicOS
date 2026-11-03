import os
import cv2
from pathlib import Path

def verify_mini_dataset():
    root = Path("ai_engine/datasets/processed/urban_community_mini50")
    splits = ["train", "val", "test"]

    total_images = 0
    all_files = []

    for split in splits:
        img_dir = root / "images" / split
        lbl_dir = root / "labels" / split

        images = list(img_dir.glob("*.jpg"))
        labels = list(lbl_dir.glob("*.txt"))

        total_images += len(images)

        # Check matching labels
        for img in images:
            lbl = lbl_dir / (img.stem + ".txt")
            if not lbl.exists():
                print(f"Missing label for {img.name}")
                return False

            # Check if image opens
            img_data = cv2.imread(str(img))
            if img_data is None:
                print(f"Corrupt image: {img.name}")
                return False

    print(f"Total images verified: {total_images}")
    return total_images == 50

if __name__ == "__main__":
    if verify_mini_dataset():
        print("VALIDATION SUCCESS")
    else:
        print("VALIDATION FAILED")
