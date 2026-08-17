import dotenv from "dotenv";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { Pool } from "pg";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

function quoteIdentifier(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL chưa được cấu hình trong .env.local");

  const pool = new Pool({ connectionString });
  try {
    const tablesResult = await pool.query<{ table_name: string }>(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    const columnsResult = await pool.query(`
      SELECT table_name, column_name, data_type, udt_name, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position
    `);

    const tables: Record<string, unknown[]> = {};
    const counts: Record<string, number> = {};
    for (const { table_name: tableName } of tablesResult.rows) {
      const rows = await pool.query(`SELECT * FROM ${quoteIdentifier(tableName)}`);
      tables[tableName] = rows.rows;
      counts[tableName] = rows.rowCount ?? rows.rows.length;
    }

    const capturedAt = new Date().toISOString();
    const payload = {
      format: "construction-erp-v2-data-backup-v1",
      purpose: "pre-site-commander-account-provisioning",
      capturedAt,
      counts,
      columns: columnsResult.rows,
      tables,
    };
    const json = JSON.stringify(payload, null, 2);
    const digest = createHash("sha256").update(json).digest("hex");
    const stamp = capturedAt.replaceAll(":", "-").replaceAll(".", "-");
    const outputDir = path.resolve(process.cwd(), "backups", "site-commander-account-provisioning");
    await fs.mkdir(outputDir, { recursive: true });
    const outputPath = path.join(outputDir, `pre-provisioning-${stamp}.json`);
    await fs.writeFile(outputPath, json, { encoding: "utf8", flag: "wx" });

    console.log(JSON.stringify({ outputPath, sha256: digest, counts }, null, 2));
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
