// Check the actual company name in database using raw pg
const { Client } = require('pg');

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    // Try to load from .env
    const fs = require('fs');
    const path = require('path');
    const envPath = path.join(__dirname, '..', '.env');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf-8');
      const match = envContent.match(/DATABASE_URL\s*=\s*"?([^"\n]+)"?/);
      if (match) {
        process.env.DATABASE_URL = match[1];
      }
    }
  }
  
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  
  const result = await client.query(
    `SELECT "companyName" FROM "SystemSetting" WHERE "singletonKey" = 'DEFAULT_SETTINGS' LIMIT 1`
  );
  
  if (result.rows.length > 0) {
    console.log('DB companyName:', JSON.stringify(result.rows[0].companyName));
  } else {
    console.log('No SystemSetting row found');
  }
  
  await client.end();
}

main().catch(e => { console.error('Error:', e.message); process.exit(1); });
