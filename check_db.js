const { Client } = require('pg');
const fs = require('fs');

async function run() {
  const env = fs.readFileSync('.env', 'utf8');
  const match = env.match(/DATABASE_URL="([^"]+)"/);
  if (!match) {
    console.log('No DATABASE_URL found');
    process.exit(1);
  }
  const url = match[1];

  const client = new Client({ connectionString: url });
  await client.connect();
  const res = await client.query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'ApprovalRequest';
  `);
  
  console.log('Database Host/Name matched correctly (hidden)');
  console.log('Columns for ApprovalRequest:');
  console.log(res.rows);
  
  const hasEntityType = res.rows.some(r => r.column_name === 'entityType');
  const hasSourceType = res.rows.some(r => r.column_name === 'sourceType');
  console.log('hasEntityType:', hasEntityType);
  console.log('hasSourceType:', hasSourceType);
  
  await client.end();
}
run().catch(console.error);
