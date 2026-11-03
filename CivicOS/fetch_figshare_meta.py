import requests
import json

ARTICLE_ID = "21431547"
API_URL = f"https://api.figshare.com/v2/articles/{ARTICLE_ID}"

try:
    response = requests.get(API_URL, timeout=10)
    if response.status_code == 200:
        data = response.json()
        print(f"ARTICLE_TITLE: {data.get('title')}")
        print(f"LICENSE: {data.get('license')}")
        
        files = data.get('files', [])
        print("\n--- Available Files ---")
        for file in files:
            print(f"File: {file.get('name')} | Size: {file.get('size')} | ID: {file.get('id')}")
    else:
        print(f"API_ERROR: {response.status_code} {response.text}")
except Exception as e:
    print(f"API_EXCEPTION: {e}")
