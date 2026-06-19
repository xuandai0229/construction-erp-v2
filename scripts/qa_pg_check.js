require('dotenv').config();
const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

async function main() {
  await client.connect();
  
  const res = await client.query('SELECT count(*) FROM "Project" WHERE "deletedAt" IS NULL');
  console.log('Active Projects:', res.rows[0].count);
  
  const delRes = await client.query('SELECT count(*) FROM "Project" WHERE "deletedAt" IS NOT NULL');
  console.log('Deleted Projects:', delRes.rows[0].count);
  
  const allRes = await client.query('SELECT id, code, name, investor FROM "Project" WHERE "deletedAt" IS NULL');
  console.log('--- Projects List ---');
  allRes.rows.forEach(p => console.log(`[${p.code}] ${p.name} (Investor: ${p.investor})`));
  
  await client.end();
}

main().catch(console.error);
