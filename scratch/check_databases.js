require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const res = await client.query("SELECT datname FROM pg_database WHERE datistemplate = false;");
  console.log("Databases on PostgreSQL server:");
  res.rows.forEach(r => console.log(" - " + r.datname));
  await client.end();
}

main().catch(console.error);
