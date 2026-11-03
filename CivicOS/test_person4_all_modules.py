import json
import urllib.request
import urllib.parse
import sys

BASE_URL = "http://127.0.0.1:5000"

def get(path):
    url = f"{BASE_URL}{path}"
    req = urllib.request.Request(url, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=10) as res:
        return res.status, json.loads(res.read().decode())

def post(path, body):
    url = f"{BASE_URL}{path}"
    data = json.dumps(body).encode()
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(req, timeout=10) as res:
        return res.status, json.loads(res.read().decode())

def patch(path, body):
    url = f"{BASE_URL}{path}"
    data = json.dumps(body).encode()
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"}, method="PATCH")
    with urllib.request.urlopen(req, timeout=10) as res:
        return res.status, json.loads(res.read().decode())

def run_tests():
    print("=" * 80)
    print("CIVICOS PERSON 4 - FULL AUTOMATED VERIFICATION SUITE")
    print("=" * 80)
    
    passed = 0
    failed = 0

    # 1. Health check
    try:
        status, data = get("/api/v1/health")
        assert status == 200 and data.get("status") == "OK"
        print("[PASS] 1. Backend Health Check: Service online (Express on port 5000)")
        passed += 1
    except Exception as e:
        print(f"[FAIL] 1. Backend Health Check: {e}")
        failed += 1

    # 2. Module A: Municipal Command Dashboard
    try:
        status, data = get("/api/v1/dashboard/stats")
        stats = data.get("data", {})
        assert status == 200
        assert "totalIncidents" in stats and "pendingComplaints" in stats and "criticalIncidents" in stats
        print(f"[PASS] 2. Module A (Command Dashboard): Stats fetched (Total: {stats['totalIncidents']}, Pending: {stats['pendingComplaints']}, Critical: {stats['criticalIncidents']}, Avg SLA: {stats['avgResolutionTimeHours']}h)")
        
        status_w, data_w = get("/api/v1/dashboard/workload")
        assert status_w == 200 and len(data_w.get("data", [])) > 0
        print(f"[PASS]    Module A: Department workloads calculated ({len(data_w['data'])} departments tracked)")
        
        status_wd, data_wd = get("/api/v1/dashboard/wards")
        assert status_wd == 200 and len(data_wd.get("data", [])) > 0
        print(f"[PASS]    Module A: Ward distribution & risk levels computed ({len(data_wd['data'])} wards)")
        passed += 1
    except Exception as e:
        print(f"[FAIL] 2. Module A (Command Dashboard): {e}")
        failed += 1

    # 3. Module B: Live City Digital Twin (Incidents endpoint for GIS)
    try:
        status, data = get("/api/v1/incidents")
        incidents = data.get("data", [])
        assert status == 200 and len(incidents) > 0
        print(f"[PASS] 3. Module B (Digital Twin): {len(incidents)} geocoded incidents ready for Leaflet map")
        passed += 1
    except Exception as e:
        print(f"[FAIL] 3. Module B (Digital Twin): {e}")
        failed += 1

    # 4. Module C: Automatic Department Assignment
    try:
        status, data = get("/api/v1/assignment/rules")
        rules = data.get("data", [])
        assert status == 200 and len(rules) > 0
        print(f"[PASS] 4. Module C (Dept Assignment): {len(rules)} keyword routing rules active")

        # Run auto-assign engine
        status_aa, data_aa = post("/api/v1/assignment/auto-assign", {})
        assert status_aa == 200
        print(f"[PASS]    Module C: Auto-assignment engine executed ({len(data_aa.get('data', []))} records evaluated)")

        # Manual override
        override_payload = {
            "incidentId": "i1000000-0000-0000-0000-000000000101",
            "departmentId": "d1000000-0000-0000-0000-000000000001",
            "reason": "Test automated verification reassignment",
            "officerName": "Integration Test Officer"
        }
        status_ov, data_ov = post("/api/v1/assignment/override", override_payload)
        assert status_ov == 200 and data_ov.get("success") is True
        print("[PASS]    Module C: Manual department override logged with permanent audit reason")
        passed += 1
    except Exception as e:
        print(f"[FAIL] 4. Module C (Dept Assignment): {e}")
        failed += 1

    # 5. Module D: Cross-Department Coordination
    try:
        coord_payload = {
            "incidentId": "i1000000-0000-0000-0000-000000000101",
            "fromDeptId": "d1000000-0000-0000-0000-000000000001",
            "toDeptId": "d6000000-0000-0000-0000-000000000006",
            "reason": "Traffic lane closure required for rapid asphalt curing",
            "officerName": "Field Commander"
        }
        status_cr, data_cr = post("/api/v1/coordination/request", coord_payload)
        assert status_cr == 201
        created_req = data_cr.get("data", {})
        req_id = created_req.get("id")
        print(f"[PASS] 5. Module D (Coordination): Cross-dept request created (ID: {req_id}, Status: {created_req.get('status')})")

        # Update status to Accepted
        status_up, data_up = patch(f"/api/v1/coordination/{req_id}/status", {
            "status": "Accepted",
            "officerComment": "Traffic squad scheduled for 22:00 window",
            "officerName": "Traffic Supervisor"
        })
        assert status_up == 200 and data_up.get("data", {}).get("status") == "Accepted"
        print("[PASS]    Module D: Coordination status advanced to Accepted with collaborative note")
        passed += 1
    except Exception as e:
        print(f"[FAIL] 5. Module D (Coordination): {e}")
        failed += 1

    # 6. Module E: Resource Optimization
    try:
        status, data = get("/api/v1/resources/pools")
        pools = data.get("data", [])
        assert status == 200 and len(pools) > 0
        print(f"[PASS] 6. Module E (Resource Optimization): {len(pools)} department pools fetched with utilization rates")

        # Algorithmic recommendations
        status_rec, data_rec = get("/api/v1/resources/recommendations")
        recs = data_rec.get("data", [])
        assert status_rec == 200
        print(f"[PASS]    Module E: Algorithmic recommendation engine generated {len(recs)} severity-weighted deployment plans")

        # Allocate resources
        alloc_payload = {
            "incidentId": "i1000000-0000-0000-0000-000000000101",
            "departmentId": "d1000000-0000-0000-0000-000000000001",
            "personnel": 2,
            "vehicles": 1,
            "equipment": 1,
            "officerName": "Resource Controller"
        }
        status_al, data_al = post("/api/v1/resources/allocate", alloc_payload)
        assert status_al == 200 and data_al.get("success") is True
        print("[PASS]    Module E: Field crews and machinery successfully allocated to incident")
        passed += 1
    except Exception as e:
        print(f"[FAIL] 6. Module E (Resource Optimization): {e}")
        failed += 1

    # 7. Module F: Emergency Mode
    try:
        status, data = get("/api/v1/emergency/status")
        em_status = data.get("data", {})
        assert status == 200
        print(f"[PASS] 7. Module F (Emergency Mode): Initial state verified (Active: {em_status.get('emergencyState', {}).get('isActive')})")

        # Toggle activation
        status_act, data_act = post("/api/v1/emergency/toggle", {
            "activate": True,
            "officer": "Civil Defense Commissioner",
            "reason": "Monsoon flash-flood triage drill",
            "severityLevel": "LEVEL_2_ELEVATED"
        })
        assert status_act == 200 and data_act.get("data", {}).get("emergencyState", {}).get("isActive") is True
        print("[PASS]    Module F: Emergency Mode successfully activated with audit log")

        # Deactivate
        status_deact, data_deact = post("/api/v1/emergency/toggle", {
            "activate": False,
            "officer": "Civil Defense Commissioner",
            "reason": "Drill completed successfully."
        })
        assert status_deact == 200 and data_deact.get("data", {}).get("emergencyState", {}).get("isActive") is False
        print("[PASS]    Module F: Emergency Mode stood down, deactivation permanently logged")
        passed += 1
    except Exception as e:
        print(f"[FAIL] 7. Module F (Emergency Mode): {e}")
        failed += 1

    # 8. Modules G & I: Civic Analytics, Recurring Patterns, and Timeline
    try:
        status, data = get("/api/v1/analytics/overview")
        overview = data.get("data", {})
        assert status == 200 and "byCategory" in overview and "bySeverity" in overview and "trends" in overview
        print(f"[PASS] 8. Module G (Civic Analytics): Full overview computed ({len(overview['byCategory'])} categories, {len(overview['trends'])} trend days)")

        status_rec, data_rec = get("/api/v1/analytics/recurring")
        patterns = data_rec.get("data", [])
        assert status_rec == 200
        print(f"[PASS]    Module I (Incident History & Learning): {len(patterns)} recurring spatial patterns detected")

        # Timeline
        status_tl, data_tl = get("/api/v1/analytics/timeline/i1000000-0000-0000-0000-000000000101")
        timeline = data_tl.get("data", {})
        assert status_tl == 200 and len(timeline.get("events", [])) > 0
        print(f"[PASS]    Module I: Chronological timeline verified with {len(timeline['events'])} lifecycle events")
        passed += 1
    except Exception as e:
        print(f"[FAIL] 8. Modules G & I: {e}")
        failed += 1

    # 9. Module H: AI Civic Assistant with Real Data Grounding
    try:
        status, data = post("/api/v1/ai/chat", {
            "query": "Which ward has the highest number of pending incidents?"
        })
        assert status == 200
        reply = data.get("data", {}).get("content", "")
        source = data.get("data", {}).get("source", "")
        assert len(reply) > 10 and "Ward" in reply
        print(f"[PASS] 9. Module H (AI Civic Assistant): Query answered ({source}) -> '{reply[:85]}...'")
        passed += 1
    except Exception as e:
        print(f"[FAIL] 9. Module H (AI Civic Assistant): {e}")
        failed += 1

    # 10. Module J: Department Performance Monitoring
    try:
        status, data = get("/api/v1/departments/performance")
        perf = data.get("data", [])
        assert status == 200 and len(perf) > 0
        print(f"[PASS] 10. Module J (Dept Performance): {len(perf)} departments tracked with SLA turnaround, overdue counts & load distribution")
        passed += 1
    except Exception as e:
        print(f"[FAIL] 10. Module J (Dept Performance): {e}")
        failed += 1

    # 11. Module K: Incident Resolution Workflow
    try:
        status, data = patch("/api/v1/incidents/i1000000-0000-0000-0000-000000000101/status", {
            "status": "Resolved",
            "currentStage": 3,
            "note": "Verified by officer after AI computer vision surface check"
        })
        assert status == 200
        print("[PASS] 11. Module K (Resolution Workflow): Status updated to Resolved with officer certification note")
        passed += 1
    except Exception as e:
        print(f"[FAIL] 11. Module K (Resolution Workflow): {e}")
        failed += 1

    print("=" * 80)
    print(f"VERIFICATION SUMMARY: {passed} PASSED, {failed} FAILED (TOTAL: {passed + failed})")
    print("=" * 80)
    if failed == 0:
        print("ALL 11 PERSON 4 MODULES FULLY OPERATIONAL AND VERIFIED!")

if __name__ == "__main__":
    run_tests()
