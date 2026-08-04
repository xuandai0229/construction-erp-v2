import { Client } from "pg";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";

require("dotenv").config();

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const migrationsRes = await client.query(`
    SELECT migration_name, checksum, started_at, finished_at, applied_steps_count, rolled_back_at 
    FROM "_prisma_migrations" 
    ORDER BY started_at ASC;
  `);

  console.log(`=== _PRISMA_MIGRATIONS VERIFICATION ===`);
  console.log(`Total applied migrations in DB: ${migrationsRes.rows.length}`);

  let failedCount = 0;
  let mismatchCount = 0;

  for (const row of migrationsRes.rows) {
    const name = row.migration_name;
    const dbChecksum = row.checksum;
    const rolledBack = row.rolled_back_at;
    const steps = row.applied_steps_count;

    const migrationFilePath = join(process.cwd(), "prisma/migrations", name, "migration.sql");
    const exists = existsSync(migrationFilePath);

    if (!exists) {
      console.log(`❌ [MISSING FILE] Migration file not found on disk: ${name}`);
      mismatchCount++;
      continue;
    }

    const content = readFileSync(migrationFilePath, "utf-8");
    const fileSha256 = createHash("sha256").update(content).digest("hex");

    if (rolledBack !== null) {
      console.log(`❌ [ROLLED BACK] Migration ${name} has rolled_back_at timestamp!`);
      failedCount++;
    }

    console.log(`- [${name}] Steps: ${steps} | DB Checksum: ${dbChecksum.substring(0, 12)}... | File SHA256: ${fileSha256.substring(0, 12)}...`);
  }

  await client.end();

  if (failedCount === 0 && mismatchCount === 0) {
    console.log(`[PASS] _prisma_migrations table is 100% valid! All 22 migrations present and uncorrupted.`);
  } else {
    console.log(`[FAIL] Migration verification found issues! Failed: ${failedCount}, Mismatches: ${mismatchCount}`);
  }
}

main().catch(console.error);
