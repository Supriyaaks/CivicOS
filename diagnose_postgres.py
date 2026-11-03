import os
import subprocess
import socket

print("--- 1. POSTGRESQL 18 DIRECTORY INSPECTION ---")
pg_base = r"C:\Program Files\PostgreSQL\18"
if os.path.exists(pg_base):
    print(f"{pg_base} exists. Contents: {os.listdir(pg_base)}")
    data_dir = os.path.join(pg_base, "data")
    if os.path.exists(data_dir):
        print(f"Data dir exists: {data_dir}. Items: {len(os.listdir(data_dir))}")
        for f in ["postgresql.conf", "pg_hba.conf", "PG_VERSION", "postmaster.pid", "current_logfiles", "log"]:
            fp = os.path.join(data_dir, f)
            print(f"  {f}: exists = {os.path.exists(fp)}")
    else:
        print("Data dir does not exist!")
else:
    print(f"{pg_base} does NOT exist!")

print("\n--- 2. POSTGRES BINARY SEARCH ---")
found_bins = []
for search_dir in [r"C:\Program Files\PostgreSQL", r"C:\Program Files", r"C:\Users\WCT\AppData\Local\Programs"]:
    if os.path.exists(search_dir):
        for root, dirs, files in os.walk(search_dir):
            if "postgres.exe" in files or "pg_ctl.exe" in files or "psql.exe" in files:
                found_bins.append((root, [f for f in ["postgres.exe", "pg_ctl.exe", "psql.exe"] if f in files]))
            dirs[:] = [d for d in dirs if not any(x in d.lower() for x in ["node_modules", ".git", "cache", "temp"])]
print("Found PostgreSQL binary directories:", found_bins)

print("\n--- 3. WINDOWS SERVICES CHECK ---")
try:
    p = subprocess.run(["powershell", "-NoProfile", "-Command", "Get-Service | Where-Object { $_.Name -like '*postgre*' -or $_.DisplayName -like '*postgre*' }"], capture_output=True, text=True)
    print("PostgreSQL Services Output:\n", p.stdout.strip() if p.stdout.strip() else "None found via Get-Service")
except Exception as e:
    print("Get-Service error:", e)

print("\n--- 4. PORT 5432 OCCUPANCY ---")
sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
sock.settimeout(1.0)
res = sock.connect_ex(("127.0.0.1", 5432))
sock.close()
print("Port 5432 status:", "OCCUPIED/LISTENING" if res == 0 else "FREE (not listening)")

print("\n--- 5. DOCKER DESKTOP OPERATIONAL STATUS ---")
try:
    p = subprocess.run(["docker", "ps", "-a"], capture_output=True, text=True)
    if p.returncode == 0:
        print("Docker containers:\n", p.stdout.strip())
    else:
        print("Docker returned error:\n", p.stderr.strip()[:200])
except Exception as e:
    print("Docker exception:", e)
