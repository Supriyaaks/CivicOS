"""
CivicOS - Complete Municipal Officer Dashboard End-to-End Workflow Verification
Runs full 22-step integration test across all 4 modules:
Frontend (5173), Express Backend (5000), PostgreSQL (5432), Person 2 AI (8000), Person 3 Predictive (8001).
"""

import sys
import os
import json
import time
import io
import requests
from PIL import Image

FRONTEND_URL = "http://127.0.0.1:5173"
BACKEND_URL = "http://127.0.0.1:5000"
AI_ENGINE_URL = "http://127.0.0.1:8000"
P3_URL = "http://127.0.0.1:8001"

TEST_INCIDENT_CODE = f"INC-AUDIT-OFFICER-{int(time.time()) % 10000}"

results = []

def record(step: int, name: str, passed: bool, details: dict = None, error: str = None):
    status = "PASS" if passed else "FAIL"
    item = {
        "step": step,
        "name": name,
        "status": status,
        "details": details or {},
        "error": error
    }
    results.append(item)
    print(f"[{status}] Step {step:02d}: {name}")
    if error:
        print(f"       ERROR: {error}")
    elif details:
        preview = str(details)[:120]
        print(f"       INFO: {preview}")

def run_all_tests():
    print("======================================================================")
    print(" CIVICOS MUNICIPAL OFFICER DASHBOARD COMPLETE FUNCTIONALITY AUDIT")
    print("======================================================================")

    # 1. Health & PostgreSQL Connection
    try:
        r = requests.get(f"{BACKEND_URL}/api/v1/health", timeout=5)
        d = r.json()
        assert r.status_code == 200
        assert d["database"]["status"] == "connected"
        assert d["database"]["fallbackActive"] is False
        record(1, "PostgreSQL Database Connection & Backend Health", True, d["database"])
    except Exception as e:
        record(1, "PostgreSQL Database Connection & Backend Health", False, error=str(e))

    # 2. Municipal Overview Stats
    try:
        r = requests.get(f"{BACKEND_URL}/api/v1/dashboard/stats", timeout=5)
        d = r.json()
        assert r.status_code == 200
        stats = d.get("data") or d
        assert "totalIncidents" in stats
        record(2, "Municipal Overview KPI Statistics (from PostgreSQL)", True, stats)
    except Exception as e:
        record(2, "Municipal Overview KPI Statistics (from PostgreSQL)", False, error=str(e))

    # 3. Department Workload
    try:
        r = requests.get(f"{BACKEND_URL}/api/v1/dashboard/workload", timeout=5)
        d = r.json()
        assert r.status_code == 200
        workload = d.get("data") or d
        assert len(workload) > 0
        record(3, "Department Workload Breakdown", True, {"departmentCount": len(workload)})
    except Exception as e:
        record(3, "Department Workload Breakdown", False, error=str(e))

    # 4. Ward Distribution
    try:
        r = requests.get(f"{BACKEND_URL}/api/v1/dashboard/wards", timeout=5)
        d = r.json()
        assert r.status_code == 200
        wards = d.get("data") or d
        record(4, "Ward Distribution Analysis", True, {"wardCount": len(wards)})
    except Exception as e:
        record(4, "Ward Distribution Analysis", False, error=str(e))

    # 5. Retrieve Incidents List
    try:
        r = requests.get(f"{BACKEND_URL}/api/v1/incidents", timeout=5)
        d = r.json()
        assert r.status_code == 200
        incidents = d.get("data") or []
        assert len(incidents) >= 17
        record(5, "Incident Retrieval from PostgreSQL", True, {"totalIncidents": len(incidents)})
    except Exception as e:
        record(5, "Incident Retrieval from PostgreSQL", False, error=str(e))

    # 6. Create Designated Audit Test Incident
    created_id = None
    try:
        payload = {
            "incidentCode": TEST_INCIDENT_CODE,
            "category": "Pothole",
            "description": "Officer Audit Test: Large arterial crater on MG Road Junction creating hazard.",
            "location": "MG Road & 4th Cross, Ward 14",
            "latitude": 12.9716,
            "longitude": 77.5946,
            "ward": "Ward 14",
            "severity": "High",
            "priority": "Medium",
            "status": "Pending",
            "currentStage": 1,
            "aiConfidence": "89%"
        }
        r = requests.post(f"{BACKEND_URL}/api/v1/incidents", json=payload, timeout=5)
        assert r.status_code in [200, 201]
        data = r.json().get("data") or r.json()
        created_id = data.get("id") or data.get("incidentCode")
        record(6, "Create Designated Audit Test Incident", True, {"id": created_id, "code": TEST_INCIDENT_CODE})
    except Exception as e:
        record(6, "Create Designated Audit Test Incident", False, error=str(e))

    # 7. Retrieve Incident Details
    try:
        r = requests.get(f"{BACKEND_URL}/api/v1/incidents/{TEST_INCIDENT_CODE}", timeout=5)
        assert r.status_code == 200
        inc = r.json().get("data")
        assert inc["incidentCode"] == TEST_INCIDENT_CODE
        record(7, "Incident Details Retrieval", True, {"code": inc["incidentCode"], "status": inc["status"]})
    except Exception as e:
        record(7, "Incident Details Retrieval", False, error=str(e))

    # 8. Person 2 AI YOLO Inference Test
    try:
        # Create test image buffer
        img = Image.new("RGB", (256, 256), color=(70, 70, 70))
        buf = io.BytesIO()
        img.save(buf, format="JPEG")
        buf.seek(0)

        files = {"image": ("test_pothole.jpg", buf, "image/jpeg")}
        data = {"reported_category": "Pothole", "report_id": TEST_INCIDENT_CODE}
        r = requests.post(f"{AI_ENGINE_URL}/api/reports/process", files=files, data=data, timeout=8)
        assert r.status_code == 200
        ai_resp = r.json()
        record(8, "Person 2 AI Vision Detection & Verification", True, {
            "orchestrator_processed": True,
            "category": ai_resp.get("category"),
            "verification_status": ai_resp.get("verification", {}).get("status")
        })
    except Exception as e:
        record(8, "Person 2 AI Vision Detection & Verification", False, error=str(e))

    # 9. Department Assignment & Override
    try:
        r_dept = requests.get(f"{BACKEND_URL}/api/v1/departments", timeout=5)
        depts = r_dept.json().get("data")
        roads_dept = next((d for d in depts if "road" in d["name"].lower()), depts[0])

        override_payload = {
            "incidentId": TEST_INCIDENT_CODE,
            "departmentId": roads_dept["id"],
            "reason": "Officer triage assignment to Roads & Infrastructure",
            "officerName": "Chief Municipal Officer"
        }
        r_ov = requests.post(f"{BACKEND_URL}/api/v1/assignment/override", json=override_payload, timeout=5)
        assert r_ov.status_code == 200
        record(9, "Assign Incident to Department (Auto-Routing & Override)", True, {
            "department": roads_dept["name"],
            "deptId": roads_dept["id"]
        })
    except Exception as e:
        record(9, "Assign Incident to Department (Auto-Routing & Override)", False, error=str(e))

    # 10. Verify Assignment Persisted in PostgreSQL
    try:
        r = requests.get(f"{BACKEND_URL}/api/v1/incidents/{TEST_INCIDENT_CODE}", timeout=5)
        inc = r.json().get("data")
        assert inc["departmentId"] is not None
        record(10, "PostgreSQL Direct Assignment Persistence Verification", True, {
            "incidentCode": inc["incidentCode"],
            "departmentId": inc["departmentId"]
        })
    except Exception as e:
        record(10, "PostgreSQL Direct Assignment Persistence Verification", False, error=str(e))

    # 11. Priority Update
    try:
        r = requests.patch(f"{BACKEND_URL}/api/v1/incidents/{TEST_INCIDENT_CODE}", json={"priority": "Critical"}, timeout=5)
        assert r.status_code == 200
        inc = r.json().get("data")
        assert inc["priority"] == "Critical"
        record(11, "Incident Priority Update (Critical Escalation)", True, {"priority": inc["priority"]})
    except Exception as e:
        record(11, "Incident Priority Update (Critical Escalation)", False, error=str(e))

    # 12. Status Transition to InProgress
    try:
        r = requests.patch(f"{BACKEND_URL}/api/v1/incidents/{TEST_INCIDENT_CODE}/status", json={
            "status": "InProgress",
            "currentStage": 2,
            "note": "Field dispatch team mobilized with patch vehicle"
        }, timeout=5)
        assert r.status_code == 200
        inc = r.json().get("data")
        assert inc["status"] == "InProgress"
        record(12, "Incident Status Transition (Pending -> InProgress)", True, {
            "status": inc["status"],
            "stage": inc["currentStage"]
        })
    except Exception as e:
        record(12, "Incident Status Transition (Pending -> InProgress)", False, error=str(e))

    # 13. Person 3 Predictive Risk Analysis
    try:
        risk_payload = {
            "incidentId": TEST_INCIDENT_CODE,
            "incidentType": "Pothole / Road Damage",
            "category": "Infrastructure",
            "zone": "Central Zone",
            "severityScore": 8.0,
            "rainfallMm": 35.0
        }
        r = requests.post(f"{BACKEND_URL}/api/v1/predictive/risk", json=risk_payload, timeout=6)
        assert r.status_code == 200
        risk_data = r.json().get("data")
        record(13, "Person 3 Predictive Risk Scoring & PostgreSQL Update", True, {
            "riskTier": risk_data.get("prediction", {}).get("risk_tier"),
            "probability": risk_data.get("prediction", {}).get("cascading_probability")
        })
    except Exception as e:
        record(13, "Person 3 Predictive Risk Scoring & PostgreSQL Update", False, error=str(e))

    # 14. Person 3 Cascading Consequence Propagation
    try:
        cascade_payload = {
            "incidentId": TEST_INCIDENT_CODE,
            "incidentType": "Flooding / Waterlogging",
            "severityScore": 8.5,
            "rainfallMm": 50.0
        }
        r = requests.post(f"{BACKEND_URL}/api/v1/predictive/cascade", json=cascade_payload, timeout=6)
        assert r.status_code == 200
        casc_data = r.json().get("data", {}).get("cascade", {})
        record(14, "Person 3 Cascading Impact Propagation Tree", True, {
            "threatLevel": casc_data.get("overall_threat_level"),
            "totalConsequences": casc_data.get("total_consequences_predicted")
        })
    except Exception as e:
        record(14, "Person 3 Cascading Impact Propagation Tree", False, error=str(e))

    # 15. Person 3 Geospatial Hotspots
    try:
        r = requests.get(f"{BACKEND_URL}/api/v1/predictive/hotspots?eps_km=1.5&min_samples=3", timeout=6)
        assert r.status_code == 200
        hotspots = r.json().get("data")
        record(15, "Person 3 Geospatial DBSCAN Hotspot Clustering", True, {
            "clustersFound": hotspots.get("hotspots_detected_count"),
            "algorithm": hotspots.get("clustering_algorithm")
        })
    except Exception as e:
        record(15, "Person 3 Geospatial DBSCAN Hotspot Clustering", False, error=str(e))

    # 16. Person 3 What-If Scenario Simulation
    try:
        sim_payload = {
            "incidentId": TEST_INCIDENT_CODE,
            "scenarioParams": {"additional_rainfall": 45.0}
        }
        r = requests.post(f"{BACKEND_URL}/api/v1/predictive/simulation/what-if", json=sim_payload, timeout=8)
        assert r.status_code == 200
        sim_data = r.json().get("data")
        record(16, "Person 3 What-If Scenario Simulation on Live Incident", True, {
            "simulationId": sim_data.get("simulation_id"),
            "riskDirection": sim_data.get("risk_change_direction")
        })
    except Exception as e:
        record(16, "Person 3 What-If Scenario Simulation on Live Incident", False, error=str(e))

    # 17. Person 3 Preventive Action Recommendations
    try:
        rec_payload = {"incidentId": TEST_INCIDENT_CODE}
        r = requests.post(f"{BACKEND_URL}/api/v1/predictive/recommendations", json=rec_payload, timeout=8)
        assert r.status_code == 200
        rec_data = r.json().get("data")
        record(17, "Person 3 Preventive Action Recommendations", True, {
            "actionsCount": len(rec_data.get("recommendations", [])) if isinstance(rec_data, dict) else len(rec_data)
        })
    except Exception as e:
        record(17, "Person 3 Preventive Action Recommendations", False, error=str(e))

    # 18. Person 3 Weather Intelligence
    try:
        weather_payload = {"rainfallMm": 60.0, "windSpeedKmh": 45.0, "temperatureC": 24.0}
        r = requests.post(f"{BACKEND_URL}/api/v1/predictive/weather", json=weather_payload, timeout=6)
        assert r.status_code == 200
        w_data = r.json().get("data")
        record(18, "Person 3 Weather Risk Intelligence & Multiplier", True, {
            "threatLevel": w_data.get("threat_level"),
            "riskMultiplier": w_data.get("risk_multiplier")
        })
    except Exception as e:
        record(18, "Person 3 Weather Risk Intelligence & Multiplier", False, error=str(e))

    # 19. Submit Resolution Information
    try:
        res_payload = {
            "status": "Resolved",
            "currentStage": 3,
            "note": "Pothole filled with hot mix asphalt, vibratory rolled, and sealed. Road safe for traffic."
        }
        r = requests.patch(f"{BACKEND_URL}/api/v1/incidents/{TEST_INCIDENT_CODE}/status", json=res_payload, timeout=5)
        assert r.status_code == 200
        inc = r.json().get("data")
        assert inc["status"] == "Resolved"
        record(19, "Officer Resolution Submission & Certification", True, {
            "status": inc["status"],
            "resolutionDescription": inc.get("resolutionDescription")
        })
    except Exception as e:
        record(19, "Officer Resolution Submission & Certification", False, error=str(e))

    # 20. Road Repair AI Verification (Person 2)
    try:
        img_before = Image.new("RGB", (256, 256), color=(40, 40, 40))
        img_after = Image.new("RGB", (256, 256), color=(180, 180, 180))
        buf_b = io.BytesIO()
        img_before.save(buf_b, format="JPEG")
        buf_b.seek(0)
        buf_a = io.BytesIO()
        img_after.save(buf_a, format="JPEG")
        buf_a.seek(0)

        files = {
            "before_image": ("before.jpg", buf_b, "image/jpeg"),
            "after_image": ("after.jpg", buf_a, "image/jpeg")
        }
        data = {
            "report_id": TEST_INCIDENT_CODE,
            "latitude": "12.9716",
            "longitude": "77.5946",
            "repair_details": json.dumps({"materials": "Hot-Mix Asphalt", "contractor": "Apex Infra Ltd"})
        }
        r = requests.post(f"{AI_ENGINE_URL}/api/reports/road-repair-verify", files=files, data=data, timeout=8)
        assert r.status_code == 200
        rep_resp = r.json()
        record(20, "Road Repair AI Verification (Before vs After Evidence)", True, {
            "status": rep_resp.get("verification", {}).get("status"),
            "status_label": rep_resp.get("verification", {}).get("status_label")
        })
    except Exception as e:
        record(20, "Road Repair AI Verification (Before vs After Evidence)", False, error=str(e))

    # 21. Final PostgreSQL State Verification
    try:
        r = requests.get(f"{BACKEND_URL}/api/v1/incidents/{TEST_INCIDENT_CODE}", timeout=5)
        assert r.status_code == 200
        inc = r.json().get("data")
        assert inc["status"] == "Resolved"
        assert inc["resolutionDescription"] is not None
        record(21, "Final Incident State & PostgreSQL Persistence Verified", True, {
            "incidentCode": inc["incidentCode"],
            "status": inc["status"],
            "departmentId": inc["departmentId"],
            "resolutionDescription": inc["resolutionDescription"]
        })
    except Exception as e:
        record(21, "Final Incident State & PostgreSQL Persistence Verified", False, error=str(e))

    # 22. Frontend Route & Reverse Proxy Integrity
    try:
        r_home = requests.get(f"{FRONTEND_URL}/", timeout=5)
        assert r_home.status_code == 200
        r_officer = requests.get(f"{FRONTEND_URL}/officer", timeout=5)
        assert r_officer.status_code == 200
        r_mgmt = requests.get(f"{FRONTEND_URL}/officer/incidents", timeout=5)
        assert r_mgmt.status_code == 200
        record(22, "Frontend Route & Vite Reverse Proxy Integrity", True, {
            "home": r_home.status_code,
            "officerDashboard": r_officer.status_code,
            "incidentManagement": r_mgmt.status_code
        })
    except Exception as e:
        record(22, "Frontend Route & Vite Reverse Proxy Integrity", False, error=str(e))

    # 23. Person 3 Urban Infrastructure Relationship Graph & Root Cause Diagnostics
    try:
        r = requests.get(f"{BACKEND_URL}/api/v1/predictive/relationships?incident_id={TEST_INCIDENT_CODE}", timeout=6)
        assert r.status_code == 200
        rel_data = r.json().get("data")
        assert rel_data is not None
        assert "connected_incidents" in rel_data
        assert "graph_summary" in rel_data
        record(23, "Person 3 Urban Infrastructure Relationship Graph & Root-Cause Topology", True, {
            "targetIncident": rel_data.get("search_query"),
            "connectedNeighbors": rel_data.get("connected_incidents_count"),
            "graphNodes": rel_data.get("graph_summary", {}).get("total_nodes")
        })
    except Exception as e:
        record(23, "Person 3 Urban Infrastructure Relationship Graph & Root-Cause Topology", False, error=str(e))

    # 24. Cascading Risk Simulation Rerun with Custom Telemetry
    try:
        rerun_payload = {
            "incidentId": TEST_INCIDENT_CODE,
            "incidentType": "Flooding / Waterlogging",
            "severityScore": 8.8,
            "rainfallMm": 70.0,
            "windSpeedKmh": 40.0,
            "cascadingRiskFlag": 1
        }
        r = requests.post(f"{BACKEND_URL}/api/v1/predictive/cascade", json=rerun_payload, timeout=6)
        assert r.status_code == 200
        cascade_data = r.json().get("data", {}).get("cascade", {})
        assert "consequences" in cascade_data
        record(24, "Cascading Risk Simulation Rerun with Telemetry Controls", True, {
            "overallThreat": cascade_data.get("overall_threat_level"),
            "totalConsequences": cascade_data.get("total_consequences_predicted"),
            "weatherAmplified": cascade_data.get("weather_amplified")
        })
    except Exception as e:
        record(24, "Cascading Risk Simulation Rerun with Telemetry Controls", False, error=str(e))

    print("======================================================================")
    passed_count = sum(1 for r in results if r["status"] == "PASS")
    total_count = len(results)
    print(f" FINAL SUMMARY: {passed_count}/{total_count} WORKFLOW TESTS PASSED ({round(passed_count/total_count*100, 1)}%)")
    print("======================================================================")

    # Save results to json
    with open("CIVICOS_OFFICER_WORKFLOW_TEST_RESULTS.json", "w") as f:
        json.dump({
            "total": total_count,
            "passed": passed_count,
            "failed": total_count - passed_count,
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "results": results
        }, f, indent=2)

    return passed_count == total_count

if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)
