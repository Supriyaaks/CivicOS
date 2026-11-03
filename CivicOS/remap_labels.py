import os
from pathlib import Path

PROC_ROOT = Path("ai_engine/datasets/processed/urban_community_filtered")
MAPPING = {
    "3": "0", # pothole
    "4": "1", # crack
    "2": "2"  # waste_container
}

def remap_labels():
    count = 0
    for split in ["train", "val", "test"]:
        lbl_dir = PROC_ROOT / split / "labels"
        for lbl_path in lbl_dir.glob("*.txt"):
            with open(lbl_path, "r") as f:
                lines = f.readlines()
            
            new_lines = []
            for line in lines:
                parts = line.split()
                if not parts: continue
                cls = parts[0]
                if cls in MAPPING:
                    parts[0] = MAPPING[cls]
                    new_lines.append(" ".join(parts) + "\n")
            
            with open(lbl_path, "w") as f:
                f.writelines(new_lines)
            count += 1
    print(f"REMAPPED_FILES: {count}")

if __name__ == "__main__":
    remap_labels()
