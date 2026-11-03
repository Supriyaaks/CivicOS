import requests
import os
import time
import hashlib
from pathlib import Path

URL = "https://zenodo.org/records/18871460/files/Data_sets.zip?download=1"
BASE_DIR = Path("ai_engine/datasets/raw/Urban_Community_Issues_clean")
TEMP_ZIP = BASE_DIR / "Data_sets_clean.zip.part"
FINAL_ZIP = BASE_DIR / "Data_sets_clean.zip"
EXPECTED_SIZE = 703063005
EXPECTED_MD5 = "d1560309bf372b14c896113722ae2532"
CHUNK_SIZE = 8 * 1024 * 1024

def resumable_download():
    BASE_DIR.mkdir(parents=True, exist_ok=True)
    current_size = TEMP_ZIP.stat().st_size if TEMP_ZIP.exists() else 0
    print(f"Resuming from {current_size} bytes")

    retries = 0
    max_retries = 5
    
    while current_size < EXPECTED_SIZE and retries < max_retries:
        try:
            headers = {"Range": f"bytes={current_size}-"}
            with requests.get(URL, headers=headers, stream=True, timeout=60) as r:
                if r.status_code != 206:
                    if r.status_code == 200:
                        print("Server returned 200 OK. Restarting from zero.")
                        current_size = 0
                        with open(TEMP_ZIP, "wb") as f: pass
                    else:
                        raise Exception(f"Unexpected status code: {r.status_code}")
                
                content_range = r.headers.get("Content-Range", "")
                if content_range:
                    parts = content_range.replace("bytes ", "").split("/")
                    if len(parts) == 2:
                        range_start = int(parts[0].split("-")[0])
                        if range_start != current_size:
                            print(f"Range mismatch: Expected {current_size}, got {range_start}")
                            return False
                
                with open(TEMP_ZIP, "ab") as f:
                    for chunk in r.iter_content(chunk_size=CHUNK_SIZE):
                        if chunk:
                            f.write(chunk)
                            current_size += len(chunk)
                            progress = (current_size / EXPECTED_SIZE) * 100
                            print(f"Progress: {progress:.2f}% | {current_size}/{EXPECTED_SIZE}", end="\r")
            
            if current_size >= EXPECTED_SIZE:
                break
        except Exception as e:
            retries += 1
            time.sleep(2 ** retries)
            print(f"\nRetry {retries}/{max_retries} after error: {e}")
            current_size = TEMP_ZIP.stat().st_size if TEMP_ZIP.exists() else 0

    if TEMP_ZIP.stat().st_size == EXPECTED_SIZE:
        os.rename(TEMP_ZIP, FINAL_ZIP)
        print("\nDOWNLOAD_SUCCESS")
        return True
    return False

def verify_checksum():
    print("Calculating MD5 checksum...")
    hash_md5 = hashlib.md5()
    with open(FINAL_ZIP, "rb") as f:
        for chunk in iter(lambda: f.read(4096), b""):
            hash_md5.update(chunk)
    actual_md5 = hash_md5.hexdigest()
    print(f"Expected: {EXPECTED_MD5}")
    print(f"Actual:   {actual_md5}")
    return actual_md5 == EXPECTED_MD5

if __name__ == "__main__":
    if resumable_download():
        if verify_checksum():
            print("CHECKSUM_VERIFIED")
        else:
            print("CHECKSUM_FAILED")
    else:
        print("DOWNLOAD_FAILED")
