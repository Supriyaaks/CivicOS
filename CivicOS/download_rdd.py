import requests
import zipfile
import os
import time
from pathlib import Path

URL = "https://bigdatacup.s3.ap-northeast-1.amazonaws.com/2022/CRDDC2022/RDD2022/Country_Specific_Data_CRDDC2022/RDD2022_India.zip"
BASE_DIR = Path("ai_engine/datasets/raw/RDD2022")
FINAL_ZIP = BASE_DIR / "RDD2022_India.zip"

def get_remote_size():
    try:
        # Try HEAD first
        r = requests.head(URL, timeout=10)
        size = r.headers.get("content-length")
        if size: return int(size)
        
        # Fallback to Range request
        r = requests.get(URL, headers={"Range": "bytes=0-0"}, timeout=10)
        content_range = r.headers.get("Content-Range", "")
        if content_range:
            return int(content_range.split("/")[-1])
    except Exception as e:
        print(f"Metadata Error: {e}")
    return 0

def resumable_download():
    BASE_DIR.mkdir(parents=True, exist_ok=True)
    total_size = get_remote_size()
    if total_size == 0:
        print("Could not determine remote file size.")
        return False
    
    print(f"Expected size: {total_size} bytes")
    current_size = FINAL_ZIP.stat().st_size if FINAL_ZIP.exists() else 0
    print(f"Resuming from {current_size} bytes")

    retries = 0
    max_retries = 5
    
    while current_size < total_size and retries < max_retries:
        try:
            headers = {"Range": f"bytes={current_size}-"}
            with requests.get(URL, headers=headers, stream=True, timeout=60) as r:
                if r.status_code != 206:
                    if r.status_code == 200:
                        print("Server returned 200 OK. Restarting from zero.")
                        current_size = 0
                        with open(FINAL_ZIP, "wb") as f: pass
                    else:
                        print(f"Unexpected status code: {r.status_code}")
                        return False
                
                with open(FINAL_ZIP, "ab") as f:
                    for chunk in r.iter_content(chunk_size=8*1024*1024):
                        if chunk:
                            f.write(chunk)
                            current_size += len(chunk)
            
            if current_size >= total_size:
                break
        except Exception as e:
            retries += 1
            time.sleep(2**retries)
            print(f"\nRetry {retries} after error: {e}")
            current_size = FINAL_ZIP.stat().st_size if FINAL_ZIP.exists() else 0

    if FINAL_ZIP.exists() and FINAL_ZIP.stat().st_size == total_size:
        print("\nDOWNLOAD_SUCCESS")
        return True
    return False

if __name__ == "__main__":
    if resumable_download():
        print("RDD download completed successfully.")
    else:
        print("RDD download failed.")
