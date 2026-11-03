import requests
import zipfile
import os
from pathlib import Path

# Configuration
URL = "https://zenodo.org/records/18871460/files/Data_sets.zip?download=1"
BASE_DIR = Path("ai_engine/datasets/raw/Urban_Community_Issues_fresh")
TEMP_ZIP = BASE_DIR / "Data_sets_final.zip.part"
FINAL_ZIP = BASE_DIR / "Data_sets_final.zip"
EXTRACT_DIR = BASE_DIR / "extracted"

def download_file():
    print(f"Starting download: {URL}")
    BASE_DIR.mkdir(parents=True, exist_ok=True)
    
    try:
        with requests.get(URL, stream=True) as r:
            r.raise_for_status()
            with open(TEMP_ZIP, "wb") as f:
                for chunk in r.iter_content(chunk_size=8192):
                    f.write(chunk)
        
        # Rename to final zip
        if FINAL_ZIP.exists():
            os.remove(FINAL_ZIP)
        os.rename(TEMP_ZIP, FINAL_ZIP)
        print(f"Download successful: {FINAL_ZIP}")
        return True
    except Exception as e:
        print(f"Download ERROR: {e}")
        return False

def verify_zip():
    print(f"Verifying ZIP: {FINAL_ZIP}")
    try:
        with zipfile.ZipFile(FINAL_ZIP, "r") as zip_ref:
            # Check integrity
            bad_file = zip_ref.testzip()
            if bad_file:
                print(f"ZIP integrity check FAILED. Corrupt file: {bad_file}")
                return False
            print("ZIP integrity check PASSED.")
            return True
    except Exception as e:
        print(f"Verification ERROR: {e}")
        return False

def extract_zip():
    print(f"Extracting to: {EXTRACT_DIR}")
    try:
        with zipfile.ZipFile(FINAL_ZIP, "r") as zip_ref:
            # Path traversal check
            for member in zip_ref.namelist():
                if ".." in member or member.startswith("/"):
                    print(f"Security Risk: Path traversal attempt found in {member}")
                    return False
            
            zip_ref.extractall(EXTRACT_DIR)
        print("Extraction successful.")
        return True
    except Exception as e:
        print(f"Extraction ERROR: {e}")
        return False

if __name__ == "__main__":
    if download_file():
        if verify_zip():
            if extract_zip():
                print("ALL STEPS COMPLETED SUCCESSFULLY")
            else:
                print("EXTRACTION FAILED")
        else:
            print("VERIFICATION FAILED")
    else:
        print("DOWNLOAD FAILED")
