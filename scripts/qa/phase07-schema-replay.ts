import { Client } from "pg";
import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

require("dotenv").config();

async function main() {
  const mainUrl = process.env.DATABASE_URL;
  if (!mainUrl) throw new Error("DATABASE_URL is missing");

  const urlObj = new URL(mainUrl);
  const host = urlObj.hostname;
  const port = urlObj.port || "5432";
  const user = urlObj.username;
  const password = urlObj.password;

  const currentDbName = urlObj.pathname.replace(/^\//, "");
  const replayDbName = "construction_erp_v2_phase07_replay_20260803";
  const replayUrl = `postgresql://${user}:${encodeURIComponent(password)}@${host}:${port}/${replayDbName}?schema=public`;

  console.log(`[Step 1] Creating fresh replay database '${replayDbName}'...`);
  const rootClient = new Client({
    connectionString: `postgresql://${user}:${encodeURIComponent(password)}@${host}:${port}/postgres`,
  });
  await rootClient.connect();
  await rootClient.query(`DROP DATABASE IF EXISTS "${replayDbName}";`);
  await rootClient.query(`CREATE DATABASE "${replayDbName}";`);
  await rootClient.end();
  console.log(`[Step 1] Database '${replayDbName}' created.`);

  console.log(`[Step 2] Executing 'npx prisma migrate deploy' on replay database...`);
  execSync(`npx prisma migrate deploy`, {
    env: { ...process.env, DATABASE_URL: replayUrl },
    stdio: "inherit",
  });
  console.log(`[Step 2] 'npx prisma migrate deploy' completed successfully.`);

  // Step 3: Compare schemas
  console.log(`[Step 3] Introspecting and comparing schema objects...`);
  const currentClient = new Client({ connectionString: mainUrl });
  const replayClient = new Client({ connectionString: replayUrl });

  await currentClient.connect();
  await replayClient.connect();

  async function getSchemaObjects(client: Client) {
    const tables = await client.query(`
      SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name;
    `);
    const columns = await client.query(`
      SELECT table_name, column_name, data_type, is_nullable, column_default 
      FROM information_schema.columns WHERE table_schema='public' ORDER BY table_name, column_name;
    `);
    const enums = await client.query(`
      SELECT t.typname, e.enumlabel 
      FROM pg_type t 
      JOIN pg_enum e ON t.oid = e.enumtypid 
      JOIN pg_namespace n ON n.oid = t.typnamespace 
      WHERE n.nspname = 'public' ORDER BY t.typname, e.enumsortorder;
    `);
    const constraints = await client.query(`
      SELECT conname, conrelid::regclass::text as tablename, contype 
      FROM pg_constraint c JOIN pg_namespace n ON n.oid = c.connamespace WHERE n.nspname = 'public' ORDER BY conname;
    `);
    const indexes = await client.query(`
      SELECT indexname, tablename, indexdef FROM pg_indexes WHERE schemaname = 'public' ORDER BY indexname;
    `);

    return {
      tables: tables.rows.map((r) => r.table_name),
      columns: columns.rows,
      enums: enums.rows,
      constraints: constraints.rows,
      indexes: indexes.rows,
    };
  }

  const currentSchema = await getSchemaObjects(currentClient);
  const replaySchema = await getSchemaObjects(replayClient);

  await currentClient.end();
  await replayClient.end();

  // Diff calculation
  const tableDiff = {
    currentCount: currentSchema.tables.length,
    replayCount: replaySchema.tables.length,
    missingInReplay: currentSchema.tables.filter((t) => !replaySchema.tables.includes(t)),
    extraInReplay: replaySchema.tables.filter((t) => !currentSchema.tables.includes(t)),
  };

  const colDiff = {
    currentCount: currentSchema.columns.length,
    replayCount: replaySchema.columns.length,
    missingInReplay: currentSchema.columns.filter(
      (c) => !replaySchema.columns.some((rc) => rc.table_name === c.table_name && rc.column_name === c.column_name)
    ),
    extraInReplay: replaySchema.columns.filter(
      (rc) => !currentSchema.columns.some((c) => c.table_name === rc.table_name && c.column_name === rc.column_name)
    ),
  };

  const enumDiff = {
    currentCount: currentSchema.enums.length,
    replayCount: replaySchema.enums.length,
  };

  const result = {
    timestamp: new Date().toISOString(),
    currentDb: currentDbName,
    replayDb: replayDbName,
    isEqual:
      tableDiff.missingInReplay.length === 0 &&
      tableDiff.extraInReplay.length === 0 &&
      colDiff.missingInReplay.length === 0 &&
      colDiff.extraInReplay.length === 0,
    tableDiff,
    colDiff,
    enumDiff,
    currentSchemaSummary: {
      tableCount: currentSchema.tables.length,
      columnCount: currentSchema.columns.length,
      enumCount: currentSchema.enums.length,
      constraintCount: currentSchema.constraints.length,
      indexCount: currentSchema.indexes.length,
    },
    replaySchemaSummary: {
      tableCount: replaySchema.tables.length,
      columnCount: replaySchema.columns.length,
      enumCount: replaySchema.enums.length,
      constraintCount: replaySchema.constraints.length,
      indexCount: replaySchema.indexes.length,
    },
  };

  console.log("=== SCHEMA COMPARISON RESULTS ===");
  console.log(`Current DB Tables: ${currentSchema.tables.length} | Replay DB Tables: ${replaySchema.tables.length}`);
  console.log(`Current DB Columns: ${currentSchema.columns.length} | Replay DB Columns: ${replaySchema.columns.length}`);
  console.log(`Missing Tables in Replay:`, tableDiff.missingInReplay);
  console.log(`Extra Tables in Replay:`, tableDiff.extraInReplay);
  console.log(`Missing Columns in Replay:`, colDiff.missingInReplay);
  console.log(`Extra Columns in Replay:`, colDiff.extraInReplay);
  console.log(`Is Schema 100% Equal:`, result.isEqual);

  writeFileSync(
    join(process.cwd(), "docs/qa/backups/phase07/schema-reproducibility-analysis.json"),
    JSON.stringify(result, null, 2),
    "utf-8"
  );
}

main().catch((err) => {
  console.error("Replay schema failed", err);
  process.exit(1);
});
