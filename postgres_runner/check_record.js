
const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://civicos_user:civicos_pass@localhost:5432/civicos' });
async function check() {
    await client.connect();
    const res = await client.query('SELECT id, "incidentCode", category, status, "aiConfidence", "createdAt" FROM "Incident" WHERE "incidentCode" = $1', ['INC-4369']);
    console.log('PostgreSQL Direct Query Row:', JSON.stringify(res.rows[0]));
    await client.end();
}
check().catch(console.error);
