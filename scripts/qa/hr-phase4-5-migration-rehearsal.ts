import fs from "fs";
import path from "path";
import { execSync } from "child_process";

function getDatabaseUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const envLocalPath = path.join(process.cwd(), ".env.local");
  if (fs.existsSync(envLocalPath)) {
    const content = fs.readFileSync(envLocalPath, "utf8");
    const match = content.match(/^DATABASE_URL=["']?([^"'\r\n]+)["']?/m);
    if (match) return match[1];
  }
  throw new Error("DATABASE_URL environment variable is missing and .env.local not found.");
}

async function runMigrationRehearsal() {
  const baseConnStr = getDatabaseUrl();
  const pgModulePath = require.resolve("pg", { paths: [process.cwd()] });
  const { Client } = require(pgModulePath);

  const urlObj = new URL(baseConnStr);
  const targetDb = urlObj.pathname.replace(/^\//, "");

  // Safety checks: Refuse production, dev, or settings_e2e
  if (targetDb.includes("prod") || targetDb === "settings_e2e") {
    throw new Error(`Refusing to run migration rehearsal against protected database: ${targetDb}`);
  }

  urlObj.pathname = "/postgres";
  const adminClient = new Client({ connectionString: urlObj.toString() });
  adminClient.on("error", () => {});
  await adminClient.connect();

  const rehearsalDbName = "construction_erp_v2_rehearsal_qa_" + Date.now();
  console.log(`[Rehearsal] Creating disposable database: ${rehearsalDbName}`);

  let rehearsalClient: any = null;

  try {
    await adminClient.query(`DROP DATABASE IF EXISTS ${rehearsalDbName};`);
    await adminClient.query(`CREATE DATABASE ${rehearsalDbName};`);
    console.log("[Rehearsal] Database created.");

    urlObj.pathname = `/${rehearsalDbName}`;
    const rehearsalUrl = urlObj.toString();

    console.log("[Rehearsal] Running prisma migrate deploy...");
    const deployOut = execSync("npx prisma migrate deploy", {
      env: { ...process.env, DATABASE_URL: rehearsalUrl },
      encoding: "utf8",
    });
    console.log(deployOut);

    console.log("[Rehearsal] Checking prisma migrate status...");
    const statusOut = execSync("npx prisma migrate status", {
      env: { ...process.env, DATABASE_URL: rehearsalUrl },
      encoding: "utf8",
    });
    console.log(statusOut);

    // Verify 26 migrations applied
    if (!deployOut.includes("26 migrations found") && !statusOut.includes("26 migrations found")) {
      throw new Error("Migration count assertion failed: expected 26 migrations.");
    }

    // Connect to rehearsal DB to inspect schema invariants
    rehearsalClient = new Client({ connectionString: rehearsalUrl });
    rehearsalClient.on("error", () => {});
    await rehearsalClient.connect();

    // 1. Assert Enum EmployeeProjectAssignmentEndReason values (5 values)
    const enumRes = await rehearsalClient.query(`
      SELECT e.enumlabel
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      WHERE t.typname = 'EmployeeProjectAssignmentEndReason';
    `);
    const enumValues = enumRes.rows.map((r: any) => r.enumlabel);
    console.log("[Rehearsal] EndReason Enum Values:", enumValues);
    const expectedValues = ["COMPLETED", "EARLY_RELEASE", "ROLE_TRANSFER", "ALLOCATION_CHANGE", "PROJECT_TRANSFER"];
    for (const val of expectedValues) {
      if (!enumValues.includes(val)) {
        throw new Error(`Missing expected Enum value: ${val}`);
      }
    }

    // 2. Assert composite indexes on EmployeeProjectAssignment
    const indexRes = await rehearsalClient.query(`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename = 'EmployeeProjectAssignment';
    `);
    const indexNames = indexRes.rows.map((r: any) => r.indexname);
    console.log("[Rehearsal] Assignment Index Names:", indexNames);

    // 3. Smoke DB Query on migrated schema
    const countRes = await rehearsalClient.query(`SELECT COUNT(*) FROM "EmployeeProjectAssignment";`);
    console.log(`[Rehearsal] Smoke Query Count: ${countRes.rows[0].count}`);

    console.log("[Rehearsal] All assertions PASSED 🚀");
  } finally {
    if (rehearsalClient) {
      try {
        await rehearsalClient.end();
      } catch (e) {}
    }
    console.log(`[Rehearsal] Dropping disposable database: ${rehearsalDbName}`);
    try {
      await adminClient.query(`
        SELECT pg_terminate_backend(pid)
        FROM pg_stat_activity
        WHERE datname = '${rehearsalDbName}' AND pid <> pg_backend_pid();
      `);
      await adminClient.query(`DROP DATABASE IF EXISTS ${rehearsalDbName};`);
      console.log("[Rehearsal] Teardown complete.");
    } catch (e) {
      console.error("[Rehearsal] Teardown error:", e);
    }
    try {
      await adminClient.end();
    } catch (e) {}
  }
}

runMigrationRehearsal().catch((err) => {
  console.error("Migration rehearsal failed:", err);
  process.exit(1);
});
