const { Client } = require('pg');
const { validateEnums } = require('./scripts/qa/cutover-rehearsal-lib.ts');
async function f() {
  const t = new Client({ connectionString: 'postgresql://postgres:123456@127.0.0.1:5432/postgres?schema=public' });
  await t.connect();
  const r = await t.query("SELECT datname FROM pg_database WHERE datname LIKE '%cutover%' ORDER BY datname DESC LIMIT 1");
  const db = r.rows[0].datname;
  console.log("Target db:", db);
  const s = new Client({ connectionString: 'postgresql://postgres:123456@127.0.0.1:5432/construction_erp_v2_qa?schema=public' });
  const tgt = new Client({ connectionString: 'postgresql://postgres:123456@127.0.0.1:5432/' + db + '?schema=public' });
  await s.connect();
  await tgt.connect();
  const mis = await validateEnums(s, tgt);
  console.log('Enum check result:', mis);
  await s.end();
  await tgt.end();
  await t.end();
}
f();
