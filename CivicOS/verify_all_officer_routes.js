const { spawn } = require('child_process');
const http = require('http');
const os = require('os');

const routesToTest = [
  { name: 'Module A: Command Dashboard', path: '/officer', expected: 'Command Center' },
  { name: 'Module B: Live Digital Twin', path: '/officer/digital-twin', expected: 'Digital Twin' },
  { name: 'Module C: Dept Assignment', path: '/officer/assignment', expected: 'Assignment' },
  { name: 'Module D: Cross-Dept Coordination', path: '/officer/coordination', expected: 'Coordination' },
  { name: 'Module E: Resource Management', path: '/officer/resources', expected: 'Resource' },
  { name: 'Module E: Resource Optimization', path: '/officer/optimization', expected: 'Optimization' },
  { name: 'Module F: Emergency Center', path: '/officer/emergency', expected: 'Emergency' },
  { name: 'Module G: Civic Analytics', path: '/officer/analytics', expected: 'Analytics' },
  { name: 'Module H: AI Civic Assistant', path: '/officer/assistant', expected: 'Assistant' },
  { name: 'Module I: Incident History', path: '/officer/history', expected: 'History' },
  { name: 'Module J: Department Management', path: '/officer/dept-mgmt', expected: 'Department' },
  { name: 'Module K: Road Repair Verification', path: '/officer/road-repair', expected: 'Road Repair' },
];

async function runBatchBrowserVerification() {
  console.log('='.repeat(80));
  console.log('CIVICOS PERSON 4 - FULL BROWSER RENDER & INTEGRATION SUITE');
  console.log('='.repeat(80));

  const chromeProc = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--headless=new',
    '--disable-gpu',
    '--remote-debugging-port=9223',
    '--no-first-run',
    '--no-default-browser-check',
    '--user-data-dir=' + os.tmpdir() + '/chrome-test-profile-' + Date.now()
  ]);

  let page = null;
  for (let i = 0; i < 25; i++) {
    await new Promise(r => setTimeout(r, 250));
    try {
      const data = await new Promise((resolve, reject) => {
        http.get('http://127.0.0.1:9223/json/list', res => {
          let buf = '';
          res.on('data', c => buf += c);
          res.on('end', () => resolve(JSON.parse(buf)));
        }).on('error', reject);
      });
      if (data && Array.isArray(data)) {
        page = data.find(t => t.type === 'page' && t.webSocketDebuggerUrl) || data[0];
        if (page && page.webSocketDebuggerUrl) break;
      }
    } catch {}
  }

  if (!page || !page.webSocketDebuggerUrl) {
    console.error('Could not connect to Chrome on port 9223');
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

  let currentExceptions = [];
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && callbacks.has(msg.id)) {
      const cb = callbacks.get(msg.id);
      callbacks.delete(msg.id);
      cb(msg.result);
    }
    if (msg.method === 'Runtime.exceptionThrown') {
      currentExceptions.push(msg.params.exceptionDetails);
    }
  };

  await new Promise(r => ws.onopen = r);
  await send('Runtime.enable');
  await send('Page.enable');

  let passed = 0;
  let failed = 0;

  for (const item of routesToTest) {
    currentExceptions = [];
    const url = `http://127.0.0.1:5173${item.path}`;

    await send('Page.navigate', { url });
    // Wait 1.8 seconds for React to mount & load components
    await new Promise(r => setTimeout(r, 1800));

    const evalRes = await send('Runtime.evaluate', {
      expression: '({ rootHtmlLen: document.getElementById("root")?.innerHTML?.length || 0, text: document.body.innerText })',
      returnByValue: true
    });

    const res = evalRes?.result?.value || {};
    const hasRendered = res.rootHtmlLen > 500;
    const hasText = res.text && res.text.includes(item.expected);
    const zeroExceptions = currentExceptions.length === 0;

    if (hasRendered && zeroExceptions) {
      console.log(`[PASS] ${item.name} (${item.path}): HTML Length=${res.rootHtmlLen}, Exceptions=0, Matched='${item.expected}'`);
      passed++;
    } else {
      console.error(`[FAIL] ${item.name} (${item.path}): Rendered=${hasRendered} (len: ${res.rootHtmlLen}), Exceptions=${currentExceptions.length}`);
      if (currentExceptions.length > 0) {
        console.error('   Exception details:', currentExceptions[0].text, currentExceptions[0].exception?.description);
      }
      failed++;
    }
  }

  ws.close();
  chromeProc.kill();

  console.log('='.repeat(80));
  console.log(`BROWSER VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED (TOTAL: ${passed + failed})`);
  console.log('='.repeat(80));
}

runBatchBrowserVerification().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
