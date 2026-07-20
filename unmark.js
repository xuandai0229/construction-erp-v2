const { Client } = require('pg');
const fs = require('fs');

async function run() {
  const env = fs.readFileSync('.env', 'utf8');
  const match = env.match(/DATABASE_URL="([^"]+)"/);
  if (!match) throw new Error('No url');
  const url = match[1];

  const client = new Client({ connectionString: url });
  await client.connect();
  
  await client.query(`DELETE FROM _prisma_migrations WHERE migration_name = '20260717000000_approval_request_legacy_compatibility'`);
  
  console.log('Unmarked migration.');
  
  await client.end();
}
run().catch(console.error);
