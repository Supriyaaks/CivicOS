import json
from pathlib import Path

def fix_and_verify_taco_yaml():
    yaml_path = Path("ai_engine/datasets/processed/mini_taco50/data.yaml")
    anno_path = Path("ai_engine/datasets/processed/mini_taco50/annotations.json")

    if not anno_path.exists():
        print("Annotations not found")
        return

    with open(anno_path, 'r') as f:
        data = json.load(f)

    # Get unique categories present in the selected 50 annotations
    categories = data['categories']
    category_names = {cat['id']: cat['name'] for cat, cat in enumerate(categories)} # This is wrong
    # Correct:
    category_map = {cat['id']: cat['name'] for cat in categories}

    # Create the actual sorted list of categories for the YAML
    sorted_cat_ids = sorted(category_map.keys())
    names_yaml = ""
    for i, cat_id in enumerate(sorted_cat_ids):
        names_yaml += f"  {i}: {category_map[cat_id]}\n"

    yaml_content = f"""path: {anno_path.parent.parent.absolute()}
train: images/train
val: images/val
test: images/test

names:
{names_yaml}"""

    with open(yaml_path, 'w') as f:
        f.write(yaml_content)

    print(f"SUCCESS: data.yaml updated with {len(sorted_cat_ids)} classes.")
    print("Classes:\n" + names_yaml)

if __name__ == "__main__":
    fix_and_verify_taco_yaml()
