const { spawn } = require('child_process');
const http = require('http');

async function testPage(url) {
  console.log(`Launching Chrome headless to inspect: ${url}`);
  const chromeProc = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--headless=new',
    '--disable-gpu',
    '--remote-debugging-port=9222',
    '--no-first-run',
    '--no-default-browser-check',
    '--user-data-dir=' + require('os').tmpdir() + '/chrome-profile-' + Math.random().toString(36).slice(2)
  ]);

  // Poll until 9222 is open
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
        page = data.find(t => t.type === 'page' && t.webSocketDebuggerUrl) || data[0];
        if (page && page.webSocketDebuggerUrl) break;
      }
    } catch {}
  }

  if (!page) {
    console.log('Failed to connect to Chrome debugging port');
    chromeProc.kill();
    return;
  }

  console.log('Connected to target:', page.title);
  const ws = new WebSocket(page.webSocketDebuggerUrl);

  const consoleLogs = [];
  const exceptions = [];

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
    if (msg.method === 'Runtime.consoleAPICalled') {
      consoleLogs.push({
        type: msg.params.type,
        args: msg.params.args.map(a => a.value !== undefined ? a.value : a.description)
      });
    }
    if (msg.method === 'Runtime.exceptionThrown') {
      exceptions.push(msg.params.exceptionDetails);
    }
  };

  await new Promise(r => ws.onopen = r);

  await send('Runtime.enable');
  await send('Page.enable');
  await send('Log.enable');

  console.log('Navigating to', url);
  await send('Page.navigate', { url });

  // Wait 3.5 seconds for React to mount and render
  await new Promise(r => setTimeout(r, 3500));

  const evalRes = await send('Runtime.evaluate', {
    expression: '({ rootHtml: document.getElementById("root")?.innerHTML || "", title: document.title, url: window.location.href, bodyText: document.body.innerText })',
    returnByValue: true
  });

  ws.close();
  chromeProc.kill();

  console.log('\n--- BROWSER CONSOLE LOGS ---');
  if (consoleLogs.length === 0) console.log('(No console logs)');
  consoleLogs.forEach(l => console.log(`[${l.type}]`, ...l.args));

  console.log('\n--- BROWSER EXCEPTIONS ---');
  if (exceptions.length === 0) {
    console.log('No runtime exceptions thrown!');
  } else {
    exceptions.forEach(e => {
      console.log(`[EXCEPTION] ${e.text} at ${e.url}:${e.lineNumber}:${e.columnNumber}`);
      if (e.exception?.description) console.log(e.exception.description);
    });
  }

  const result = evalRes?.result?.value;
  console.log('\n--- RENDERED PAGE INFO ---');
  console.log('Page Title:', result?.title);
  console.log('Final URL:', result?.url);
  console.log('Body Text length:', result?.bodyText?.length || 0);
  console.log('Body Text Snippet:', (result?.bodyText || '').slice(0, 300));
  console.log('Root HTML length:', result?.rootHtml?.length || 0);
}

testPage('http://127.0.0.1:5173/officer/road-repair');
