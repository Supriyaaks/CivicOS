import requests
import json

print('1. Checking GET /api/v1/health ...')
r_health = requests.get('http://127.0.0.1:5000/api/v1/health', timeout=5)
print('HEALTH STATUS:', r_health.status_code)
h_data = r_health.json()
print(json.dumps(h_data, indent=2))
assert h_data['database']['status'] == 'connected', 'Database not connected!'
assert h_data['database']['fallbackActive'] == False, 'fallbackActive is True!'

print('\n2. Checking GET /api/v1/incidents ...')
r_inc = requests.get('http://127.0.0.1:5000/api/v1/incidents', timeout=5)
print('INCIDENTS STATUS:', r_inc.status_code)
inc_data = r_inc.json()
incidents = inc_data.get('data') or inc_data.get('incidents') or []
print(f'Total incidents retrieved after backend restart: {len(incidents)}')

# Check test incident INC-4187 exists
test_found = any(i.get('incidentCode') == 'INC-4187' for i in incidents)
print('Test incident INC-4187 found:', test_found)
assert test_found, 'Test incident INC-4187 was not found after restart!'

# Check original 9 incidents are present
original_codes = ['INC-101', 'INC-102', 'INC-103', 'INC-104', 'INC-105', 'INC-106', 'INC-840', 'INC-303', 'INC-380']
for code in original_codes:
    found = any(i.get('incidentCode') == code for i in incidents)
    status_label = 'FOUND' if found else 'MISSING'
    print(f' - {code}: {status_label}')
    assert found, f'Incident {code} is missing!'

print('\nPERSISTENCE RESTART TEST 100% SUCCESSFUL!')
