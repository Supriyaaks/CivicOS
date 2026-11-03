import zipfile
import os
from pathlib import Path

ZIP_PATH = Path("ai_engine/datasets/raw/Urban_Community_Issues_clean/Data_sets_clean.zip")
EXTRACT_DIR = Path("ai_engine/datasets/raw/Urban_Community_Issues_clean/extracted")

def safe_extract():
    if not ZIP_PATH.exists():
        print("ZIP_NOT_FOUND")
        return False
    
    try:
        with zipfile.ZipFile(ZIP_PATH, "r") as zip_ref:
            # Validate all paths
            for member in zip_ref.namelist():
                # Check for path traversal (..) or absolute paths
                if ".." in member or member.startswith("/") or member.startswith("C:"):
                    print(f"SECURITY_RISK: Path traversal detected in {member}")
                    return False
            
            EXTRACT_DIR.mkdir(parents=True, exist_ok=True)
            zip_ref.extractall(EXTRACT_DIR)
            print("EXTRACTION_SUCCESS")
            return True
    except Exception as e:
        print(f"EXTRACTION_ERROR: {e}")
        return False

if __name__ == "__main__":
    if safe_extract():
        print("SUCCESS")
    else:
        print("FAILED")
