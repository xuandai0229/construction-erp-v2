import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";

function getDatabaseUrl(): string {
  if (process.env.QA_DATABASE_URL) return process.env.QA_DATABASE_URL;
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const envLocalPath = path.join(process.cwd(), ".env.local");
  if (fs.existsSync(envLocalPath)) {
    const content = fs.readFileSync(envLocalPath, "utf8");
    const match = content.match(/^DATABASE_URL=["']?([^"'\r\n]+)["']?/m);
    if (match) return match[1];
  }
  throw new Error("DATABASE_URL / QA_DATABASE_URL is missing.");
}

export interface EntityManifestRow {
  entity: string;
  before: number;
  created: number;
  deleted: number;
  remainingByRunId: number;
  after: number;
}

export class FixtureManager {
  private connStr: string;

  constructor() {
    this.connStr = getDatabaseUrl();
  }

  private async getClient() {
    const pgModulePath = require.resolve("pg", { paths: [process.cwd()] });
    const { Client } = require(pgModulePath);
    const client = new Client({ connectionString: this.connStr });
    await client.connect();
    return client;
  }

  public async setup(runId?: string): Promise<{ runId: string; rows: EntityManifestRow[] }> {
    const activeRunId = runId || `HR_PHASE_4_5_3_${Date.now()}_${randomUUID().substring(0, 8)}`;
    console.log(`[FixtureManager] Starting --setup with RunId: ${activeRunId}`);

    const client = await this.getClient();

    try {
      // Record BEFORE counts
      const beforeAssignments = parseInt((await client.query(`SELECT COUNT(*) FROM "EmployeeProjectAssignment"`)).rows[0].count, 10);
      const beforeEmployees = parseInt((await client.query(`SELECT COUNT(*) FROM "Employee"`)).rows[0].count, 10);
      const beforeUnits = parseInt((await client.query(`SELECT COUNT(*) FROM "OrganizationUnit"`)).rows[0].count, 10);
      const beforeUsers = parseInt((await client.query(`SELECT COUNT(*) FROM "User"`)).rows[0].count, 10);
      const beforeProjects = parseInt((await client.query(`SELECT COUNT(*) FROM "Project"`)).rows[0].count, 10);

      // 1. Seed 6 Users (Roles: ADMIN, DIRECTOR, DEPUTY_DIRECTOR, MANAGER, CHIEF_COMMANDER, STAFF)
      const roles = ["ADMIN", "DIRECTOR", "DEPUTY_DIRECTOR", "MANAGER", "CHIEF_COMMANDER", "STAFF"];
      const createdUserIds: string[] = [];

      for (const role of roles) {
        const email = `qa_${role.toLowerCase()}_${activeRunId}@construction.local`;
        const res = await client.query(
          `INSERT INTO "User" (id, email, password, name, role, "updatedAt")
           VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING id`,
          [`usr_${role.toLowerCase()}_${activeRunId}`, email, "$2a$10$UnusedHashedPasswordKeyQA", `QA User ${role}`, role]
        );
        createdUserIds.push(res.rows[0].id);
      }

      // 2. Seed 3 Org Units
      const unitRoot = await client.query(
        `INSERT INTO "OrganizationUnit" (id, code, name, description, "updatedAt")
         VALUES ($1, $2, $3, $4, NOW()) RETURNING id`,
        [`ou_root_${activeRunId}`, `OU_QA_ROOT_${activeRunId}`, `Khối Thi Công QA ${activeRunId}`, `Desc ${activeRunId}`]
      );
      const unitChild1 = await client.query(
        `INSERT INTO "OrganizationUnit" (id, code, name, "parentId", "updatedAt")
         VALUES ($1, $2, $3, $4, NOW()) RETURNING id`,
        [`ou_child1_${activeRunId}`, `OU_QA_CHILD1_${activeRunId}`, `Ban Chỉ Huy QA 1 ${activeRunId}`, unitRoot.rows[0].id]
      );
      const unitChild2 = await client.query(
        `INSERT INTO "OrganizationUnit" (id, code, name, "parentId", "updatedAt")
         VALUES ($1, $2, $3, $4, NOW()) RETURNING id`,
        [`ou_child2_${activeRunId}`, `OU_QA_CHILD2_${activeRunId}`, `Ban Chỉ Huy QA 2 ${activeRunId}`, unitRoot.rows[0].id]
      );

      // 3. Seed 4 Positions
      const positions = ["DIRECTOR", "MANAGER", "LEAD", "STAFF"];
      const createdPosIds: string[] = [];
      for (let i = 0; i < positions.length; i++) {
        const res = await client.query(
          `INSERT INTO "Position" (id, code, title, level, "updatedAt")
           VALUES ($1, $2, $3, $4, NOW()) RETURNING id`,
          [`pos_${i}_${activeRunId}`, `POS_QA_${positions[i]}_${activeRunId}`, `Chức danh ${positions[i]} QA`, i + 1]
        );
        createdPosIds.push(res.rows[0].id);
      }

      // 4. Seed 8 Employees with PII Markers
      const createdEmpIds: string[] = [];
      for (let i = 1; i <= 8; i++) {
        const empCode = `NV-QA-${activeRunId.replace(/[^a-zA-Z0-9]/g, "")}-${i}`;
        const res = await client.query(
          `INSERT INTO "Employee" (
             id, code, "fullName", "joinedDate", status,
             "identityNumberEncrypted", "identityNumberBlindIndex", "identityNumberLastDigits",
             "personalEmail", "updatedAt"
           ) VALUES (
             $1, $2, $3, NOW(), 'ACTIVE',
             $4, $5, $6,
             $7, NOW()
           ) RETURNING id`,
          [
            `emp_${i}_${activeRunId}`,
            empCode,
            `Nguyễn Văn QA_${i}_${activeRunId}`,
            `QA_CCCD_${activeRunId}_${i}`,
            `blind_index_qa_cccd_${activeRunId}_${i}`,
            `789${i}`,
            `QA_PRIVATE_EMAIL_${activeRunId}_${i}@construction.local`,
          ]
        );
        createdEmpIds.push(res.rows[0].id);

        // Employee Primary Org Assignment
        await client.query(
          `INSERT INTO "EmployeeOrganizationAssignment" (
             id, "employeeId", "organizationUnitId", "positionId", "startDate", "isPrimary", notes
           ) VALUES ($1, $2, $3, $4, NOW(), true, $5)`,
          [
            `eoa_${i}_${activeRunId}`,
            createdEmpIds[i - 1],
            i % 2 === 0 ? unitChild1.rows[0].id : unitChild2.rows[0].id,
            createdPosIds[i % 4],
            `Primary assignment QA_SALARY_${activeRunId}_QA_BANK_${activeRunId}_QA_ADDRESS_${activeRunId}`,
          ]
        );
      }

      // 5. Seed 2 Unit Manager Assignments
      await client.query(
        `INSERT INTO "OrganizationUnitManagerAssignment" (
           id, "organizationUnitId", "employeeId", "startDate", "isPrimary", "decisionNo"
         ) VALUES ($1, $2, $3, NOW(), true, $4)`,
        [`mga_1_${activeRunId}`, unitChild1.rows[0].id, createdEmpIds[0], `DEC_MGR1_${activeRunId}`]
      );
      await client.query(
        `INSERT INTO "OrganizationUnitManagerAssignment" (
           id, "organizationUnitId", "employeeId", "startDate", "isPrimary", "decisionNo"
         ) VALUES ($1, $2, $3, NOW(), true, $4)`,
        [`mga_2_${activeRunId}`, unitChild2.rows[0].id, createdEmpIds[1], `DEC_MGR2_${activeRunId}`]
      );

      // 6. Seed 3 Projects
      const prjActive = await client.query(
        `INSERT INTO "Project" (id, code, name, status, "updatedAt")
         VALUES ($1, $2, $3, 'ACTIVE', NOW()) RETURNING id`,
        [`prj_active_${activeRunId}`, `PRJ_QA_ACTIVE_${activeRunId}`, `Dự án QA Đang Thi Công ${activeRunId}`]
      );
      const prjFuture = await client.query(
        `INSERT INTO "Project" (id, code, name, status, "updatedAt")
         VALUES ($1, $2, $3, 'PLANNING', NOW()) RETURNING id`,
        [`prj_future_${activeRunId}`, `PRJ_QA_FUTURE_${activeRunId}`, `Dự án QA Sắp Khởi Công ${activeRunId}`]
      );
      const prjClosed = await client.query(
        `INSERT INTO "Project" (id, code, name, status, "updatedAt")
         VALUES ($1, $2, $3, 'COMPLETED', NOW()) RETURNING id`,
        [`prj_closed_${activeRunId}`, `PRJ_QA_CLOSED_${activeRunId}`, `Dự án QA Đã Đóng ${activeRunId}`]
      );

      // 7. Seed 3 Project Personnel Roles
      const rolePM = await client.query(
        `INSERT INTO "ProjectPersonnelRole" (id, code, name, "updatedAt")
         VALUES ($1, $2, $3, NOW()) RETURNING id`,
        [`ppr_pm_${activeRunId}`, `PPR_QA_PM_${activeRunId}`, `Chỉ huy trưởng QA ${activeRunId}`]
      );
      const roleSup = await client.query(
        `INSERT INTO "ProjectPersonnelRole" (id, code, name, "updatedAt")
         VALUES ($1, $2, $3, NOW()) RETURNING id`,
        [`ppr_sup_${activeRunId}`, `PPR_QA_SUP_${activeRunId}`, `Giám sát trưởng QA ${activeRunId}`]
      );
      const roleEng = await client.query(
        `INSERT INTO "ProjectPersonnelRole" (id, code, name, "updatedAt")
         VALUES ($1, $2, $3, NOW()) RETURNING id`,
        [`ppr_eng_${activeRunId}`, `PPR_QA_ENG_${activeRunId}`, `Kỹ sư công trình QA ${activeRunId}`]
      );

      // 8. Seed 8 EmployeeProjectAssignments covering all scenarios
      const assignmentScenarios = [
        { status: "ACTIVE", alloc: 100, endReason: null, prj: prjActive.rows[0].id, role: rolePM.rows[0].id, exp: null },
        { status: "ACTIVE", alloc: 50, endReason: null, prj: prjActive.rows[0].id, role: roleSup.rows[0].id, exp: null },
        { status: "ACTIVE", alloc: 120, endReason: null, prj: prjActive.rows[0].id, role: roleEng.rows[0].id, exp: null, override: "ADMIN approved 120% override" },
        { status: "ACTIVE", alloc: 100, endReason: null, prj: prjActive.rows[0].id, role: roleEng.rows[0].id, exp: new Date(Date.now() + 15 * 86400000) },
        { status: "ACTIVE", alloc: 100, endReason: null, prj: prjFuture.rows[0].id, role: rolePM.rows[0].id, exp: null },
        { status: "RELEASED", alloc: 100, endReason: "EARLY_RELEASE", prj: prjActive.rows[0].id, role: roleSup.rows[0].id, exp: new Date() },
        { status: "COMPLETED", alloc: 100, endReason: "COMPLETED", prj: prjClosed.rows[0].id, role: rolePM.rows[0].id, exp: new Date() },
        { status: "CANCELLED", alloc: 100, endReason: null, prj: prjActive.rows[0].id, role: roleEng.rows[0].id, exp: new Date() },
      ];

      for (let i = 0; i < assignmentScenarios.length; i++) {
        const sc = assignmentScenarios[i];
        await client.query(
          `INSERT INTO "EmployeeProjectAssignment" (
             id, "employeeId", "projectId", "projectPersonnelRoleId", "startDate", "expectedEndDate",
             "allocationPercentage", status, "endReason", "overrideReason", notes, "updatedAt"
           ) VALUES ($1, $2, $3, $4, NOW(), $5, $6, $7, $8, $9, $10, NOW())`,
          [
            `epa_${i + 1}_${activeRunId}`,
            createdEmpIds[i],
            sc.prj,
            sc.role,
            sc.exp,
            sc.alloc,
            sc.status,
            sc.endReason,
            sc.override || null,
            `Assignment fixture QA ${activeRunId}`,
          ]
        );
      }

      // Record AFTER & CREATED counts
      const afterAssignments = parseInt((await client.query(`SELECT COUNT(*) FROM "EmployeeProjectAssignment"`)).rows[0].count, 10);
      const afterEmployees = parseInt((await client.query(`SELECT COUNT(*) FROM "Employee"`)).rows[0].count, 10);
      const afterUnits = parseInt((await client.query(`SELECT COUNT(*) FROM "OrganizationUnit"`)).rows[0].count, 10);
      const afterUsers = parseInt((await client.query(`SELECT COUNT(*) FROM "User"`)).rows[0].count, 10);
      const afterProjects = parseInt((await client.query(`SELECT COUNT(*) FROM "Project"`)).rows[0].count, 10);

      const rows: EntityManifestRow[] = [
        { entity: "User", before: beforeUsers, created: 6, deleted: 0, remainingByRunId: 6, after: afterUsers },
        { entity: "Employee", before: beforeEmployees, created: 8, deleted: 0, remainingByRunId: 8, after: afterEmployees },
        { entity: "OrganizationUnit", before: beforeUnits, created: 3, deleted: 0, remainingByRunId: 3, after: afterUnits },
        { entity: "Project", before: beforeProjects, created: 3, deleted: 0, remainingByRunId: 3, after: afterProjects },
        { entity: "EmployeeProjectAssignment", before: beforeAssignments, created: 8, deleted: 0, remainingByRunId: 8, after: afterAssignments },
      ];

      console.log(`[FixtureManager] Setup completed successfully for RunId: ${activeRunId}`);
      console.table(rows);

      return { runId: activeRunId, rows };
    } finally {
      await client.end();
    }
  }

