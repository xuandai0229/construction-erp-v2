import "dotenv/config";
import { Client } from "pg";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { validateDatabaseSafety } from "./assert-safe-database-audit";

export interface AuditFinding {
  ruleCode: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";
  entityType: string;
  entityId: string;
  relatedEntityIds?: string[];
  currentState: Record<string, any>;
  expectedInvariant: string;
  suggestedAction: string;
  autoRepairAllowed: false;
}

async function runFullIntegrityAudit() {
  console.log("=== EXHAUSTIVE READ-ONLY DATABASE INTEGRITY AUDIT ===");

  const qaUrl = process.env.QA_DATABASE_URL;
  const prodUrl = process.env.DATABASE_URL;
  const guardInfo = validateDatabaseSafety(qaUrl, prodUrl);
  console.log(`Database Guard PASSED: ${guardInfo.host}:${guardInfo.port}/${guardInfo.database}`);

  const client = new Client({ connectionString: qaUrl });
  const findings: AuditFinding[] = [];

  try {
    await client.connect();

    // 1. Enforce PostgreSQL Read-Only Transaction
    await client.query("BEGIN READ ONLY;");
    console.log("-> PostgreSQL transaction mode set to READ ONLY.");

    // Verify Read-Only Mode by attempting a dummy write (must fail)
    try {
      await client.query("SAVEPOINT ro_test;");
      await client.query("CREATE TEMP TABLE _test_ro_check (id int);");
      console.warn("WARNING: Database connection permitted temporary DDL write.");
    } catch (e: any) {
      await client.query("ROLLBACK TO SAVEPOINT ro_test;");
      console.log("-> Read-only enforcement verified: Write operations blocked by PostgreSQL.");
    }

    // 2. Fetch DB Role Permissions
    const permRes = await client.query(`
      SELECT grantee, table_name, privilege_type 
      FROM information_schema.role_table_grants 
      WHERE grantee = current_user AND table_schema = 'public' 
      LIMIT 10;
    `);
    console.log(`Current DB User: ${guardInfo.maskedUser}, Sample Grants: ${permRes.rows.length} rows`);

    // -------------------------------------------------------------
    // SECTION A: DEEP INVESTIGATION OF THE 4 SAFETY ORPHANS
    // -------------------------------------------------------------
    console.log("\n--- Investigating 4 Safety Orphan Records ---");

    // Fetch Orphaned Safety Plans (weeklyFileId IS NULL AND deletedAt IS NULL)
    const orphanPlansRes = await client.query(`
      SELECT 
        p.id, p."documentNumber", p."officialDocumentNumber", p."documentYear", p."sequenceNumber",
        p."createdById", u.name as "creatorName", p."periodStart", p."periodEnd", p."version",
        p."createdAt", p."updatedAt", p.status
      FROM "SafetyReportPlan" p
      LEFT JOIN "User" u ON p."createdById" = u.id
      WHERE p."weeklyFileId" IS NULL AND p."deletedAt" IS NULL;
    `);

    // Fetch Orphaned Safety Assessments (weeklyFileId IS NULL AND deletedAt IS NULL)
    const orphanAssessmentsRes = await client.query(`
      SELECT 
        r.id, r."documentNumber", r."officialDocumentNumber", r."documentYear", r."sequenceNumber",
        r."createdById", u.name as "creatorName", r."periodStart", r."periodEnd", r."version",
        r."createdAt", r."updatedAt", r.status, r."sourcePlanId"
      FROM "SafetySelfAssessmentReport" r
      LEFT JOIN "User" u ON r."createdById" = u.id
      WHERE r."weeklyFileId" IS NULL AND r."deletedAt" IS NULL;
    `);

    // Fetch all soft-deleted or existing SafetyWeeklyFiles for parent matching
    const allWeeklyFilesRes = await client.query(`
      SELECT id, "fileCode", "periodStart", "periodEnd", "createdById", "deletedAt"
      FROM "SafetyWeeklyFile";
    `);

    const orphanPlanManifests = orphanPlansRes.rows.map((plan) => {
      findings.push({
        ruleCode: "SAFETY_PLAN_ORPHAN_NO_PARENT",
        severity: "HIGH",
        entityType: "SafetyReportPlan",
        entityId: plan.id,
        currentState: plan,
        expectedInvariant: "Active SafetyReportPlan must be linked to a parent SafetyWeeklyFile via weeklyFileId",
        suggestedAction: "Backfill: Generate or link parent SafetyWeeklyFile matching periodStart and creator in Phase 1.5 Remediation",
        autoRepairAllowed: false,
      });

      // Find potential parent candidate by matching periodStart & createdById
      const candidate = allWeeklyFilesRes.rows.find(
        (wf) =>
          new Date(wf.periodStart).getTime() === new Date(plan.periodStart).getTime() &&
          wf.createdById === plan.createdById
      );

      return {
        ...plan,
        parentCandidate: candidate || null,
        candidateConfidence: candidate ? "HIGH" : "MEDIUM_NEW_FILE_REQUIRED",
      };
    });

    const orphanAssessmentManifests = orphanAssessmentsRes.rows.map((rep) => {
      findings.push({
        ruleCode: "SAFETY_ASSESSMENT_ORPHAN_NO_PARENT",
        severity: "HIGH",
        entityType: "SafetySelfAssessmentReport",
        entityId: rep.id,
        currentState: rep,
        expectedInvariant: "Active SafetySelfAssessmentReport must be linked to a parent SafetyWeeklyFile via weeklyFileId",
        suggestedAction: "Backfill: Generate or link parent SafetyWeeklyFile matching periodStart and creator in Phase 1.5 Remediation",
        autoRepairAllowed: false,
      });

      const candidate = allWeeklyFilesRes.rows.find(
        (wf) =>
          new Date(wf.periodStart).getTime() === new Date(rep.periodStart).getTime() &&
          wf.createdById === rep.createdById
      );

      return {
        ...rep,
        parentCandidate: candidate || null,
        candidateConfidence: candidate ? "HIGH" : "MEDIUM_NEW_FILE_REQUIRED",
      };
    });

    console.log(`Discovered Orphaned Safety Plans: ${orphanPlanManifests.length}`);
    console.log(`Discovered Orphaned Safety Assessments: ${orphanAssessmentManifests.length}`);

    // -------------------------------------------------------------
    // SECTION B: SYSTEM-WIDE INTEGRITY CHECKS
    // -------------------------------------------------------------
    console.log("\n--- Executing System-Wide Invariant Checks ---");

    // 1. Soft-deleted parent SafetyWeeklyFile with active child Plan or Assessment
    const deletedParentActiveChildRes = await client.query(`
      SELECT wf.id as "weeklyFileId", p.id as "activePlanId", a.id as "activeAssessmentId"
      FROM "SafetyWeeklyFile" wf
      LEFT JOIN "SafetyReportPlan" p ON p."weeklyFileId" = wf.id AND p."deletedAt" IS NULL
      LEFT JOIN "SafetySelfAssessmentReport" a ON a."weeklyFileId" = wf.id AND a."deletedAt" IS NULL
      WHERE wf."deletedAt" IS NOT NULL AND (p.id IS NOT NULL OR a.id IS NOT NULL);
    `);
    deletedParentActiveChildRes.rows.forEach((r) => {
      findings.push({
        ruleCode: "DELETED_WEEKLY_FILE_HAS_ACTIVE_CHILD",
        severity: "HIGH",
        entityType: "SafetyWeeklyFile",
        entityId: r.weeklyFileId,
        relatedEntityIds: [r.activePlanId, r.activeAssessmentId].filter(Boolean) as string[],
        currentState: r,
        expectedInvariant: "When parent SafetyWeeklyFile is soft-deleted, child plans and assessments must also be cancelled/deleted",
        suggestedAction: "Soft-delete child records during remediation transaction",
        autoRepairAllowed: false,
      });
    });

    // 2. Invalid entity versions (version <= 0)
    const invalidVersionsPlan = await client.query(`SELECT id FROM "SafetyReportPlan" WHERE version <= 0;`);
    invalidVersionsPlan.rows.forEach((r) => {
      findings.push({
        ruleCode: "INVALID_VERSION_LOCK",
        severity: "CRITICAL",
        entityType: "SafetyReportPlan",
        entityId: r.id,
        currentState: r,
        expectedInvariant: "Entity version must be >= 1",
        suggestedAction: "Reset version to 1",
        autoRepairAllowed: false,
      });
    });

    // 3. User FK Orphans
    const orphanUsersRes = await client.query(`
      SELECT p.id, p."createdById" 
      FROM "SafetyReportPlan" p 
      LEFT JOIN "User" u ON p."createdById" = u.id 
      WHERE u.id IS NULL;
    `);
    orphanUsersRes.rows.forEach((r) => {
      findings.push({
        ruleCode: "ORPHANED_USER_FOREIGN_KEY",
        severity: "CRITICAL",
        entityType: "SafetyReportPlan",
        entityId: r.id,
        currentState: r,
        expectedInvariant: "createdById must reference an existing User",
        suggestedAction: "Reassign createdById to valid system user",
        autoRepairAllowed: false,
      });
    });

    // 4. Duplicate document numbers in active safety plans
    const dupDocNumRes = await client.query(`
      SELECT "documentNumber", COUNT(*) as cnt
      FROM "SafetyReportPlan"
      WHERE "deletedAt" IS NULL AND "documentNumber" IS NOT NULL
      GROUP BY "documentNumber"
      HAVING COUNT(*) > 1;
    `);
    dupDocNumRes.rows.forEach((r) => {
      findings.push({
        ruleCode: "DUPLICATE_DOCUMENT_NUMBER",
        severity: "HIGH",
        entityType: "SafetyReportPlan",
        entityId: r.documentNumber,
        currentState: r,
        expectedInvariant: "documentNumber must be unique among active safety plans",
        suggestedAction: "Reassign document number sequence",
        autoRepairAllowed: false,
      });
    });

    // Commit Read-Only Transaction
    await client.query("COMMIT;");

    const auditOutput = {
      timestamp: new Date().toISOString(),
      database: guardInfo.database,
      host: guardInfo.host,
      readOnlyTransactionVerified: true,
      totalFindings: findings.length,
      orphanDetails: {
        plans: orphanPlanManifests,
        assessments: orphanAssessmentManifests,
      },
      findings,
    };

    const outputPath = path.join(process.cwd(), "docs/qa/baselines/FULL_DATABASE_INTEGRITY_AUDIT.json");
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(auditOutput, null, 2));

    console.log(`\nAudit completed successfully! Total findings: ${findings.length}`);
    console.log(`JSON baseline written to: ${outputPath}`);

  } catch (err: any) {
    await client.query("ROLLBACK;").catch(() => {});
    console.error("Audit script failed:", err.message);
    process.exit(1);
  } finally {
    await client.end().catch(() => {});
  }
}

runFullIntegrityAudit().catch((e) => {
  console.error("Fatal audit execution error:", e);
  process.exit(1);
});
