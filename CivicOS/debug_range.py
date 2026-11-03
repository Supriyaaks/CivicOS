import requests

url = "https://bigdatacup.s3.ap-northeast-1.amazonaws.com/2022/CRDDC2022/RDD2022/Country_Specific_Data_CRDDC2022/RDD2022_India.zip"
headers = {"Range": "bytes=0-0"}

try:
    response = requests.get(url, headers=headers, timeout=10)
    print(f"Status Code: {response.status_code}")
    print(f"Headers: {dict(response.headers)}")
except Exception as e:
    print(f"ERROR: {e}")
