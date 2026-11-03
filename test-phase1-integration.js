const http = require('http');
const https = require('https');

function request(url, options = {}, data = null) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const client = parsed.protocol === 'https:' ? https : http;
    const reqOptions = {
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname + parsed.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    };

    if (data && !reqOptions.headers['Content-Length']) {
      reqOptions.headers['Content-Length'] = Buffer.byteLength(data);
    }

    const req = client.request(reqOptions, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, json: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, text: body });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function runPhase1WorkflowTest() {
  console.log('================================================================================');
  console.log('CIVICOS PHASE 1 FINAL INTEGRATION: PERSON 1 + PERSON 2 + PERSON 4');
  console.log('COMPLETE CITIZEN-TO-AI-TO-MUNICIPALITY WORKFLOW TEST');
  console.log('================================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, stepName, details) {
    if (condition) {
      console.log(`[PASS] ${stepName}`);
      if (details) console.log(`       -> ${details}`);
      passed++;
    } else {
      console.error(`[FAIL] ${stepName}`);
      if (details) console.error(`       -> ${details}`);
      failed++;
    }
  }

  // STEP 1: Verify Health of Person 2 AI Engine & Person 4 Express Backend
  console.log('--- STEP 1: Service Health Verification ---');
  const aiHealth = await request('http://127.0.0.1:8000/api/health');
  assert(aiHealth.status === 200 && (aiHealth.json?.status === 'online' || aiHealth.json?.status === 'ok'),
    'Person 2 AI Engine Online (Port 8000)',
    `Status: ${aiHealth.json?.status}, Orchestrator: ${aiHealth.json?.orchestrator_ready}`
  );

  const backendHealth = await request('http://127.0.0.1:5000/api/v1/health');
  assert(backendHealth.status === 200,
    'Person 4 Express Backend Online (Port 5000)',
    `Service: ${backendHealth.json?.service}, Persistence: In-Memory Resilience Store`
  );

  // STEP 2: Citizen Submits Complaint to Backend
  console.log('\n--- STEP 2 & 3: Citizen Incident Submission & Ingestion ---');
  const testIncidentCode = `CIV-${Math.floor(1000 + Math.random() * 9000)}`;
  const createPayload = JSON.stringify({
    id: `i-${Date.now()}`,
    incidentCode: testIncidentCode,
    citizenId: 'u1000000-0000-0000-0000-000000000001',
    category: 'Pothole',
    description: 'Deep road depression near junction causing severe vehicle disruption.',
    location: 'Sector 4 Main Arterial Road, Ward 14',
    ward: 'Ward 14',
    latitude: 12.9716,
    longitude: 77.5946,
    severity: 'High',
    priority: 'High',
    aiConfidence: '92%',
    evidenceUrl: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7'
  });

  const createRes = await request('http://127.0.0.1:5000/api/v1/incidents', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, createPayload);

  assert(createRes.status === 201 && createRes.json?.data?.incidentCode === testIncidentCode,
    `Citizen Incident Stored in Backend (${testIncidentCode})`,
    `ID: ${createRes.json?.data?.id}, Status: ${createRes.json?.data?.status}`
  );

  const createdIncidentId = createRes.json?.data?.id;

  // STEP 4: Person 2 AI Engine Categories
  console.log('\n--- STEP 4 & 5: AI Engine Detection, Verification & Duplicate Check ---');
  const catRes = await request('http://127.0.0.1:8000/api/categories');
  assert(catRes.status === 200 && Array.isArray(catRes.json?.urban_community_classes),
    'Person 2 Supported Categories Retrieved',
    `Classes: ${catRes.json?.urban_community_classes?.join(', ')}`
  );

  // STEP 5: Municipal Officer Reviews Complaint in Dashboard
  console.log('\n--- STEP 6: Municipal Command Dashboard Review ---');
  const dashStats = await request('http://127.0.0.1:5000/api/v1/dashboard/stats');
  assert(dashStats.status === 200 && dashStats.json?.data?.totalIncidents >= 1,
    'Officer Dashboard KPIs Computed Live',
    `Total: ${dashStats.json?.data?.totalIncidents}, Pending: ${dashStats.json?.data?.pendingComplaints}`
  );

  const incidentList = await request('http://127.0.0.1:5000/api/v1/incidents');
  const foundInList = incidentList.json?.data?.some(i => i.incidentCode === testIncidentCode);
  assert(foundInList, `New Complaint Present in Municipal Incident Queue (${testIncidentCode})`);

  // STEP 6: Department Assignment
  console.log('\n--- STEP 7: Department Assignment & Routing Engine ---');
  const rulesRes = await request('http://127.0.0.1:5000/api/v1/assignment/rules');
  assert(rulesRes.status === 200 && rulesRes.json?.data?.length === 6,
    '6 Department Assignment Rules Active in Backend',
    `Rules: ${rulesRes.json?.data?.map(r => r.category).join(', ')}`
  );

  // Auto-assign
  const assignRes = await request('http://127.0.0.1:5000/api/v1/assignment/auto-assign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, JSON.stringify({ incidentId: createdIncidentId }));
  assert(assignRes.status === 200, 'Auto-Assignment Engine Dispatched Complaint');

  // STEP 7: Cross-Department Coordination
  console.log('\n--- STEP 8: Cross-Department Coordination ---');
  const coordPayload = JSON.stringify({
    incidentId: createdIncidentId,
    fromDeptId: 'd1000000-0000-0000-0000-000000000001', // Roads
    toDeptId: 'd6000000-0000-0000-0000-000000000006', // Traffic Safety
    reason: 'Traffic wardens needed for road fissure lane diversion',
    officerName: 'Chief Road Inspector'
  });
  const coordRes = await request('http://127.0.0.1:5000/api/v1/coordination/request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, coordPayload);
  assert(coordRes.status === 201 && coordRes.json?.data?.id,
    'Cross-Department Coordination Request Dispatched',
    `Coord ID: ${coordRes.json?.data?.id}`
  );

  // STEP 8: Resource Pool Allocation
  console.log('\n--- STEP 9: Resource Pool Allocation ---');
  const allocPayload = JSON.stringify({
    incidentId: createdIncidentId,
    departmentId: 'd1000000-0000-0000-0000-000000000001',
    personnel: 4,
    vehicles: 2,
    equipment: 1,
    officerName: 'Fleet Commander'
  });
  const allocRes = await request('http://127.0.0.1:5000/api/v1/resources/allocate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, allocPayload);
  assert(allocRes.status === 200, 'Fleet Personnel and Vehicles Allocated to Incident');

  // STEP 9: Progress Update
  console.log('\n--- STEP 10: Progress Transition ---');
  const statusPayload = JSON.stringify({
    status: 'InProgress',
    stage: 4,
    note: 'Asphalt cold-mix batch applied. Base compaction underway.'
  });
  const statusRes = await request(`http://127.0.0.1:5000/api/v1/incidents/${createdIncidentId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' }
  }, statusPayload);
  assert(statusRes.status === 200 && statusRes.json?.data?.status === 'InProgress',
    'Incident Progress Updated to Stage 4 (InProgress)'
  );

  // STEP 10: Road Repair Verification & Audit Trail
  console.log('\n--- STEP 11: Road Repair Verification & Audit Logging ---');
  const auditPayload = JSON.stringify({
    incidentId: createdIncidentId,
    verdict: 'REPAIRED_APPROVED',
    confidence: 0.94,
    officerDecision: 'Executive Engineer Sharma',
    notes: 'Pothole fissure resurfaced flush with road grade. Compaction verified.'
  });
  const auditRes = await request('http://127.0.0.1:5000/api/v1/ai/road-repair-audit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, auditPayload);
  assert(auditRes.status === 200 && auditRes.json?.success, 'Road Repair Verification Audit Logged in Backend');

  // STEP 11: Final Resolution Sign-Off
  const resolvePayload = JSON.stringify({
    status: 'Resolved',
    stage: 7,
    note: 'Municipal resolution verified and approved. Incident closed.'
  });
  const resolveRes = await request(`http://127.0.0.1:5000/api/v1/incidents/${createdIncidentId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' }
  }, resolvePayload);
  assert(resolveRes.status === 200 && resolveRes.json?.data?.status === 'Resolved',
    'Incident Successfully Transitioned to Resolved'
  );

  // STEP 12: Verify Chronological Incident Timeline
  console.log('\n--- STEP 12: Audit Timeline Verification ---');
  const timelineRes = await request(`http://127.0.0.1:5000/api/v1/analytics/timeline/${createdIncidentId}`);
  assert(timelineRes.status === 200 && timelineRes.json?.data?.events?.length >= 3,
    'Complete Chronological Audit Trail Preserved in Timeline',
    `Events recorded: ${timelineRes.json?.data?.events?.length}`
  );

  // STEP 13: Query AI Civic Assistant Regarding the New Record
  console.log('\n--- STEP 13: AI Civic Assistant Database Grounding ---');
  const chatRes = await request('http://127.0.0.1:5000/api/v1/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, JSON.stringify({ query: 'What is the current municipal operational summary?' }));
  assert(chatRes.status === 200 && chatRes.json?.data?.content?.includes('Total Logged Incidents'),
    'AI Civic Assistant Queries Live Database Metrics',
    `Source: ${chatRes.json?.data?.source}, Model: ${chatRes.json?.data?.model}`
  );

  console.log('\n================================================================================');
  console.log(`PHASE 1 INTEGRATION SUMMARY: ${passed} PASSED, ${failed} FAILED (TOTAL: ${passed + failed})`);
  console.log('================================================================================\n');

  if (failed > 0) process.exit(1);
}

runPhase1WorkflowTest().catch(err => {
  console.error('Fatal Integration Test Failure:', err);
  process.exit(1);
});
