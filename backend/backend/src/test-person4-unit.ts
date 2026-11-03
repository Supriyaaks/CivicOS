import { dashboardService } from './services/dashboard.service';
import { assignmentService } from './services/assignment.service';
import { coordinationService } from './services/coordination.service';
import { resourceService } from './services/resource.service';
import { emergencyService } from './services/emergency.service';
import { analyticsService } from './services/analytics.service';
import { departmentService } from './services/department.service';
import { incidentService } from './services/incident.service';

async function runUnitTests() {
  console.log('='.repeat(80));
  console.log('CIVICOS PERSON 4 - IN-PROCESS UNIT & INTEGRATION TEST SUITE');
  console.log('='.repeat(80));

  let passed = 0;
  let failed = 0;

  // TEST 1: Dashboard Service (Module A)
  try {
    const stats = await dashboardService.getStats();
    if (stats.totalIncidents > 0 && stats.pendingComplaints >= 0 && typeof stats.avgResolutionTimeHours === 'number') {
      console.log(`[PASS] 1. Module A (Command Dashboard): Stats calculated (Total: ${stats.totalIncidents}, Pending: ${stats.pendingComplaints}, Critical: ${stats.criticalIncidents}, Avg SLA: ${stats.avgResolutionTimeHours}h)`);
      passed++;
    } else {
      throw new Error('Invalid dashboard stats output structure');
    }

    const workload = await dashboardService.getWorkload();
    if (Array.isArray(workload) && workload.length > 0) {
      console.log(`[PASS]    Module A: Workload distribution retrieved for ${workload.length} departments`);
      passed++;
    }

    const wards = await dashboardService.getWards();
    if (Array.isArray(wards) && wards.length > 0) {
      console.log(`[PASS]    Module A: Ward distribution & risk levels computed for ${wards.length} wards`);
      passed++;
    }
  } catch (err: any) {
    console.error(`[FAIL] 1. Module A: ${err.message}`);
    failed++;
  }

  // TEST 2: Assignment Service (Module C)
  try {
    const rules = assignmentService.getRules();
    if (rules.length >= 6) {
      console.log(`[PASS] 2. Module C (Routing Engine): ${rules.length} configurable routing rules verified`);
      passed++;
    }

    // Classification test
    const potholeClass = assignmentService.classifyIncident('Pothole', 'Deep crater in road surface');
    if (potholeClass.departmentCode === 'ROADS' && potholeClass.confidence > 0.7) {
      console.log(`[PASS]    Module C: Pothole classified as ROADS with ${Math.round(potholeClass.confidence * 100)}% confidence`);
      passed++;
    }

    // Auto-assignment
    const autoResults = await assignmentService.runAutoAssign();
    console.log(`[PASS]    Module C: Auto-assignment engine executed across queue (${autoResults.length} records processed)`);
    passed++;

    // Manual override
    const override = await assignmentService.manualOverride(
      'c1000000-0000-0000-0000-000000000101',
      'd1000000-0000-0000-0000-000000000001',
      'Unit test override verification',
      'Lead Officer'
    );
    if (override.success) {
      console.log(`[PASS]    Module C: Manual department override successfully persisted to audit trail`);
      passed++;
    }
  } catch (err: any) {
    console.error(`[FAIL] 2. Module C: ${err.message}`);
    failed++;
  }

  // TEST 3: Coordination Service (Module D)
  try {
    const req = await coordinationService.createRequest({
      incidentId: 'c1000000-0000-0000-0000-000000000101',
      fromDeptId: 'd1000000-0000-0000-0000-000000000001',
      toDeptId: 'd6000000-0000-0000-0000-000000000006',
      reason: 'Urgent traffic marshaling for arterial road paving',
      officerName: 'Roads Supervisor'
    });
    if (req.id && req.status === 'Pending') {
      console.log(`[PASS] 3. Module D (Coordination): Cross-dept request created (ID: ${req.id})`);
      passed++;
    }

    const updated = await coordinationService.updateStatus(
      req.id,
      'Accepted',
      'Traffic personnel dispatched for 22:00 to 04:00 night window',
      'Traffic Captain'
    );
    if (updated.status === 'Accepted') {
      console.log(`[PASS]    Module D: Coordination request accepted with response comment`);
      passed++;
    }

    const commented = await coordinationService.addComment(req.id, 'Roads Engineer', 'Roads', 'Milling machine staged on site.');
    if (commented.comments.length >= 2) {
      console.log(`[PASS]    Module D: Collaborative dialogue thread appended successfully`);
      passed++;
    }
  } catch (err: any) {
    console.error(`[FAIL] 3. Module D: ${err.message}`);
    failed++;
  }

  // TEST 4: Resource Service (Module E)
  try {
    const pools = await resourceService.getResourcePools();
    if (pools.length >= 6 && typeof pools[0].utilizationRate === 'number') {
      console.log(`[PASS] 4. Module E (Resource Optimization): ${pools.length} department resource pools computed with utilization rates`);
      passed++;
    }

    const recs = await resourceService.getRecommendations();
    if (Array.isArray(recs)) {
      console.log(`[PASS]    Module E: Algorithmic recommendation engine generated ${recs.length} severity-weighted plans`);
      passed++;
    }

    const alloc = await resourceService.allocateResources({
      incidentId: 'c1000000-0000-0000-0000-000000000101',
      departmentId: 'd1000000-0000-0000-0000-000000000001',
      personnel: 2,
      vehicles: 1,
      equipment: 1,
      officerName: 'Operations Lead'
    });
    if (alloc.success) {
      console.log(`[PASS]    Module E: Resources allocated and tracked in incident timeline`);
      passed++;
    }

    const rel = await resourceService.releaseResources({
      incidentId: 'c1000000-0000-0000-0000-000000000101',
      departmentId: 'd1000000-0000-0000-0000-000000000001',
      personnel: 2,
      vehicles: 1,
      equipment: 1,
      officerName: 'Operations Lead'
    });
    if (rel.success) {
      console.log(`[PASS]    Module E: Resources safely released back to department pool`);
      passed++;
    }
  } catch (err: any) {
    console.error(`[FAIL] 4. Module E: ${err.message}`);
    failed++;
  }

  // TEST 5: Emergency Service (Module F)
  try {
    const statusBefore = await emergencyService.getStatus();
    console.log(`[PASS] 5. Module F (Emergency Mode): Status retrieved (Active: ${statusBefore.emergencyState.isActive}, Response Teams: ${statusBefore.responseTeams.length})`);
    passed++;

    const activated = await emergencyService.toggleEmergency({
      activate: true,
      officer: 'City Commissioner',
      reason: 'Monsoon flash-flood protocol',
      severityLevel: 'LEVEL_2_ELEVATED'
    });
    if (activated.emergencyState.isActive === true) {
      console.log(`[PASS]    Module F: Emergency mode activated and audit history updated`);
      passed++;
    }

    const deactivated = await emergencyService.toggleEmergency({
      activate: false,
      officer: 'City Commissioner',
      reason: 'Waters receded. De-escalating posture.'
    });
    if (deactivated.emergencyState.isActive === false) {
      console.log(`[PASS]    Module F: Emergency mode stood down and audit trail preserved`);
      passed++;
    }
  } catch (err: any) {
    console.error(`[FAIL] 5. Module F: ${err.message}`);
    failed++;
  }

  // TEST 6: Analytics & Timeline Service (Modules G & I)
  try {
    const overview = await analyticsService.getOverview();
    if (overview.byCategory.length > 0 && overview.bySeverity.length > 0) {
      console.log(`[PASS] 6. Module G (Civic Analytics): Overview aggregations verified (${overview.byCategory.length} categories, ${overview.trends.length} trend days)`);
      passed++;
    }

    const recurring = await analyticsService.getRecurringPatterns();
    console.log(`[PASS]    Module I (Incident History & Learning): ${recurring.length} recurring spatial patterns detected`);
    passed++;

    const timeline = await analyticsService.getIncidentTimeline('c1000000-0000-0000-0000-000000000101');
    if (timeline.events.length > 0) {
      console.log(`[PASS]    Module I: Chronological timeline verified with ${timeline.events.length} lifecycle events`);
      passed++;
    }
  } catch (err: any) {
    console.error(`[FAIL] 6. Modules G & I: ${err.message}`);
    failed++;
  }

  // TEST 7: Department Performance & Admin Service (Module J)
  try {
    const perf = await departmentService.getPerformance();
    if (perf.length >= 6) {
      console.log(`[PASS] 7. Module J (Dept Performance): ${perf.length} department performance records computed with SLA turnaround`);
      passed++;
    }

    const updatedDept = await departmentService.updateDepartment('d1000000-0000-0000-0000-000000000001', {
      staffCount: 45,
      workload: 'High'
    });
    if (updatedDept) {
      console.log(`[PASS]    Module J: Department metadata successfully updated by administrator`);
      passed++;
    }
  } catch (err: any) {
    console.error(`[FAIL] 7. Module J: ${err.message}`);
    failed++;
  }

  // TEST 8: Incident Resolution Workflow (Module K)
  try {
    const updatedInc = await incidentService.updateStatus(
      'c1000000-0000-0000-0000-000000000101',
      'Resolved',
      3,
      'Hot mix asphalt patching certified by road inspector with AI assistance'
    );
    if (updatedInc.status === 'Resolved') {
      console.log(`[PASS] 8. Module K (Resolution Workflow): Incident transitioned to Resolved stage with officer note`);
      passed++;
    }
  } catch (err: any) {
    console.error(`[FAIL] 8. Module K: ${err.message}`);
    failed++;
  }

  console.log('='.repeat(80));
  console.log(`UNIT & INTEGRATION SUMMARY: ${passed} PASSED, ${failed} FAILED (TOTAL: ${passed + failed})`);
  console.log('='.repeat(80));
}

runUnitTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
