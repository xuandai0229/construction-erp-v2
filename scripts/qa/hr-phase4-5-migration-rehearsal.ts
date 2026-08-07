import fs from "fs";
import path from "path";
import { execSync } from "child_process";

function getAdminUrl(): string {
  if (process.env.HR_MIGRATION_REHEARSAL_ADMIN_URL) {
    return process.env.HR_MIGRATION_REHEARSAL_ADMIN_URL;
  }
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const envLocalPath = path.join(process.cwd(), ".env.local");
  if (fs.existsSync(envLocalPath)) {
    const content = fs.readFileSync(envLocalPath, "utf8");
    const match = content.match(/^DATABASE_URL=["']?([^"'\r\n]+)["']?/m);
    if (match) return match[1];
  }
  throw new Error("No database connection string provided for migration rehearsal.");
}

export async function runHardenedMigrationRehearsal() {
  const connStr = getAdminUrl();
  const pgModulePath = require.resolve("pg", { paths: [process.cwd()] });
  const { Client } = require(pgModulePath);

  const urlObj = new URL(connStr);
  const targetDb = urlObj.pathname.replace(/^\//, "");

  // Safety Guards: Refuse protected DBs
  if (targetDb.includes("prod") || targetDb.includes("staging") || targetDb === "settings_e2e") {
    throw new Error(`[Safety Guard] Refusing to run migration rehearsal against protected database: ${targetDb}`);
  }

  urlObj.pathname = "/postgres";
  const adminClient = new Client({ connectionString: urlObj.toString() });
  adminClient.on("error", () => {});
  await adminClient.connect();

  const rehearsalDbName = `hr_qa_rehearsal_${Date.now()}`;
  console.log(`[MigrationRehearsal] Creating temporary database: ${rehearsalDbName}`);

  let rehearsalClient: any = null;

  try {
    await adminClient.query(`DROP DATABASE IF EXISTS ${rehearsalDbName};`);
    await adminClient.query(`CREATE DATABASE ${rehearsalDbName};`);
    console.log("[MigrationRehearsal] Database created.");

    urlObj.pathname = `/${rehearsalDbName}`;
    const rehearsalUrl = urlObj.toString();

    console.log("[MigrationRehearsal] Running prisma migrate deploy...");
    const deployOut = execSync("npx prisma migrate deploy", {
      env: { ...process.env, DATABASE_URL: rehearsalUrl },
      encoding: "utf8",
    });

    // 1. Query _prisma_migrations table to assert exact count of 26 migrations
    rehearsalClient = new Client({ connectionString: rehearsalUrl });
    rehearsalClient.on("error", () => {});
    await rehearsalClient.connect();

    const migRes = await rehearsalClient.query(`SELECT COUNT(*) FROM "_prisma_migrations" WHERE finished_at IS NOT NULL;`);
    const appliedMigrations = parseInt(migRes.rows[0].count, 10);
    console.log(`[MigrationRehearsal] Applied Migrations Count: ${appliedMigrations}`);
    if (appliedMigrations !== 26) {
      throw new Error(`Migration count assertion failed: expected 26, got ${appliedMigrations}`);
    }

    // 2. Assert Enum EmployeeProjectAssignmentEndReason exact 5 values
    const enumRes = await rehearsalClient.query(`
      SELECT e.enumlabel
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      WHERE t.typname = 'EmployeeProjectAssignmentEndReason';
    `);
    const enumValues = enumRes.rows.map((r: any) => r.enumlabel);
    console.log("[MigrationRehearsal] EndReason Enum Values:", enumValues);
    const expectedEnum = ["COMPLETED", "EARLY_RELEASE", "ROLE_TRANSFER", "ALLOCATION_CHANGE", "PROJECT_TRANSFER"];
    for (const val of expectedEnum) {
      if (!enumValues.includes(val)) {
        throw new Error(`Missing expected Enum value: ${val}`);
      }
    }

    // 3. Assert composite indexes on EmployeeProjectAssignment
    const indexRes = await rehearsalClient.query(`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename = 'EmployeeProjectAssignment';
    `);
    const indexNames = indexRes.rows.map((r: any) => r.indexname);
    console.log("[MigrationRehearsal] Assignment Index Names:", indexNames);

    if (!indexNames.includes("EmployeeProjectAssignment_employeeId_status_startDate_idx")) {
      throw new Error("Missing required index: EmployeeProjectAssignment_employeeId_status_startDate_idx");
    }
    if (!indexNames.includes("EmployeeProjectAssignment_projectId_status_startDate_idx")) {
      throw new Error("Missing required index: EmployeeProjectAssignment_projectId_status_startDate_idx");
    }

    // 4. Smoke DB Query on migrated schema
    const countRes = await rehearsalClient.query(`SELECT COUNT(*) FROM "EmployeeProjectAssignment";`);
    console.log(`[MigrationRehearsal] Smoke Query Count: ${countRes.rows[0].count}`);

    console.log("[MigrationRehearsal] All assertions PASSED 🚀");
  } finally {
    if (rehearsalClient) {
      try {
        await rehearsalClient.end();
      } catch (e) {}
    }
    console.log(`[MigrationRehearsal] Dropping temporary database: ${rehearsalDbName}`);
    try {
      await adminClient.query(`
        SELECT pg_terminate_backend(pid)
        FROM pg_stat_activity
        WHERE datname = '${rehearsalDbName}' AND pid <> pg_backend_pid();
      `);
      await adminClient.query(`DROP DATABASE IF EXISTS ${rehearsalDbName};`);
    } catch (e) {
      console.error("[MigrationRehearsal] Teardown error:", e);
    }

    // 5. Query pg_database and assert database no longer exists
    const dbCheckRes = await adminClient.query(`SELECT COUNT(*) FROM pg_database WHERE datname = $1`, [rehearsalDbName]);
    const dbExistsCount = parseInt(dbCheckRes.rows[0].count, 10);
    if (dbExistsCount !== 0) {
      throw new Error(`Teardown failed! Database ${rehearsalDbName} still exists.`);
    }
    console.log(`[MigrationRehearsal] Verified database ${rehearsalDbName} is completely dropped.`);

    try {
      await adminClient.end();
    } catch (e) {}
  }
}

if (require.main === module) {
  runHardenedMigrationRehearsal()
    .then(() => console.log("[MigrationRehearsal] Hardened Rehearsal Complete 🚀"))
    .catch((err) => {
      console.error("[MigrationRehearsal] Failed:", err);
      process.exit(1);
    });
}
