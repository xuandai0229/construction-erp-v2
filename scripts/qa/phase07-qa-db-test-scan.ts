import { Client } from "pg";
require("dotenv").config();

const QA_DB_URL = process.env.DATABASE_URL;

async function main() {
  const client = new Client({ connectionString: QA_DB_URL });
  await client.connect();

  console.log("=== SCANNING QA DATABASE FOR SUSPICIOUS TEST DATA ===");

  const tablesRes = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE' AND table_name != '_prisma_migrations';
  `);

  const PATTERNS = ["QA", "E2E", "TEST", "RUN_", "FIXTURE", "SAMPLE", "AUTOVER", "TAILIEU_E2E"];

  const suspiciousRecords: { table: string; id: string; matchingField: string; value: string }[] = [];

  for (const row of tablesRes.rows) {
    const table = row.table_name;
    try {
      const colsRes = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = '${table}' 
          AND data_type IN ('text', 'character varying');
      `);

      const textCols = colsRes.rows.map((c) => c.column_name);
      if (textCols.length === 0) continue;

      const whereClauses = textCols
        .flatMap((col) => PATTERNS.map((p) => `UPPER("${col}") LIKE '%${p}%'`))
        .join(" OR ");

      const query = `SELECT id, ${textCols.slice(0, 3).map((c) => `"${c}"`).join(", ")} FROM "${table}" WHERE ${whereClauses};`;
      const res = await client.query(query);

      for (const record of res.rows) {
        for (const col of textCols) {
          const val = String(record[col] || "");
          for (const p of PATTERNS) {
            if (val.toUpperCase().includes(p)) {
              suspiciousRecords.push({
                table,
                id: record.id,
                matchingField: col,
                value: val.substring(0, 100),
              });
            }
          }
        }
      }
    } catch (err) {
      // Ignore column errors
    }
  }

  console.log(`Total suspicious test records found in QA DB: ${suspiciousRecords.length}`);
  if (suspiciousRecords.length > 0) {
    console.table(suspiciousRecords);
  }

  await client.end();
}

main().catch(console.error);
