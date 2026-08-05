const { Client } = require('pg');
async function f() {
  const t = new Client({ connectionString: 'postgresql://postgres:123456@127.0.0.1:5432/postgres?schema=public' });
  await t.connect();
  const r = await t.query("SELECT datname FROM pg_database WHERE datname LIKE '%cutover%' ORDER BY datname DESC LIMIT 1");
  const db = r.rows[0].datname;
  const s = new Client({ connectionString: 'postgresql://postgres:123456@127.0.0.1:5432/construction_erp_v2_qa?schema=public' });
  const tgt = new Client({ connectionString: 'postgresql://postgres:123456@127.0.0.1:5432/' + db + '?schema=public' });
  await s.connect();
  await tgt.connect();
  const getEnums = async (c) => {
    const r = await c.query("SELECT t.typname, e.enumlabel FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'public' ORDER BY t.typname, e.enumsortorder");
    const map = new Map();
    for (const row of r.rows) {
      if (!map.has(row.typname)) map.set(row.typname, []);
      map.get(row.typname).push(row.enumlabel);
    }
    return map;
  };
  const src = await getEnums(s);
  const tgtMap = await getEnums(tgt);
  for (const [typ, srcLabels] of src.entries()) {
    const tgtLabels = tgtMap.get(typ);
    if (!tgtLabels || srcLabels.join(',') !== tgtLabels.join(',')) {
      console.log('Mismatch in type:', typ);
      console.log('Source:', srcLabels);
      console.log('Target:', tgtLabels);
    }
  }
  await s.end();
  await tgt.end();
  await t.end();
}
f();
