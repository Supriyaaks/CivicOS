import zipfile
import os
from pathlib import Path

FINAL_ZIP = Path("ai_engine/datasets/raw/Urban_Community_Issues_fresh/Data_sets_final.zip")
EXTRACT_DIR = Path("ai_engine/datasets/raw/Urban_Community_Issues_fresh/extracted")

try:
    with zipfile.ZipFile(FINAL_ZIP, "r") as zip_ref:
        bad_file = zip_ref.testzip()
        if bad_file:
            print(f"VERIFY_FAIL: {bad_file}")
        else:
            print("VERIFY_SUCCESS")
            zip_ref.extractall(EXTRACT_DIR)
            print("EXTRACTION_SUCCESS")
except Exception as e:
    print(f"EXTRACT_ERROR: {e}")
