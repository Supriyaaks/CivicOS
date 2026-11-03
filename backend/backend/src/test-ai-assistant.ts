import { aiGroundingService } from './services/ai-grounding.service';
import { aiService } from './ai/ai.service';
import { municipalStore } from './store/municipal.store';

async function runAIAssistantTests() {
  console.log('================================================================================');
  console.log('CIVICOS AI CIVIC OPERATIONS ASSISTANT - DATABASE GROUNDING TEST SUITE');
  console.log('================================================================================');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}${detail ? ` -> ${detail}` : ''}`);
      failed++;
    }
  }

  // 1. Data Connectivity & Source Detection
  const cityData = await aiGroundingService.getLiveCityData();
  assert(
    cityData.dataSource === 'PostgreSQL' || cityData.dataSource === 'Resilience Store',
    '1. Data Source Detection',
    `Source: ${cityData.dataSource}`
  );
  assert(cityData.totalCount >= 6, '   Total incidents loaded from database layer', `Count: ${cityData.totalCount}`);
  assert(cityData.departments.length >= 6, '   Departments loaded from database layer', `Count: ${cityData.departments.length}`);

  // 2. Status Probe Verification (Separate truthful indicators)
  const ollamaStatus = await aiService.checkAIAvailability();
  assert(
    typeof ollamaStatus.available === 'boolean',
    '2. Ollama Status Check (Truthful availability)',
    `Available: ${ollamaStatus.available}, Model: ${ollamaStatus.model}`
  );

  // 3. Required Test Query 1: "Which incidents require multiple departments?"
  console.log('\n--- TESTING QUERY 1: Multi-department Incidents ---');
  const q1 = await aiGroundingService.resolveGroundedQuery('Which incidents require multiple departments?');
  assert(
    q1.recordsReferenced.includes('INC-101') && q1.recordsReferenced.includes('INC-104'),
    '3. Query 1: Correct multi-department incident codes returned (INC-101, INC-104)',
    `Referenced: ${q1.recordsReferenced.join(', ')}`
  );
  assert(
    q1.content.includes('Traffic & Public Safety') && q1.content.includes('Roads & Infrastructure'),
    '   Query 1: Supporting departments correctly identified in response text'
  );
  console.log('Sample Output snippet:\n' + q1.content.split('\n').slice(0, 5).join('\n'));

  // 4. Required Test Query 2: "How many incidents are currently unassigned?"
  console.log('\n--- TESTING QUERY 2: Unassigned Incidents ---');
  const q2 = await aiGroundingService.resolveGroundedQuery('How many incidents are currently unassigned?');
  assert(
    q2.recordsReferenced.includes('INC-105'),
    '4. Query 2: Unassigned incident INC-105 identified',
    `Referenced: ${q2.recordsReferenced.join(', ')}`
  );
  assert(
    q2.content.includes('unassigned') && q2.content.includes('Fallen Tree & Debris'),
    '   Query 2: Unassigned count and description correctly returned'
  );
  console.log('Sample Output snippet:\n' + q2.content.split('\n').slice(0, 5).join('\n'));

  // 5. Required Test Query 3: "Which department has the highest workload?"
  console.log('\n--- TESTING QUERY 3: Department Workload ---');
  const q3 = await aiGroundingService.resolveGroundedQuery('Which department has the highest workload?');
  assert(
    q3.content.includes('Roads & Infrastructure'),
    '5. Query 3: Highest workload department correctly identified (Roads & Infrastructure)',
    `Top Dept found in response`
  );
  assert(
    q3.content.includes('active ticket'),
    '   Query 3: Workload ranking breakdown included in answer'
  );
  console.log('Sample Output snippet:\n' + q3.content.split('\n').slice(0, 5).join('\n'));

  // 6. Required Test Query 4: "Show high-priority incidents."
  console.log('\n--- TESTING QUERY 4: High-Priority Incidents ---');
  const q4 = await aiGroundingService.resolveGroundedQuery('Show high-priority incidents.');
  assert(
    q4.recordsReferenced.includes('INC-101') && q4.recordsReferenced.includes('INC-102'),
    '6. Query 4: High-priority incidents filtered accurately',
    `Referenced: ${q4.recordsReferenced.join(', ')}`
  );
  assert(
    q4.content.includes('Critical') && q4.content.includes('High'),
    '   Query 4: Priority & severity indicators included'
  );
  console.log('Sample Output snippet:\n' + q4.content.split('\n').slice(0, 5).join('\n'));

  // 7. Required Test Query 5: General civic operations question
  console.log('\n--- TESTING QUERY 5: General Civic Operations ---');
  const q5 = await aiGroundingService.resolveGroundedQuery('What is the current municipal operational summary?');
  assert(
    q5.content.includes('Total Logged Incidents') && q5.content.includes('Critical Severity Hazards'),
    '7. Query 5: Comprehensive operational overview generated',
    `Overview snippet verified`
  );
  console.log('Sample Output snippet:\n' + q5.content.split('\n').slice(0, 5).join('\n'));

  // 8. Ward Breakdown Query
  const qWard = await aiGroundingService.resolveGroundedQuery('Which wards have the highest incident counts?');
  assert(
    qWard.content.includes('Ward 14'),
    '8. Ward Query: Ward 14 identified with highest pending issues'
  );

  // 9. Fleet & Resources Query
  const qFleet = await aiGroundingService.resolveGroundedQuery('What resources are currently available in the fleet?');
  assert(
    qFleet.content.includes('Available Field Workers') && qFleet.content.includes('Available Vehicles'),
    '9. Resource Query: Central pool and department vehicles verified'
  );

  // 10. Resilience test: Empty query handling
  const qEmpty = await aiGroundingService.resolveGroundedQuery('');
  assert(
    qEmpty.content.length > 0 && qEmpty.dataSource.length > 0,
    '10. Resilience: Graceful handling of empty or general prompt'
  );

  console.log('\n================================================================================');
  console.log(`AI CIVIC ASSISTANT TEST SUMMARY: ${passed} PASSED, ${failed} FAILED (TOTAL: ${passed + failed})`);
  console.log('================================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runAIAssistantTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
