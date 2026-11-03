import json
from pathlib import Path

# Configuration
ANNO_PATH = Path("ai_engine/datasets/processed/mini_taco50/annotations.json")
DATA_YAML_PATH = Path("ai_engine/datasets/processed/mini_taco50/data.yaml")
ROOT_DIR = Path("C:/Users/WCT/Desktop/CivicOS")

def fix_taco_yaml():
    if not ANNO_PATH.exists():
        print("Annotations not found")
        return

    with open(ANNO_PATH, 'r') as f:
        data = json.load(f)

    categories = data['categories']
    sorted_cat_ids = sorted([cat['id'] for cat in categories])

    # Mapping categories
    names_yaml = ""
    for i, cat_id in enumerate(sorted_cat_ids):
        # Find name for this id
        cat_name = next(cat['name'] for cat in categories if cat['id'] == cat_id)
        names_yaml += f"  {i}: {cat_name}\n"

    # CRITICAL: Use absolute paths for train/val/test to avoid Ultralytics path resolution issues
    # The images are in ai_engine/datasets/processed/mini_taco50/images/{split}
    yaml_content = f"""path: {ROOT_DIR / 'ai_engine' / 'datasets' / 'processed' / 'mini_taco50'}
train: images/train
val: images/val
test: images/test

names:
{names_yaml}"""

    with open(DATA_YAML_PATH, 'w') as f:
        f.write(yaml_content)

    print(f"SUCCESS: data.yaml updated with absolute base path and {len(sorted_cat_ids)} classes.")

if __name__ == "__main__":
    fix_taco_yaml()
