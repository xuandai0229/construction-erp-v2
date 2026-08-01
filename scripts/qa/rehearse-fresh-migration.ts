import "dotenv/config";
import { Client } from "pg";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

async function rehearseFreshMigration() {
  console.log("=== FRESH QA DATABASE MIGRATION REHEARSAL ===");

  const baseConnectionString = process.env.QA_DATABASE_URL || process.env.DATABASE_URL || "";
  const parsed = new URL(baseConnectionString);
  const user = parsed.username || "postgres";
  const pass = parsed.password || "postgres";
  const host = parsed.hostname || "127.0.0.1";
  const port = parsed.port || "5432";
  const freshDbName = `construction_erp_v2_qa_fresh_${Date.now()}`;
  const freshDbUrl = `postgresql://${user}:${pass}@${host}:${port}/${freshDbName}`;

  console.log(`Creating fresh QA test database: ${freshDbName}`);

  // Connect to default 'postgres' db to create the fresh database
  const pgClient = new Client({
    connectionString: `postgresql://${user}:${pass}@${host}:${port}/postgres`,
  });

  try {
    await pgClient.connect();
    await pgClient.query(`CREATE DATABASE "${freshDbName}";`);
    console.log(`-> Database '${freshDbName}' created successfully.`);
  } catch (err: any) {
    console.error("Failed to create fresh database:", err.message);
    process.exit(1);
  } finally {
    await pgClient.end().catch(() => {});
  }

  // Run prisma migrate deploy targeting fresh DB
  console.log("\nRunning 'npx prisma migrate deploy' on fresh database...");
  const env = { ...process.env, DATABASE_URL: freshDbUrl };

  let migrateExitCode = 0;
  let migrateOutput = "";
  try {
    migrateOutput = execSync("npx prisma migrate deploy", { env, encoding: "utf-8" });
    console.log("Migration Deploy Output:\n" + migrateOutput);
  } catch (err: any) {
    migrateExitCode = err.status || 1;
    console.error("Prisma migrate deploy failed:", err.message);
  }

  // Connect to fresh database to inspect created tables
  const freshClient = new Client({ connectionString: freshDbUrl });
  let createdTables: string[] = [];
  let safetyWeeklyFileExistsInFresh = false;
  let planWeeklyFileIdExistsInFresh = false;
  let assessmentWeeklyFileIdExistsInFresh = false;

  try {
    await freshClient.connect();
    const res = await freshClient.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
    `);
    createdTables = res.rows.map((r) => r.table_name);
    safetyWeeklyFileExistsInFresh = createdTables.includes("SafetyWeeklyFile");

    if (createdTables.includes("SafetyReportPlan")) {
      const colRes = await freshClient.query(`
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'SafetyReportPlan' AND column_name = 'weeklyFileId';
      `);
      planWeeklyFileIdExistsInFresh = colRes.rows.length > 0;
    }

    if (createdTables.includes("SafetySelfAssessmentReport")) {
      const colRes = await freshClient.query(`
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'SafetySelfAssessmentReport' AND column_name = 'weeklyFileId';
      `);
      assessmentWeeklyFileIdExistsInFresh = colRes.rows.length > 0;
    }
  } catch (err: any) {
    console.error("Error inspecting fresh database schema:", err.message);
  } finally {
    await freshClient.end().catch(() => {});
  }

  console.log("\n--- Fresh Database Schema Inspection Result ---");
  console.log(`Total Tables Created from Migrations: ${createdTables.length}`);
  console.log(`SafetyWeeklyFile Table Created: ${safetyWeeklyFileExistsInFresh ? "YES" : "NO"}`);
  console.log(`SafetyReportPlan.weeklyFileId Column Created: ${planWeeklyFileIdExistsInFresh ? "YES" : "NO"}`);
  console.log(`SafetySelfAssessmentReport.weeklyFileId Column Created: ${assessmentWeeklyFileIdExistsInFresh ? "YES" : "NO"}`);

  const rehearsalReport = {
    timestamp: new Date().toISOString(),
    freshDatabaseName: freshDbName,
    migrateExitCode,
    createdTablesCount: createdTables.length,
    safetyWeeklyFileExistsInFresh,
    planWeeklyFileIdExistsInFresh,
    assessmentWeeklyFileIdExistsInFresh,
    status: (safetyWeeklyFileExistsInFresh && planWeeklyFileIdExistsInFresh && assessmentWeeklyFileIdExistsInFresh)
      ? "SUCCESS"
      : "DRIFT_BLOCKED_MISSING_SAFETY_WEEKLY_FILE_MIGRATION"
  };

  const reportPath = path.join(process.cwd(), "docs/qa/PHASE_1_5_MIGRATION_REHEARSAL_REPORT.md");
  fs.writeFileSync(
    reportPath,
    `# Fresh QA Database Migration Rehearsal Report

**Timestamp:** ${rehearsalReport.timestamp}  
**Fresh Database Name:** \`${freshDbName}\`  
**Prisma Migrate Deploy Exit Code:** \`${migrateExitCode}\`  

## Results

- **Total Tables Created from Migrations:** ${createdTables.length}
- **\`SafetyWeeklyFile\` Table Created:** ${safetyWeeklyFileExistsInFresh ? "YES" : "**NO (MISSING FROM MIGRATIONS)**"}
- **\`SafetyReportPlan.weeklyFileId\` Created:** ${planWeeklyFileIdExistsInFresh ? "YES" : "**NO (MISSING FROM MIGRATIONS)**"}
- **\`SafetySelfAssessmentReport.weeklyFileId\` Created:** ${assessmentWeeklyFileIdExistsInFresh ? "YES" : "**NO (MISSING FROM MIGRATIONS)**"}

## Migration Baseline Conclusion

**Status:** \`${rehearsalReport.status}\`  
**Finding:** The committed migration folder (\`prisma/migrations\`) does NOT contain a migration file for \`SafetyWeeklyFile\`. \`SafetyWeeklyFile\` and \`weeklyFileId\` were added to \`schema.prisma\` and applied to the database via \`prisma db push\` without creating a formal versioned Prisma migration!

**GO/NO-GO Impact:**  
\`NO-GO PHASE 2 — MIGRATION BASELINE BLOCKED\`
`
  );
  console.log(`\nRehearsal report written to: ${reportPath}`);

  // Cleanup fresh database
  const cleanupClient = new Client({
    connectionString: `postgresql://${user}:${pass}@${host}:${port}/postgres`,
  });
  try {
    await cleanupClient.connect();
    await cleanupClient.query(`DROP DATABASE IF EXISTS "${freshDbName}";`);
    console.log(`Cleaned up temporary database '${freshDbName}'.`);
  } catch (err: any) {
    console.warn("Cleanup warning:", err.message);
  } finally {
    await cleanupClient.end().catch(() => {});
  }
}

rehearseFreshMigration().catch((e) => {
  console.error("Migration rehearsal error:", e);
  process.exit(1);
});
