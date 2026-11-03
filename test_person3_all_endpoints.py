import requests
import json
import time

endpoints = [
    ('GET', 'http://127.0.0.1:8001/', None),
    ('GET', 'http://127.0.0.1:8001/health', None),
    ('GET', 'http://127.0.0.1:8001/relationships?incident_id=INC-1001', None),
    ('GET', 'http://127.0.0.1:8001/relationships?limit=10', None),
    ('GET', 'http://127.0.0.1:8001/api/geospatial/hotspots?eps_km=1.5&min_samples=2', None),
    ('GET', 'http://127.0.0.1:8001/api/geospatial/map-layers?min_severity=6.0', None),
    ('POST', 'http://127.0.0.1:8001/api/predict/risk', {
        'incident_type': 'Water Main Break',
        'category': 'Utilities',
        'zone': 'Central Zone',
        'severity_score': 8.5,
        'impact_radius_meters': 1200,
        'affected_population': 9000,
        'rainfall_mm': 40.0,
        'wind_speed_kmh': 20.0,
        'temperature_c': 25.0
    }),
    ('GET', 'http://127.0.0.1:8001/api/predict/model-metrics', None),
    ('POST', 'http://127.0.0.1:8001/cascade', {
        'incident_id': 'INC-1001',
        'incident_type': 'Water Main Break',
        'severity_score': 8.5,
        'rainfall_mm': 30.0,
        'wind_speed_kmh': 15.0,
        'cascading_risk_flag': 1
    }),
    ('POST', 'http://127.0.0.1:8001/api/scoring/evaluate', {
        'severity_score': 8.5,
        'impact_radius_meters': 1500,
        'affected_population': 12000,
        'cascading_risk_flag': 1
    }),
    ('POST', 'http://127.0.0.1:8001/api/simulation/what-if', {
        'incident_id': 'INC-1001',
        'scenario_params': {'additional_rainfall': 40.0}
    }),
    ('POST', 'http://127.0.0.1:8001/api/recommendations/actions', {
        'incident_id': 'INC-1001'
    }),
    ('POST', 'http://127.0.0.1:8001/intelligence/prevention-impact', {
        'incident_id': 'INC-1001',
        'intervention_name': 'drainage_clearance'
    }),
    ('POST', 'http://127.0.0.1:8001/api/weather/analyze', {
        'rainfall_mm': 65.0,
        'wind_speed_kmh': 40.0,
        'temperature_c': 23.0,
        'humidity_pct': 80.0
    }),
    ('POST', 'http://127.0.0.1:8001/intelligence/analyze', {
        'incident_id': 'INC-1001'
    }),
    ('GET', 'http://127.0.0.1:8001/api/location/options', None),
    ('GET', 'http://127.0.0.1:8001/api/location/zone?zone=South%20Zone', None),
    ('GET', 'http://127.0.0.1:8001/api/location/ward?ward=Ward-101%20(MG%20Road)', None),
    ('GET', 'http://127.0.0.1:8001/api/location/radius?latitude=12.9716&longitude=77.5946&radius_km=3.0', None),
    ('GET', 'http://127.0.0.1:8001/api/location/bounding-box?min_lat=12.90&min_lon=77.55&max_lat=13.00&max_lon=77.65', None),
    ('GET', 'http://127.0.0.1:8001/api/location/summary/zone?zone=South%20Zone', None),
    ('GET', 'http://127.0.0.1:8001/api/location/summary/ward?ward=Ward-101%20(MG%20Road)', None),
    ('GET', 'http://127.0.0.1:8001/api/incidents/summary', None),
    ('POST_FILE', 'http://127.0.0.1:8001/api/verify/repair', {'incident_id': 'INC-1001', 'repair_details': 'Bitumen resurfacing complete'}),
]

passed = 0
results = []
for method, url, body in endpoints:
    path = url.split(':8001')[1]
    start = time.time()
    try:
        if method == 'GET':
            r = requests.get(url, timeout=5)
        elif method == 'POST_FILE':
            import io
            from PIL import Image
            img = Image.new('RGB', (256, 256), color=(73, 109, 137))
            buf = io.BytesIO()
            img.save(buf, format='JPEG')
            files = {'file': ('test.jpg', buf.getvalue(), 'image/jpeg')}
            r = requests.post(url, data=body, files=files, timeout=5)
        else:
            r = requests.post(url, json=body, timeout=5)
        dur = round((time.time() - start) * 1000, 1)
        if r.status_code == 200:
            passed += 1
            print(f"[PASS] {method} {path} ({dur}ms)")
            results.append({"method": method, "path": path, "status": "PASS", "durationMs": dur})
        else:
            print(f"[FAIL] {method} {path} ({r.status_code}) ({dur}ms): {r.text[:100]}")
            results.append({"method": method, "path": path, "status": "FAIL", "durationMs": dur, "error": r.text[:100]})
    except Exception as e:
        dur = round((time.time() - start) * 1000, 1)
        print(f"[ERROR] {method} {path} ({dur}ms): {e}")
        results.append({"method": method, "path": path, "status": "ERROR", "durationMs": dur, "error": str(e)})

print(f"\n==========================================")
print(f"Total Tested: {len(endpoints)} | Passed: {passed}/{len(endpoints)} ({round(passed/len(endpoints)*100, 1)}%)")
print(f"==========================================")

with open('p3_feature_audit_results.json', 'w') as f:
    json.dump({"total": len(endpoints), "passed": passed, "results": results}, f, indent=2)
