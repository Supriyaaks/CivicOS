
const { Client } = require('c:/Users/WCT/Desktop/DSU/postgres_runner/node_modules/pg');
const client = new Client({ connectionString: 'postgresql://postgres:darshini@localhost:5432/civicos' });
async function check() {
  await client.connect();
  const res = await client.query('SELECT id, "incidentCode", category, status, "aiConfidence" FROM "Incident" WHERE "incidentCode" = $1', ['INC-3471']);
  console.log('PG VERIFIED:', JSON.stringify(res.rows[0]));
  await client.end();
}
check().catch(console.error);
