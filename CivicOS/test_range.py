import requests

url = "https://zenodo.org/records/18871460/files/Data_sets.zip?download=1"
headers = {"Range": "bytes=0-1023"}

try:
    response = requests.get(url, headers=headers, timeout=10)
    print(f"Status Code: {response.status_code}")
    print(f"Content-Range: {response.headers.get('Content-Range')}")
    print(f"Content-Length: {response.headers.get('Content-Length')}")
    print(f"ETag: {response.headers.get('ETag')}")
    print(f"Last-Modified: {response.headers.get('Last-Modified')}")
    
    if response.status_code == 206:
        print("RESULT: Range support confirmed (206 Partial Content).")
    else:
        print(f"RESULT: Range support not confirmed. Status code: {response.status_code}")
except Exception as e:
    print(f"ERROR: {e}")
