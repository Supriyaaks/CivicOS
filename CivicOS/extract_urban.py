import zipfile
import os
import time

zip_path = "ai_engine/datasets/raw/Urban_Community_Issues/Data_sets_new.zip"
extract_path = "ai_engine/datasets/raw/Urban_Community_Issues/extracted"

print(f"Testing archive: {zip_path}")

try:
    # Try to open the zip file. If it's locked, this may still fail.
    with zipfile.ZipFile(zip_path, "r") as zip_ref:
        print("ZIP archive is valid and openable.")
        
        # Check for ZipSlip (suspicious paths)
        for member in zip_ref.namelist():
            if ".." in member or member.startswith("/"):
                print(f"Suspicious path found: {member}")
                exit(1)
        
        # Extract
        zip_ref.extractall(extract_path)
        print(f"Successfully extracted to {extract_path}")

except PermissionError:
    print("ERROR: Permission denied. The file is still locked by another process.")
except zipfile.BadZipFile:
    print("ERROR: The ZIP file is corrupted or not a valid archive.")
except Exception as e:
    print(f"ERROR: An unexpected error occurred: {e}")
