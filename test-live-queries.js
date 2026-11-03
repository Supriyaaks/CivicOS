const http = require('http');

const queries = [
  'Which incidents require multiple departments?',
  'How many incidents are currently unassigned?',
  'Which department has the highest workload?',
  'Show high-priority incidents.',
  'What is the current municipal operational summary?'
];

async function sendQuery(query) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ query });
    const req = http.request({
      hostname: '127.0.0.1',
      port: 5000,
      path: '/api/v1/ai/chat',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    }, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, json: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, text: body });
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function run() {
  console.log('================================================================================');
  console.log('TESTING LIVE HTTP RESPONSES FROM EXPRESS BACKEND (PORT 5000)');
  console.log('================================================================================\n');

  for (let i = 0; i < queries.length; i++) {
    const q = queries[i];
    console.log(`[TEST ${i + 1}] Asking: "${q}"`);
    const res = await sendQuery(q);
    console.log(`HTTP Status: ${res.status}`);
    if (res.json && res.json.success) {
      console.log(`Source: ${res.json.data.source}`);
      console.log(`Model: ${res.json.data.model}`);
      console.log(`Database Source: ${res.json.data.dataSource}`);
      console.log(`Referenced Records: ${res.json.data.recordsReferenced?.join(', ') || 'N/A'}`);
      console.log('Response Content:\n' + res.json.data.content);
    } else {
      console.error('FAILED:', res);
    }
    console.log('\n--------------------------------------------------------------------------------\n');
  }
}

run();
