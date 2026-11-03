import requests
import os
from pathlib import Path

URL = "https://zenodo.org/records/18871460/files/Data_sets.zip?download=1"
BASE_DIR = Path("ai_engine/datasets/raw/Urban_Community_Issues_fresh")
TEMP_ZIP = BASE_DIR / "Data_sets_final.zip.part"
FINAL_ZIP = BASE_DIR / "Data_sets_final.zip"

BASE_DIR.mkdir(parents=True, exist_ok=True)
try:
    with requests.get(URL, stream=True) as r:
        r.raise_for_status()
        with open(TEMP_ZIP, "wb") as f:
            for chunk in r.iter_content(chunk_size=8192):
                f.write(chunk)
    if FINAL_ZIP.exists():
        os.remove(FINAL_ZIP)
    os.rename(TEMP_ZIP, FINAL_ZIP)
    print("DOWNLOAD_SUCCESS")
except Exception as e:
    print(f"DOWNLOAD_ERROR: {e}")
