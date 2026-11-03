const { spawn } = require('child_process');
const http = require('http');

async function runBrowserTest() {
  console.log('Starting full browser end-to-end user interaction test...');
  const chromeProc = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--headless=new',
    '--disable-gpu',
    '--remote-debugging-port=9222',
    '--no-first-run',
    '--no-default-browser-check',
    '--user-data-dir=' + require('os').tmpdir() + '/chrome-e2e-' + Math.random().toString(36).slice(2)
  ]);

  let page = null;
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 300));
    try {
      const data = await new Promise((resolve, reject) => {
        http.get('http://127.0.0.1:9222/json/list', res => {
          let buf = '';
          res.on('data', c => buf += c);
          res.on('end', () => resolve(JSON.parse(buf)));
        }).on('error', reject);
      });
      if (data && Array.isArray(data)) {
        page = data.find(t => t.type === 'page' && t.webSocketDebuggerUrl);
        if (page) break;
      }
    } catch {}
  }

  if (!page) {
    console.error('Failed to connect to Chrome debugging port');
    chromeProc.kill();
    return;
  }

  const ws = new WebSocket(page.webSocketDebuggerUrl);
  let msgId = 1;
  const callbacks = new Map();
  function send(method, params = {}) {
    const id = msgId++;
    return new Promise(resolve => {
      callbacks.set(id, resolve);
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && callbacks.has(msg.id)) {
      const cb = callbacks.get(msg.id);
      callbacks.delete(msg.id);
      cb(msg.result);
    }
  };

  await new Promise(r => ws.onopen = r);

  await send('Runtime.enable');
  await send('Page.enable');
  await send('DOM.enable');

  console.log('[Step 1] Navigating to http://127.0.0.1:5173/officer/road-repair ...');
  await send('Page.navigate', { url: 'http://127.0.0.1:5173/officer/road-repair' });
  await new Promise(r => setTimeout(r, 2500));

  // Check initial render
  const initialCheck = await send('Runtime.evaluate', {
    expression: `({
      hasTitle: document.body.innerText.includes('Road Repair Verification & Comparison'),
      hasSelector: document.body.innerText.includes('Active Complaint:'),
      hasSampleButtons: document.body.innerText.includes('Clean Repaired Road'),
      complaintOptionsCount: document.querySelectorAll('select option').length
    })`,
    returnByValue: true
  });
  console.log('[Step 2] Initial Page State:', initialCheck.result.value);

  // Click the "🟢 1. Clean Repaired Road" sample button
  console.log('[Step 3] Clicking sample button "🟢 1. Clean Repaired Road"...');
  await send('Runtime.evaluate', {
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const sampleBtn = btns.find(b => b.innerText.includes('Clean Repaired Road'));
      if (sampleBtn) sampleBtn.click();
      return !!sampleBtn;
    })()`,
    returnByValue: true
  });

  await new Promise(r => setTimeout(r, 1000));

  // Check that the preview loaded
  const previewCheck = await send('Runtime.evaluate', {
    expression: `({
      hasPreviewReady: document.body.innerText.includes('Corrected Proof Ready'),
      buttonEnabled: !document.querySelector('button[disabled]')
    })`,
    returnByValue: true
  });
  console.log('[Step 4] Image Upload Preview State:', previewCheck.result.value);

  // Click "Run AI Road Repair Verification"
  console.log('[Step 5] Triggering "Run AI Road Repair Verification"...');
  await send('Runtime.evaluate', {
    expression: `(() => {
      const runBtn = document.getElementById('btn-run-verification');
      if (runBtn) runBtn.click();
      return !!runBtn;
    })()`,
    returnByValue: true
  });

  // Poll until #ai-verification-report appears (up to 8 seconds)
  let reportFound = false;
  for (let i = 0; i < 16; i++) {
    await new Promise(r => setTimeout(r, 500));
    const check = await send('Runtime.evaluate', {
      expression: `!!document.getElementById('ai-verification-report')`,
      returnByValue: true
    });
    if (check.result?.value) {
      reportFound = true;
      break;
    }
  }

  // Verify findings card, metrics, and side-by-side viewer
  const resultCheck = await send('Runtime.evaluate', {
    expression: `({
      hasReport: !!document.getElementById('ai-verification-report'),
      hasAppearsRepairedBadge: document.body.innerText.includes('Appears Repaired'),
      hasConfidenceMetric: document.body.innerText.includes('AI VERIFICATION CONFIDENCE'),
      hasDamagePersistenceMetric: document.body.innerText.includes('DAMAGE PERSISTENCE'),
      hasSSIMMetric: document.body.innerText.includes('STRUCTURAL SIMILARITY'),
      hasApproveButton: !!document.getElementById('btn-approve-repair'),
      hasMapCanvas: document.querySelectorAll('.leaflet-container').length > 0
    })`,
    returnByValue: true
  });
  console.log('[Step 6] AI Verification UI Rendered Results:', resultCheck.result.value);

  // Click "Approve Repair & Close Complaint"
  console.log('[Step 7] Testing Officer Decision click: "Approve Repair & Close Complaint"...');
  await send('Runtime.evaluate', {
    expression: `(() => {
      const approveBtn = document.getElementById('btn-approve-repair');
      if (approveBtn) approveBtn.click();
      return !!approveBtn;
    })()`,
    returnByValue: true
  });

  await new Promise(r => setTimeout(r, 1200));

  const decisionCheck = await send('Runtime.evaluate', {
    expression: `({
      hasSuccessBanner: !!document.getElementById('decision-success-banner'),
      successText: document.getElementById('decision-success-banner')?.innerText?.slice(0, 100) || ''
    })`,
    returnByValue: true
  });
  console.log('[Step 8] Officer Decision Result:', decisionCheck.result.value);

  ws.close();
  chromeProc.kill();

  const allPassed =
    initialCheck.result.value.hasTitle &&
    previewCheck.result.value.hasPreviewReady &&
    resultCheck.result.value.hasReport &&
    resultCheck.result.value.hasAppearsRepairedBadge &&
    decisionCheck.result.value.hasSuccessBanner;

  console.log('\n===========================================================================');
  console.log(`BROWSER E2E INTERACTION RESULT: ${allPassed ? 'ALL PASSED (100%)' : 'SOME CHECKS FAILED'}`);
  console.log('===========================================================================');
  process.exit(allPassed ? 0 : 1);
}

runBrowserTest();