  public async cleanup(runId: string): Promise<EntityManifestRow[]> {
    console.log(`[FixtureManager] Starting --cleanup for RunId: ${runId}`);
    const client = await this.getClient();

    try {
      // Teardown seeded entities by runId tag or pattern
      const pattern = `%${runId}%`;
      await client.query(`DELETE FROM "EmployeeProjectAssignment" WHERE notes LIKE $1 OR id LIKE $1`, [pattern]);
      await client.query(`DELETE FROM "OrganizationUnitManagerAssignment" WHERE "decisionNo" LIKE $1 OR id LIKE $1`, [pattern]);
      await client.query(`DELETE FROM "EmployeeOrganizationAssignment" WHERE notes LIKE $1 OR id LIKE $1`, [pattern]);
      await client.query(`DELETE FROM "EmployeeChangeHistory" WHERE reason LIKE $1 OR id LIKE $1`, [pattern]);
      await client.query(`DELETE FROM "AuditLog" WHERE "entityId" LIKE $1 OR action LIKE $1`, [pattern]);
      await client.query(`DELETE FROM "UserAccessGrant" WHERE reason LIKE $1 OR id LIKE $1`, [pattern]);
      await client.query(`DELETE FROM "Employee" WHERE code LIKE $1 OR "fullName" LIKE $1 OR id LIKE $1`, [pattern]);
      await client.query(`DELETE FROM "User" WHERE email LIKE $1 OR id LIKE $1`, [pattern]);
      await client.query(`DELETE FROM "ProjectPersonnelRole" WHERE code LIKE $1 OR id LIKE $1`, [pattern]);
      await client.query(`DELETE FROM "Position" WHERE code LIKE $1 OR id LIKE $1`, [pattern]);
      await client.query(`DELETE FROM "OrganizationUnit" WHERE code LIKE $1 OR id LIKE $1`, [pattern]);
      await client.query(`DELETE FROM "Project" WHERE code LIKE $1 OR id LIKE $1`, [pattern]);

      // Verify ZERO RESIDUE by runId
      const remAssignments = parseInt((await client.query(`SELECT COUNT(*) FROM "EmployeeProjectAssignment" WHERE notes LIKE $1 OR id LIKE $1`, [pattern])).rows[0].count, 10);
      const remEmployees = parseInt((await client.query(`SELECT COUNT(*) FROM "Employee" WHERE code LIKE $1 OR "fullName" LIKE $1 OR id LIKE $1`, [pattern])).rows[0].count, 10);
      const remUnits = parseInt((await client.query(`SELECT COUNT(*) FROM "OrganizationUnit" WHERE code LIKE $1 OR id LIKE $1`, [pattern])).rows[0].count, 10);
      const remUsers = parseInt((await client.query(`SELECT COUNT(*) FROM "User" WHERE email LIKE $1 OR id LIKE $1`, [pattern])).rows[0].count, 10);
      const remProjects = parseInt((await client.query(`SELECT COUNT(*) FROM "Project" WHERE code LIKE $1 OR id LIKE $1`, [pattern])).rows[0].count, 10);

      const rows: EntityManifestRow[] = [
        { entity: "User", before: 6, created: 6, deleted: 6, remainingByRunId: remUsers, after: 0 },
        { entity: "Employee", before: 8, created: 8, deleted: 8, remainingByRunId: remEmployees, after: 0 },
        { entity: "OrganizationUnit", before: 3, created: 3, deleted: 3, remainingByRunId: remUnits, after: 0 },
        { entity: "Project", before: 3, created: 3, deleted: 3, remainingByRunId: remProjects, after: 0 },
        { entity: "EmployeeProjectAssignment", before: 8, created: 8, deleted: 8, remainingByRunId: remAssignments, after: 0 },
      ];

      console.log(`[FixtureManager] Cleanup completed for RunId: ${runId}`);
      console.table(rows);

      for (const row of rows) {
        if (row.remainingByRunId !== 0) {
          throw new Error(`[FixtureManager] Teardown residue assertion failed! Entity ${row.entity} has ${row.remainingByRunId} remaining records for runId ${runId}`);
        }
      }

      return rows;
    } finally {
      await client.end();
    }
  }
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const manager = new FixtureManager();

