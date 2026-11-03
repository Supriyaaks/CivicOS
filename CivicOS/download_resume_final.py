import requests
import os
import time
from pathlib import Path

URL = "https://zenodo.org/records/18871460/files/Data_sets.zip?download=1"
FINAL_ZIP = Path("ai_engine/datasets/raw/Urban_Community_Issues_fresh/Data_sets_final.zip")
EXPECTED_SIZE = 703063005

def resume_download():
    # 1. Determine existing size
    current_size = FINAL_ZIP.stat().st_size if FINAL_ZIP.exists() else 0
    print(f"Resuming from: {current_size} bytes")
    
    # 2. Get metadata for current download
    try:
        r_head = requests.head(URL, timeout=10)
        total_size = int(r_head.headers.get("content-length", 0))
        if total_size == 0:
            # Fallback for servers that don't support HEAD
            r_init = requests.get(URL, headers={"Range": "bytes=0-0"}, timeout=10)
            total_size = int(r_init.headers.get("content-range", "0").split("/")[-1])
        
        if total_size != EXPECTED_SIZE:
            print(f"WARNING: Remote size {total_size} differs from expected {EXPECTED_SIZE}")
    except Exception as e:
        print(f"Metadata Error: {e}")
        return

    # 3. Download loop with Range requests
    retries = 0
    max_retries = 10
    
    while current_size < total_size:
        try:
            headers = {"Range": f"bytes={current_size}-"}
            with requests.get(URL, headers=headers, stream=True, timeout=60) as r:
                if r.status_code != 206:
                    print(f"Server returned {r.status_code} instead of 206. Restarting...")
                    current_size = 0 # Reset if server doesn't support range
                    headers = {}
                else:
                    # Validate Content-Range header
                    content_range = r.headers.get("Content-Range", "")
                    if "bytes" not in content_range:
                        print("Invalid Content-Range header.")
                        break
                
                with open(FINAL_ZIP, "ab") as f:
                    for chunk in r.iter_content(chunk_size=1024*1024):
                        if chunk:
                            f.write(chunk)
                            current_size += len(chunk)
                            # print(f"Downloaded: {current_size}/{total_size}") # Avoid spamming output
            
            if current_size >= total_size:
                break
        except Exception as e:
        # Sleep and retry on connection drops
            retries += 1
            time.sleep(2 ** retries)
            print(f"Retry {retries}/{max_retries} after error: {e}")
            if retries >= max_retries:
                print("Max retries reached.")
                break

    # Final check
    if FINAL_ZIP.stat().st_size == EXPECTED_SIZE:
        print("DOWNLOAD_COMPLETE")
    else:
        print(f"DOWNLOAD_INCOMPLETE: {FINAL_ZIP.stat().st_size}/{EXPECTED_SIZE}")

if __name__ == "__main__":
    resume_download()
