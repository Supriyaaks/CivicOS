import cv2
import os
import glob

path = "ai_engine/datasets/raw/TACO/images/"
files = glob.glob(os.path.join(path, "*"))
print(f"Checking {len(files)} files in {path}...")

for f in files:
    img = cv2.imread(f)
    if img is not None:
        print(f"{os.path.basename(f)}: VALID {img.shape}")
    else:
        print(f"{os.path.basename(f)}: INVALID")
