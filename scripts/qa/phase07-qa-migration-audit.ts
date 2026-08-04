import { Client } from "pg";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";

require("dotenv").config();

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const res = await client.query(`
    SELECT migration_name, checksum, finished_at, rolled_back_at 
    FROM "_prisma_migrations" 
    ORDER BY finished_at ASC;
  `);

  console.log("=== MIGRATION AUDIT ON MAIN QA DATABASE (construction_erp_v2_qa) ===");

  const rows: any[] = [];

  for (const r of res.rows) {
    const name = r.migration_name;
    const dbChecksum = r.checksum;
    const isRolledBack = r.rolled_back_at !== null;
    const finished = r.finished_at !== null;

    const fileOnDisk = join(process.cwd(), "prisma/migrations", name, "migration.sql");
    const fileExists = existsSync(fileOnDisk);

    let status = "APPLIED";
    let passFail = "PASS";
    let fileState = fileExists ? "Present" : "Legacy/Squashed";

    if (isRolledBack) {
      status = "ROLLED_BACK";
      passFail = "ROLLED_BACK_HISTORICAL";
    } else if (!finished) {
      status = "FAILED";
      passFail = "FAIL";
    }

    let diskSha256 = "-";
    if (fileExists) {
      const content = readFileSync(fileOnDisk, "utf-8");
      diskSha256 = createHash("sha256").update(content).digest("hex").substring(0, 12);
    }

    rows.push({
      migration: name,
      statusQA: status,
      dbChecksum: dbChecksum.substring(0, 12),
      fileOnDisk: fileState,
      result: passFail,
    });
  }

  console.table(rows);
  await client.end();
}

main().catch(console.error);
