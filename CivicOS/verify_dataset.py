import hashlib
import zipfile
import os
from pathlib import Path

FILE_PATH = Path("ai_engine/datasets/raw/Urban_Community_Issues_clean/Data_sets_clean.zip.part")
EXPECTED_SIZE = 703063005
EXPECTED_MD5 = "d1560309bf372b14c896113722ae2532"
EXTRACT_DIR = Path("ai_engine/datasets/raw/Urban_Community_Issues_clean/extracted")

def verify():
    if not FILE_PATH.exists():
        print("FILE_NOT_FOUND")
        return False

    # Size check
    actual_size = FILE_PATH.stat().st_size
    print(f"Actual Size: {actual_size}")
    if actual_size != EXPECTED_SIZE:
        print(f"SIZE_MISMATCH: {actual_size} != {EXPECTED_SIZE}")
        return False
    print("SIZE_MATCHED")

    # MD5 check
    print("Calculating MD5...")
    hash_md5 = hashlib.md5()
    with open(FILE_PATH, "rb") as f:
        for chunk in iter(lambda: f.read(4096), b""):
            hash_md5.update(chunk)
    actual_md5 = hash_md5.hexdigest()
    print(f"Actual MD5: {actual_md5}")
    if actual_md5 != EXPECTED_MD5:
        print(f"MD5_MISMATCH: {actual_md5} != {EXPECTED_MD5}")
        return False
    print("MD5_MATCHED")

    # ZIP Integrity check
    try:
        with zipfile.ZipFile(FILE_PATH, "r") as z:
            bad_file = z.testzip()
            if bad_file:
                print(f"ZIP_CORRUPT: {bad_file}")
                return False
        print("ZIP_INTEGRITY_PASSED")
    except Exception as e:
        print(f"ZIP_ERROR: {e}")
        return False

    return True

if __name__ == "__main__":
    if verify():
        print("VERIFICATION_SUCCESS")
    else:
        print("VERIFICATION_FAILED")
