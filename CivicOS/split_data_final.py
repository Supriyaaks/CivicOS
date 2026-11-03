import os
import shutil
import random
from pathlib import Path

raw_root = Path("ai_engine/datasets/raw/Urban_Community_Issues_clean/extracted/Data_sets")
proc_root = Path("ai_engine/datasets/processed/urban_community_filtered")

classes = ["pothole", "cracks", "waste_container"]

def setup():
    for s in ["train", "val", "test"]:
        (proc_root / s / "images").mkdir(parents=True, exist_ok=True)
        (proc_root / s / "labels").mkdir(parents=True, exist_ok=True)

def split():
    setup()
    data = []
    for c in classes:
        img_dir = raw_root / c / "images"
        if not img_dir.exists(): continue
        imgs = list(img_dir.glob("*.*"))
        for i in imgs:
            lbl = i.parent.parent / "labels" / i.with_suffix(".txt").name
            if lbl.exists():
                data.append((i, lbl))
    
    random.shuffle(data)
    t_end = int(len(data) * 0.8)
    v_end = int(len(data) * 0.9)
    
    for s, d in [("train", data[:t_end]), ("val", data[t_end:v_end]), ("test", data[v_end:])]:
        for img, lbl in d:
            shutil.copy(img, proc_root / s / "images" / img.name)
            shutil.copy(lbl, proc_root / s / "labels" / lbl.name)
    
    print(f"Split complete. Total: {len(data)}")

if __name__ == "__main__":
    split()
