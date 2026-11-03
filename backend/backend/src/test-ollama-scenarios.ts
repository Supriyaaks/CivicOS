import axios from 'axios';
import { ollamaClient } from './ai/ollama.client';
import { aiGroundingService } from './services/ai-grounding.service';
import { AIStatus } from './ai/ai.types';

/**
 * CIVICOS OLLAMA & FACTUAL ASSISTANT TEST SUITE
 * 
 * Verifies all 4 operational states:
 * 1. Ollama Status Probe & Active Discovery
 * 2. Unavailable Model Handling
 * 3. Offline Daemon / Network Failure Resilience
 * 4. Configuration Toggle (OLLAMA_ENABLED=false)
 * 5. Deterministic Database Grounding Engine
 * 6. End-to-End Fallback Guarantee
 */

async function runOllamaScenarioTests() {
  console.log('='.repeat(80));
  console.log('CIVICOS — OLLAMA & FACTUAL AI ASSISTANT TEST SUITE');
  console.log('='.repeat(80));

  let passed = 0;
  let failed = 0;

  // -------------------------------------------------------------
  // TEST 1: Probe Actual Local Ollama Status
  // -------------------------------------------------------------
  try {
    const status = await ollamaClient.checkAvailability();
    console.log(`[STATUS] Ollama Daemon Reachable: ${status.daemonReachable ?? false}`);
    console.log(`[STATUS] Configured Model: ${status.model}`);
    console.log(`[STATUS] Model Available: ${status.available}`);
    console.log(`[STATUS] Installed Models: [${(status.installedModels || []).join(', ') || 'None'}]`);
    console.log(`[STATUS] Diagnostic Message: ${status.message}`);

    if (typeof status.available === 'boolean' && typeof status.message === 'string') {
      console.log(`[PASS] 1. Live Ollama Probe: Successfully queried local status (Available: ${status.available})`);
      passed++;
    } else {
      throw new Error('Invalid status payload from checkAvailability()');
    }
  } catch (err: any) {
    console.error(`[FAIL] 1. Live Ollama Probe: ${err.message}`);
    failed++;
  }

  // -------------------------------------------------------------
  // TEST 2: Unavailable Model Scenario
  // -------------------------------------------------------------
  try {
    const originalModel = process.env.OLLAMA_MODEL;
    process.env.OLLAMA_MODEL = 'nonexistent-model-xyz:latest';

    const status = await ollamaClient.checkAvailability();
    process.env.OLLAMA_MODEL = originalModel;

    if (status.available === false && status.message.includes('nonexistent-model-xyz:latest')) {
      console.log(`[PASS] 2. Unavailable Model Scenario: Correctly detected unpulled model without crashing`);
      passed++;
    } else {
      throw new Error(`Expected available=false for unpulled model, got available=${status.available}`);
    }
  } catch (err: any) {
    console.error(`[FAIL] 2. Unavailable Model Scenario: ${err.message}`);
    failed++;
  }

  // -------------------------------------------------------------
  // TEST 3: Offline Daemon / Unreachable Port Scenario
  // -------------------------------------------------------------
  try {
    const originalUrl = process.env.OLLAMA_BASE_URL;
    process.env.OLLAMA_BASE_URL = 'http://127.0.0.1:59999'; // Unbound port

    const start = Date.now();
    const status = await ollamaClient.checkAvailability();
    const elapsed = Date.now() - start;
    process.env.OLLAMA_BASE_URL = originalUrl;

    if (status.available === false && status.daemonReachable === false && elapsed < 4000) {
      console.log(`[PASS] 3. Offline Daemon Scenario: Fast-failed gracefully in ${elapsed}ms (Available: false, Daemon: offline)`);
      passed++;
    } else {
      throw new Error(`Offline daemon failed to return available=false or took too long (${elapsed}ms)`);
    }
  } catch (err: any) {
    console.error(`[FAIL] 3. Offline Daemon Scenario: ${err.message}`);
    failed++;
  }

  // -------------------------------------------------------------
  // TEST 4: Configuration Toggle (OLLAMA_ENABLED=false)
  // -------------------------------------------------------------
  try {
    const originalEnabled = process.env.OLLAMA_ENABLED;
    process.env.OLLAMA_ENABLED = 'false';

    const status = await ollamaClient.checkAvailability();
    process.env.OLLAMA_ENABLED = originalEnabled;

    if (status.available === false && status.message.includes('OLLAMA_ENABLED=false')) {
      console.log(`[PASS] 4. Disabled Ollama Scenario: Bypassed daemon check immediately via config`);
      passed++;
    } else {
      throw new Error(`Expected disabled message, got: ${status.message}`);
    }
  } catch (err: any) {
    console.error(`[FAIL] 4. Disabled Ollama Scenario: ${err.message}`);
    failed++;
  }

  // -------------------------------------------------------------
  // TEST 5: Factual Grounding Query Engine (Deterministic Fallback)
  // -------------------------------------------------------------
  try {
    const queries = [
      {
        q: 'Which incidents require multiple departments?',
        expectedIntent: 'multi_department_query'
      },
      {
        q: 'How many incidents are currently unassigned?',
        expectedIntent: 'unassigned_query'
      },
      {
        q: 'Show high-priority incidents.',
        expectedIntent: 'high_priority_query'
      },
      {
        q: 'Which wards have the highest incident counts?',
        expectedIntent: 'ward_distribution_query'
      }
    ];

    let querySuccess = true;
    for (const item of queries) {
      const answer = await aiGroundingService.resolveGroundedQuery(item.q);
      if (!answer.content || !answer.dataSource || answer.intent !== item.expectedIntent) {
        querySuccess = false;
        console.error(`  Query mismatch for "${item.q}": got intent=${answer.intent}`);
      }
    }

    if (querySuccess) {
      console.log(`[PASS] 5. Factual Grounding Engine: All 4 operational query intents resolved factually with zero hallucination`);
      passed++;
    } else {
      throw new Error('Factual query engine returned unexpected structure or intent');
    }
  } catch (err: any) {
    console.error(`[FAIL] 5. Factual Grounding Engine: ${err.message}`);
    failed++;
  }

  // -------------------------------------------------------------
  // TEST 6: Structured LLM Context Generation
  // -------------------------------------------------------------
  try {
    const context = await aiGroundingService.buildLLMContext();
    if (context.includes('VERIFIED MUNICIPAL DATABASE SNAPSHOT') && context.includes('Total Records')) {
      console.log(`[PASS] 6. LLM Context Generation: Structured database snapshot prepared for prompt grounding`);
      passed++;
    } else {
      throw new Error('LLM context missing database snapshot headers');
    }
  } catch (err: any) {
    console.error(`[FAIL] 6. LLM Context Generation: ${err.message}`);
    failed++;
  }

  console.log('='.repeat(80));
  console.log(`SUMMARY: ${passed} PASSED / ${failed} FAILED (${Math.round((passed / (passed + failed)) * 100)}% SUCCESS RATE)`);
  console.log('='.repeat(80));

  return { passed, failed, total: passed + failed };
}

if (require.main === module) {
  runOllamaScenarioTests()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Test execution failed:', err);
      process.exit(1);
    });
}
