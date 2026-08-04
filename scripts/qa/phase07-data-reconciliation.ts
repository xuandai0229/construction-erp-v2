import { Client } from "pg";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
require("dotenv").config();

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const tablesRes = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name;
  `);

  const summary: Record<string, number> = {};
  console.log("=== COMPLETE TABLE ROW COUNTS IN QA DATABASE ===");
  for (const row of tablesRes.rows) {
    const table = row.table_name;
    const res = await client.query(`SELECT COUNT(*)::int as count FROM "${table}";`);
    summary[table] = res.rows[0].count;
    console.log(`- ${table}: ${res.rows[0].count}`);
  }

  writeFileSync(
    join(process.cwd(), "docs/qa/backups/phase07/phase07-all-table-row-counts.json"),
    JSON.stringify(summary, null, 2),
    "utf-8"
  );

  await client.end();
}

main();
