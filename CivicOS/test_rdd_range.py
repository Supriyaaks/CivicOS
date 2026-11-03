import requests

url = "https://bigdatacup.s3.ap-northeast-1.amazonaws.com/2022/CRDDC2022/RDD2022/Country_Specific_Data_CRDDC2022/RDD2022_India.zip"
headers = {"Range": "bytes=0-1023"}

try:
    response = requests.get(url, headers=headers, timeout=10)
    print(f"Status Code: {response.status_code}")
    print(f"Content-Range: {response.headers.get('Content-Range')}")
    print(f"Content-Length: {response.headers.get('Content-Length')}")
    print(f"RESULT: {'Range support confirmed' if response.status_code == 206 else 'Range not supported'}")
except Exception as e:
    print(f"ERROR: {e}")
