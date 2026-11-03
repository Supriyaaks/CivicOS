import urllib.request
import urllib.error
import ssl
import json
from pathlib import Path

env_file = Path("civicos_person1/civicos/.env")
lines = dict(l.split("=", 1) for l in env_file.read_text().splitlines() if "=" in l)
url = lines.get("VITE_SUPABASE_URL", "").strip()
key = lines.get("VITE_SUPABASE_ANON_KEY", "").strip()
ctx = ssl.create_default_context()

endpoints = [
    "/rest/v1/",
    "/storage/v1/bucket",
    "/auth/v1/settings",
    "/rest/v1/complaints?select=*",
    "/rest/v1/profiles?select=*",
    "/rest/v1/departments?select=*",
    "/rest/v1/assignments?select=*",
    "/rest/v1/audit_logs?select=*"
]

print(f"Testing Supabase Instance: {url}")
for ep in endpoints:
    req = urllib.request.Request(
        url + ep,
        headers={"apikey": key, "Authorization": f"Bearer {key}"}
    )
    try:
        res = urllib.request.urlopen(req, context=ctx, timeout=5)
        print(f"[{res.status}] {ep} -> {res.read().decode('utf-8')[:100]}")
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        print(f"[{e.code}] {ep} -> {body[:150]}")
    except Exception as ex:
        print(f"[ERR] {ep} -> {ex}")
