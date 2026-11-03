import requests
import zipfile
import os
import time
from pathlib import Path

# Configuration from verified metadata
URL = "https://zenodo.org/records/18871460/files/Data_sets.zip?download=1"
BASE_DIR = Path("ai_engine/datasets/raw/Urban_Community_Issues_fresh")
FINAL_ZIP = BASE_DIR / "Data_sets_final.zip"
EXTRACT_DIR = BASE_DIR / "extracted"
CHUNK_SIZE = 8 * 1024 * 1024  # 8MB

def resumable_download():
    BASE_DIR.mkdir(parents=True, exist_ok=True)
    
    # 1. Determine current size
    current_size = 0
    if FINAL_ZIP.exists():
        current_size = FINAL_ZIP.stat().st_size
        print(f"Existing file found. Current size: {current_size} bytes")

    # 2. Get remote metadata
    try:
        head = requests.head(URL, timeout=10)
        total_size = int(head.headers.get("content-length", 0))
        if total_size == 0:
            # Fallback to Range request if HEAD is empty
            r = requests.get(URL, headers={"Range": "bytes=0-0"}, timeout=10)
            total_size = int(r.headers.get("content-range", "0").split("/")[-1])
        
        print(f"Total expected size: {total_size} bytes")
    except Exception as e:
        print(f"Metadata ERROR: {e}")
        return False

    if current_size >= total_size:
        print("File already fully downloaded.")
        return True

    # 3. Download remaining bytes
    headers = {"Range": f"bytes={current_size}-"}
    retries = 0
    max_retries = 5

    while current_size < total_size and retries < max_retries:
        try:
            print(f"Requesting range: {current_size}-{total_size}...")
            with requests.get(URL, headers=headers, stream=True, timeout=30) as r:
                if r.status_code != 206:
                    print(f"Server returned {r.status_code} instead of 206. Restarting download.")
                    # Handle cases where server ignores range and sends full file (200 OK)
                    if r.status_code == 200:
                        with open(FINAL_ZIP, "wb") as f:
                            for chunk in r.iter_content(chunk_size=CHUNK_SIZE):
                                f.write(chunk)
                        current_size = FINAL_ZIP.stat().st_size
                        print("Full download completed via 200 OK.")
                        break
                    else:
                        raise Exception(f"Unexpected status code {r.status_code}")
                
                with open(FINAL_ZIP, "ab") as f:
                    for chunk in r.iter_content(chunk_size=CHUNK_SIZE):
                        if chunk:
                            f.write(chunk)
                            current_size += len(chunk)
                            progress = (current_size / total_size) * 100
                            print(f"Progress: {progress:.2f}% | Received: {current_size}/{total_size}", end="\r")
            
            print("\nDownload completed successfully.")
            break
        except Exception as e:
            retries += 1
            wait = 2 ** retries
            print(f"\nConnection drop: {e}. Retry {retries}/{max_retries} in {wait}s...")
            time.sleep(wait)
            headers = {"Range": f"bytes={FINAL_ZIP.stat().st_size if FINAL_ZIP.exists() else 0}-"}

    if current_size < total_size:
        print(f"Failed to complete download after {max_retries} retries.")
        return False
    return True

def verify_and_extract():
    print("Starting Verification...")
    try:
        with zipfile.ZipFile(FINAL_ZIP, "r") as zip_ref:
            # Integrity check
            bad_file = zip_ref.testzip()
            if bad_file:
                print(f"ZIP integrity check FAILED: {bad_file}")
                return False
            print("ZIP integrity check PASSED.")
            
            # Path Traversal Check
            for member in zip_ref.namelist():
                if ".." in member or member.startswith("/") or member.startswith("C:"):
                    print(f"Security Risk: Path traversal attempt in {member}")
                    return False
            
            # Extraction
            EXTRACT_DIR.mkdir(parents=True, exist_ok=True)
            zip_ref.extractall(EXTRACT_DIR)
            print(f"Extraction successful to {EXTRACT_DIR}")
            return True
    except Exception as e:
        print(f"Verification/Extraction ERROR: {e}")
        return False

if __name__ == "__main__":
    if resumable_download():
        if verify_and_extract():
            print("ALL STEPS SUCCESSFUL")
        else:
            print("VERIFICATION/EXTRACTION FAILED")
    else:
        print("DOWNLOAD FAILED")
