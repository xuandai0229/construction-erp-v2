// Safe update of company name in database
// GUARD: Only updates if the current value matches the old incorrect name
const { Client } = require('pg');

const OLD_NAME = 'CT2 Hanoi Construction';
const NEW_NAME = 'CÔNG TY CỔ PHẦN XÂY DỰNG VÀ THƯƠNG MẠI SỐ 2 HÀ NỘI';

async function main() {
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

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  // Step 1: Read current value
  const checkResult = await client.query(
    `SELECT "companyName" FROM "SystemSetting" WHERE "singletonKey" = 'DEFAULT_SETTINGS' LIMIT 1`
  );

  if (checkResult.rows.length === 0) {
    console.log('No SystemSetting row found. Nothing to update.');
    await client.end();
    return;
  }

  const currentName = checkResult.rows[0].companyName;
  console.log('Current companyName:', JSON.stringify(currentName));

  // GUARD: Only update if the current value is the known old name
  if (currentName !== OLD_NAME) {
    console.log(`SKIP: Current name does not match expected old name "${OLD_NAME}".`);
    console.log('No changes made.');
    await client.end();
    return;
  }

  // Step 2: Safe update
  const updateResult = await client.query(
    `UPDATE "SystemSetting" SET "companyName" = $1 WHERE "singletonKey" = 'DEFAULT_SETTINGS' AND "companyName" = $2`,
    [NEW_NAME, OLD_NAME]
  );

  console.log('Rows updated:', updateResult.rowCount);
  
  // Step 3: Verify
  const verifyResult = await client.query(
    `SELECT "companyName" FROM "SystemSetting" WHERE "singletonKey" = 'DEFAULT_SETTINGS' LIMIT 1`
  );
  console.log('New companyName:', JSON.stringify(verifyResult.rows[0].companyName));
  console.log('Update SUCCESS.');

  await client.end();
}

main().catch(e => { console.error('Error:', e.message); process.exit(1); });