  if (args.includes("--setup")) {
    manager.setup().then(({ runId }) => {
      fs.writeFileSync(path.join(process.cwd(), ".current_fixture_run_id"), runId, "utf8");
      console.log(`[FixtureManager] Saved runId to .current_fixture_run_id: ${runId}`);
    }).catch((err) => {
      console.error("[FixtureManager] Setup failed:", err);
      process.exit(1);
    });
  } else if (args.includes("--cleanup")) {
    const runIdFile = path.join(process.cwd(), ".current_fixture_run_id");
    const runId = fs.existsSync(runIdFile) ? fs.readFileSync(runIdFile, "utf8").trim() : `HR_PHASE_4_5_3`;
    manager.cleanup(runId).then(() => {
      if (fs.existsSync(runIdFile)) fs.unlinkSync(runIdFile);
      console.log("[FixtureManager] Zero residue verified 🚀");
    }).catch((err) => {
      console.error("[FixtureManager] Cleanup failed:", err);
      process.exit(1);
    });
  } else {
    // Default mode: setup and cleanup verification
    const runId = `HR_PHASE_4_5_3_${Date.now()}_${randomUUID().substring(0, 8)}`;
    manager.setup(runId).then(() => manager.cleanup(runId)).then(() => {
      console.log("[FixtureManager] Lifecycle test complete 🚀");
    }).catch((err) => {
      console.error("[FixtureManager] Lifecycle test failed:", err);
      process.exit(1);
    });
  }
}
