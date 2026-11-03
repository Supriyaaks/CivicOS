import requests
import os
from pathlib import Path

URL = "https://zenodo.org/records/18871460/files/Data_sets.zip?download=1"
BASE_DIR = Path("ai_engine/datasets/raw/Urban_Community_Issues_fresh")
TEMP_ZIP = BASE_DIR / "Data_sets_final_temp.zip"
FINAL_ZIP = BASE_DIR / "Data_sets_final.zip"

def download():
    BASE_DIR.mkdir(parents=True, exist_ok=True)
    try:
        print("Starting clean download...")
        with requests.get(URL, stream=True, timeout=30) as r:
            r.raise_for_status()
            with open(TEMP_ZIP, "wb") as f:
                for chunk in r.iter_content(chunk_size=1024*1024):
                    if chunk:
                        f.write(chunk)
        
        # Final check
        if TEMP_ZIP.stat().st_size == 703063005:
            if FINAL_ZIP.exists():
                os.remove(FINAL_ZIP)
            os.rename(TEMP_ZIP, FINAL_ZIP)
            print("DOWNLOAD_SUCCESS")
        else:
            print(f"SIZE_MISMATCH: {TEMP_ZIP.stat().st_size} vs 703063005")
    except Exception as e:
        print(f"ERROR: {e}")

if __name__ == "__main__":
    download()
