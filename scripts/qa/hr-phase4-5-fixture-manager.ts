import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import dotenv from "dotenv";

if (fs.existsSync(path.join(process.cwd(), ".env.hr-qa.local"))) {
  dotenv.config({ path: ".env.hr-qa.local", override: true });
}

function getQaDatabaseUrl(): string {
  const url = process.env.QA_DATABASE_URL;
  if (!url) {
    throw new Error("[FixtureManager] Safety Guard: QA_DATABASE_URL environment variable is missing! Execution blocked.");
  }
  if (!url.includes("construction_erp_v2_hr_qa")) {
    throw new Error("[FixtureManager] Safety Guard: FixtureManager can ONLY run against a database named 'construction_erp_v2_hr_qa'! Execution blocked.");
  }
  return url;
}

export function getMaskedFingerprint(url: string): string {
  try {
    const parsed = new URL(url);
    const role = parsed.username || "role";
    const host = parsed.hostname || "host";
    const port = parsed.port || "5432";
    const db = parsed.pathname.replace(/^\//, "") || "db";
    return `postgresql://${role}:****@${host}:${port}/${db}?schema=public`;
  } catch {
    return "postgresql://<role>:****@<host>:<port>/<database>?schema=public";
  }
}

export interface ManifestData {
  runId: string;
  databaseFingerprint: string;
  created: {
    User: string[];
    Employee: string[];
    OrganizationUnit: string[];
    Position: string[];
    ProjectPersonnelRole: string[];
    Project: string[];
    EmployeeOrganizationAssignment: string[];
    OrganizationUnitManagerAssignment: string[];
    EmployeeProjectAssignment: string[];
    EmployeeChangeHistory: string[];
    AuditLog: string[];
    UserAccessGrant: string[];
    ProjectMember: string[];
  };
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
    this.connStr = getQaDatabaseUrl();
  }

  private async getClient() {
    const pgModulePath = require.resolve("pg", { paths: [process.cwd()] });
    const { Client } = require(pgModulePath);
    const client = new Client({ connectionString: this.connStr });
    await client.connect();
    return client;
  }

  public async setup(runId?: string): Promise<{ runId: string; manifest: ManifestData; rows: EntityManifestRow[] }> {
    const activeRunId = runId || `HR_PHASE_4_5_5_${Date.now()}_${randomUUID().substring(0, 8)}`;
    console.log(`[FixtureManager] Starting --setup with RunId: ${activeRunId}`);

    const client = await this.getClient();

    try {
      // Record BEFORE counts
      const beforeAssignments = parseInt((await client.query(`SELECT COUNT(*) FROM "EmployeeProjectAssignment"`)).rows[0].count, 10);
      const beforeEmployees = parseInt((await client.query(`SELECT COUNT(*) FROM "Employee"`)).rows[0].count, 10);
      const beforeUnits = parseInt((await client.query(`SELECT COUNT(*) FROM "OrganizationUnit"`)).rows[0].count, 10);
      const beforeUsers = parseInt((await client.query(`SELECT COUNT(*) FROM "User"`)).rows[0].count, 10);
      const beforeProjects = parseInt((await client.query(`SELECT COUNT(*) FROM "Project"`)).rows[0].count, 10);

      const createdManifest: ManifestData = {
        runId: activeRunId,
        databaseFingerprint: getMaskedFingerprint(this.connStr),
        created: {
          User: [],
          Employee: [],
          OrganizationUnit: [],
          Position: [],
          ProjectPersonnelRole: [],
          Project: [],
          EmployeeOrganizationAssignment: [],
          OrganizationUnitManagerAssignment: [],
          EmployeeProjectAssignment: [],
          EmployeeChangeHistory: [],
          AuditLog: [],
          UserAccessGrant: [],
          ProjectMember: [],
        },
      };

      // 1. Seed 6 Users (Roles: ADMIN, DIRECTOR, DEPUTY_DIRECTOR, MANAGER, CHIEF_COMMANDER, STAFF)
      const roles = [
        { role: "ADMIN", name: "Nguyễn Văn Quan" },
        { role: "DIRECTOR", name: "Trần Văn Đô" },
        { role: "DEPUTY_DIRECTOR", name: "Lê Thị Phó" },
        { role: "MANAGER", name: "Phạm Văn Trưởng" },
        { role: "CHIEF_COMMANDER", name: "Hoàng Văn Chỉ" },
        { role: "STAFF", name: "Vũ Văn Viên" },
      ];

      for (const r of roles) {
        const id = `usr_${r.role.toLowerCase()}_${activeRunId}`;
        const email = `qa_${r.role.toLowerCase()}_${activeRunId}@construction.local`;
        await client.query(
          `INSERT INTO "User" (id, email, password, name, role, "updatedAt")
           VALUES ($1, $2, $3, $4, $5, NOW())`,
          [id, email, "$2a$10$UnusedHashedPasswordKeyQA", r.name, r.role]
        );
        createdManifest.created.User.push(id);
      }

      // 2. Seed 3 Org Units with natural Vietnamese names
      const idRoot = `ou_root_${activeRunId}`;
      await client.query(
        `INSERT INTO "OrganizationUnit" (id, code, name, description, "updatedAt")
         VALUES ($1, $2, $3, $4, NOW())`,
        [idRoot, `OU_ROOT_${activeRunId}`, `Khối Điều hành & Thi công`, `Ghi chú nội bộ tổ chức`]
      );
      createdManifest.created.OrganizationUnit.push(idRoot);

      const idChild1 = `ou_child1_${activeRunId}`;
      await client.query(
        `INSERT INTO "OrganizationUnit" (id, code, name, "parentId", "updatedAt")
         VALUES ($1, $2, $3, $4, NOW())`,
        [idChild1, `OU_CHILD1_${activeRunId}`, `Phòng Dự án Công trình`, idRoot]
      );
      createdManifest.created.OrganizationUnit.push(idChild1);

      const idChild2 = `ou_child2_${activeRunId}`;
      await client.query(
        `INSERT INTO "OrganizationUnit" (id, code, name, "parentId", "updatedAt")
         VALUES ($1, $2, $3, $4, NOW())`,
        [idChild2, `OU_CHILD2_${activeRunId}`, `Ban Chỉ huy Công trường`, idRoot]
      );
      createdManifest.created.OrganizationUnit.push(idChild2);

      // 3. Seed 4 Positions with natural Vietnamese titles
      const positions = [
        { code: `POS_DIR_${activeRunId}`, title: "Giám đốc", level: 1 },
        { code: `POS_MGR_${activeRunId}`, title: "Trưởng phòng", level: 2 },
        { code: `POS_LEAD_${activeRunId}`, title: "Tổ trưởng", level: 3 },
        { code: `POS_STAFF_${activeRunId}`, title: "Nhân viên", level: 4 },
      ];
      for (let i = 0; i < positions.length; i++) {
        const posId = `pos_${i}_${activeRunId}`;
        await client.query(
          `INSERT INTO "Position" (id, code, title, level, "updatedAt")
           VALUES ($1, $2, $3, $4, NOW())`,
          [posId, positions[i].code, positions[i].title, positions[i].level]
        );
        createdManifest.created.Position.push(posId);
      }

      // 4. Seed 8 Employees (7 ACTIVE, 1 RESIGNED)
      // Emp 1-3: ACTIVE assigned to active project
      // Emp 4-7: ACTIVE unassigned (4 employees)
      // Emp 8: RESIGNED assigned to closed project
      const empConfigs = [
        { name: "Nguyễn Văn An", status: "ACTIVE" },
        { name: "Trần Thị Bình", status: "ACTIVE" },
        { name: "Lê Văn Cường", status: "ACTIVE" },
        { name: "Phạm Minh Đức", status: "ACTIVE" }, // Unassigned #1
        { name: "Hoàng Thị Em", status: "ACTIVE" },  // Unassigned #2
        { name: "Vũ Quốc Phong", status: "ACTIVE" }, // Unassigned #3
        { name: "Đặng Văn Giang", status: "ACTIVE" },// Unassigned #4
        { name: "Bùi Thị Hà", status: "RESIGNED" },
      ];

      for (let i = 1; i <= 8; i++) {
        const empId = `emp_${i}_${activeRunId}`;
        const empCode = `NV-QA-${activeRunId.slice(-4)}-${i}`;
        const cfg = empConfigs[i - 1];

        await client.query(
          `INSERT INTO "Employee" (
             id, code, "fullName", "joinedDate", status,
             "identityNumberEncrypted", "identityNumberBlindIndex", "identityNumberLastDigits",
             "personalEmail", "updatedAt"
           ) VALUES (
             $1, $2, $3, NOW(), $4,
             $5, $6, $7,
             $8, NOW()
           )`,
          [
            empId,
            empCode,
            cfg.name,
            cfg.status,
            `QA_CCCD_${activeRunId}_${i}`,
            `blind_index_qa_cccd_${activeRunId}_${i}`,
            `789${i}`,
            `qa_emp_${i}_${activeRunId}@construction.local`,
          ]
        );
        createdManifest.created.Employee.push(empId);

        // Employee Primary Org Assignment
        const eoaId = `eoa_${i}_${activeRunId}`;
        await client.query(
          `INSERT INTO "EmployeeOrganizationAssignment" (
             id, "employeeId", "organizationUnitId", "positionId", "startDate", "isPrimary", notes
           ) VALUES ($1, $2, $3, $4, NOW(), true, $5)`,
          [
            eoaId,
            empId,
            i % 2 === 0 ? idChild1 : idChild2,
            createdManifest.created.Position[i % 4],
            `Primary assignment QA fixture`,
          ]
        );
        createdManifest.created.EmployeeOrganizationAssignment.push(eoaId);
      }

      // 5. Seed 2 Unit Manager Assignments
      const mga1 = `mga_1_${activeRunId}`;
      await client.query(
        `INSERT INTO "OrganizationUnitManagerAssignment" (
           id, "organizationUnitId", "employeeId", "startDate", "isPrimary", "decisionNo"
         ) VALUES ($1, $2, $3, NOW(), true, $4)`,
        [mga1, idChild1, createdManifest.created.Employee[0], `DEC_MGR1_${activeRunId}`]
      );
      createdManifest.created.OrganizationUnitManagerAssignment.push(mga1);

      const mga2 = `mga_2_${activeRunId}`;
      await client.query(
        `INSERT INTO "OrganizationUnitManagerAssignment" (
           id, "organizationUnitId", "employeeId", "startDate", "isPrimary", "decisionNo"
         ) VALUES ($1, $2, $3, NOW(), true, $4)`,
        [mga2, idChild2, createdManifest.created.Employee[1], `DEC_MGR2_${activeRunId}`]
      );
      createdManifest.created.OrganizationUnitManagerAssignment.push(mga2);

      // 6. Seed 3 Projects
      const idPrjActive = `prj_active_${activeRunId}`;
      await client.query(
        `INSERT INTO "Project" (id, code, name, status, "updatedAt")
         VALUES ($1, $2, $3, 'ACTIVE', NOW())`,
        [idPrjActive, `PRJ_XP_${activeRunId}`, `Dự án Chung cư Xuân Phương`]
      );
      createdManifest.created.Project.push(idPrjActive);

      const idPrjFuture = `prj_future_${activeRunId}`;
      await client.query(
        `INSERT INTO "Project" (id, code, name, status, "updatedAt")
         VALUES ($1, $2, $3, 'PLANNING', NOW())`,
        [idPrjFuture, `PRJ_MD_${activeRunId}`, `Dự án Khu đô thị Mỹ Đình`]
      );
      createdManifest.created.Project.push(idPrjFuture);

      const idPrjClosed = `prj_closed_${activeRunId}`;
      await client.query(
        `INSERT INTO "Project" (id, code, name, status, "updatedAt")
         VALUES ($1, $2, $3, 'COMPLETED', NOW())`,
        [idPrjClosed, `PRJ_VD3_${activeRunId}`, `Dự án Cầu đường Vành Đai 3`]
      );
      createdManifest.created.Project.push(idPrjClosed);

      // 7. Seed 3 Project Personnel Roles
      const pprPM = `ppr_pm_${activeRunId}`;
      await client.query(
        `INSERT INTO "ProjectPersonnelRole" (id, code, name, "updatedAt") VALUES ($1, $2, $3, NOW())`,
        [pprPM, `PPR_PM_${activeRunId}`, `Chỉ huy trưởng`]
      );
      createdManifest.created.ProjectPersonnelRole.push(pprPM);

      const pprSup = `ppr_sup_${activeRunId}`;
      await client.query(
        `INSERT INTO "ProjectPersonnelRole" (id, code, name, "updatedAt") VALUES ($1, $2, $3, NOW())`,
        [pprSup, `PPR_SUP_${activeRunId}`, `Giám sát trưởng`]
      );
      createdManifest.created.ProjectPersonnelRole.push(pprSup);

      const pprEng = `ppr_eng_${activeRunId}`;
      await client.query(
        `INSERT INTO "ProjectPersonnelRole" (id, code, name, "updatedAt") VALUES ($1, $2, $3, NOW())`,
        [pprEng, `PPR_ENG_${activeRunId}`, `Kỹ sư công trình`]
      );
      createdManifest.created.ProjectPersonnelRole.push(pprEng);

      // 8. Seed EmployeeProjectAssignments
      // Emp 1: Active assignment on active project
      // Emp 2: Active assignment on active project
      // Emp 3: Active assignment on active project
      // Emp 1: Future assignment on planning project
      // Emp 8: Completed assignment on closed project
      const assignmentScenarios = [
        { empIdx: 0, prj: idPrjActive, role: pprPM, status: "ACTIVE", alloc: 100, startDate: new Date(), exp: null },
        { empIdx: 1, prj: idPrjActive, role: pprSup, status: "ACTIVE", alloc: 50, startDate: new Date(), exp: null },
        { empIdx: 2, prj: idPrjActive, role: pprEng, status: "ACTIVE", alloc: 100, startDate: new Date(), exp: null },
        { empIdx: 0, prj: idPrjFuture, role: pprPM, status: "ACTIVE", alloc: 100, startDate: new Date(Date.now() + 30 * 86400000), exp: new Date(Date.now() + 90 * 86400000) },
        { empIdx: 7, prj: idPrjClosed, role: pprSup, status: "COMPLETED", alloc: 100, startDate: new Date(Date.now() - 60 * 86400000), exp: new Date(Date.now() - 10 * 86400000) },
      ];

      for (let i = 0; i < assignmentScenarios.length; i++) {
        const sc = assignmentScenarios[i];
        const epaId = `epa_${i + 1}_${activeRunId}`;
        await client.query(
          `INSERT INTO "EmployeeProjectAssignment" (
             id, "employeeId", "projectId", "projectPersonnelRoleId", "startDate", "expectedEndDate",
             "allocationPercentage", status, notes, "updatedAt"
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
          [
            epaId,
            createdManifest.created.Employee[sc.empIdx],
            sc.prj,
            sc.role,
            sc.startDate,
            sc.exp,
            sc.alloc,
            sc.status,
            `Assignment fixture QA`,
          ]
        );
        createdManifest.created.EmployeeProjectAssignment.push(epaId);
      }

      // Write Manifest Files
      const manifestDir = path.join(process.cwd(), "scripts", "qa", "manifests");
      if (!fs.existsSync(manifestDir)) {
        fs.mkdirSync(manifestDir, { recursive: true });
      }
      const manifestPath = path.join(manifestDir, `manifest-${activeRunId}.json`);
      const linkPath = path.join(process.cwd(), ".current_fixture_manifest.json");

      fs.writeFileSync(manifestPath, JSON.stringify(createdManifest, null, 2), "utf8");
      fs.writeFileSync(linkPath, JSON.stringify(createdManifest, null, 2), "utf8");
      fs.writeFileSync(path.join(process.cwd(), ".current_fixture_run_id"), activeRunId, "utf8");

      // Record AFTER counts
      const afterAssignments = parseInt((await client.query(`SELECT COUNT(*) FROM "EmployeeProjectAssignment"`)).rows[0].count, 10);
      const afterEmployees = parseInt((await client.query(`SELECT COUNT(*) FROM "Employee"`)).rows[0].count, 10);
      const afterUnits = parseInt((await client.query(`SELECT COUNT(*) FROM "OrganizationUnit"`)).rows[0].count, 10);
      const afterUsers = parseInt((await client.query(`SELECT COUNT(*) FROM "User"`)).rows[0].count, 10);
      const afterProjects = parseInt((await client.query(`SELECT COUNT(*) FROM "Project"`)).rows[0].count, 10);

      const rows: EntityManifestRow[] = [
        { entity: "User", before: beforeUsers, created: createdManifest.created.User.length, deleted: 0, remainingByRunId: createdManifest.created.User.length, after: afterUsers },
        { entity: "Employee", before: beforeEmployees, created: createdManifest.created.Employee.length, deleted: 0, remainingByRunId: createdManifest.created.Employee.length, after: afterEmployees },
        { entity: "OrganizationUnit", before: beforeUnits, created: createdManifest.created.OrganizationUnit.length, deleted: 0, remainingByRunId: createdManifest.created.OrganizationUnit.length, after: afterUnits },
        { entity: "Project", before: beforeProjects, created: createdManifest.created.Project.length, deleted: 0, remainingByRunId: createdManifest.created.Project.length, after: afterProjects },
        { entity: "EmployeeProjectAssignment", before: beforeAssignments, created: createdManifest.created.EmployeeProjectAssignment.length, deleted: 0, remainingByRunId: createdManifest.created.EmployeeProjectAssignment.length, after: afterAssignments },
      ];

      console.log(`[FixtureManager] Setup completed for RunId: ${activeRunId}`);
      console.log(`[FixtureManager] Manifest saved to: ${manifestPath}`);
      console.table(rows);

      return { runId: activeRunId, manifest: createdManifest, rows };
    } finally {
      await client.end();
    }
  }

  public async cleanup(runIdOrPath?: string): Promise<EntityManifestRow[]> {
    const linkPath = path.join(process.cwd(), ".current_fixture_manifest.json");
    let manifestFile = linkPath;

    if (runIdOrPath && fs.existsSync(runIdOrPath)) {
      manifestFile = runIdOrPath;
    } else if (runIdOrPath) {
      const p = path.join(process.cwd(), "scripts", "qa", "manifests", `manifest-${runIdOrPath}.json`);
      if (fs.existsSync(p)) manifestFile = p;
    }

    if (!fs.existsSync(manifestFile)) {
      console.warn(`[FixtureManager] Warning: No manifest file found at ${manifestFile}. Skipping cleanup.`);
      return [];
    }

    const manifest: ManifestData = JSON.parse(fs.readFileSync(manifestFile, "utf8"));
    console.log(`[FixtureManager] Starting --cleanup from Manifest RunId: ${manifest.runId}`);

    const client = await this.getClient();

    try {
      const c = manifest.created;

      // Exact ID Deletions in Reverse Foreign Key Order
      if (c.EmployeeProjectAssignment?.length) {
        await client.query(`DELETE FROM "EmployeeProjectAssignment" WHERE id = ANY($1::text[])`, [c.EmployeeProjectAssignment]);
      }
      if (c.OrganizationUnitManagerAssignment?.length) {
        await client.query(`DELETE FROM "OrganizationUnitManagerAssignment" WHERE id = ANY($1::text[])`, [c.OrganizationUnitManagerAssignment]);
      }
      if (c.EmployeeOrganizationAssignment?.length) {
        await client.query(`DELETE FROM "EmployeeOrganizationAssignment" WHERE id = ANY($1::text[])`, [c.EmployeeOrganizationAssignment]);
      }
      if (c.EmployeeChangeHistory?.length) {
        await client.query(`DELETE FROM "EmployeeChangeHistory" WHERE id = ANY($1::text[])`, [c.EmployeeChangeHistory]);
      }
      if (c.AuditLog?.length) {
        await client.query(`DELETE FROM "AuditLog" WHERE id = ANY($1::text[])`, [c.AuditLog]);
      }
      if (c.UserAccessGrant?.length) {
        await client.query(`DELETE FROM "UserAccessGrant" WHERE id = ANY($1::text[])`, [c.UserAccessGrant]);
      }
      if (c.ProjectMember?.length) {
        await client.query(`DELETE FROM "ProjectMember" WHERE id = ANY($1::text[])`, [c.ProjectMember]);
      }
      if (c.Employee?.length) {
        await client.query(`DELETE FROM "Employee" WHERE id = ANY($1::text[])`, [c.Employee]);
      }
      if (c.User?.length) {
        await client.query(`DELETE FROM "User" WHERE id = ANY($1::text[])`, [c.User]);
      }
      if (c.Position?.length) {
        await client.query(`DELETE FROM "Position" WHERE id = ANY($1::text[])`, [c.Position]);
      }
      if (c.OrganizationUnit?.length) {
        await client.query(`DELETE FROM "OrganizationUnit" WHERE id = ANY($1::text[])`, [c.OrganizationUnit]);
      }
      if (c.ProjectPersonnelRole?.length) {
        await client.query(`DELETE FROM "ProjectPersonnelRole" WHERE id = ANY($1::text[])`, [c.ProjectPersonnelRole]);
      }
      if (c.Project?.length) {
        await client.query(`DELETE FROM "Project" WHERE id = ANY($1::text[])`, [c.Project]);
      }

      // Verify ZERO RESIDUE by Exact Manifest IDs
      const remAssignments = c.EmployeeProjectAssignment?.length
        ? parseInt((await client.query(`SELECT COUNT(*) FROM "EmployeeProjectAssignment" WHERE id = ANY($1::text[])`, [c.EmployeeProjectAssignment])).rows[0].count, 10)
        : 0;
      const remEmployees = c.Employee?.length
        ? parseInt((await client.query(`SELECT COUNT(*) FROM "Employee" WHERE id = ANY($1::text[])`, [c.Employee])).rows[0].count, 10)
        : 0;
      const remUnits = c.OrganizationUnit?.length
        ? parseInt((await client.query(`SELECT COUNT(*) FROM "OrganizationUnit" WHERE id = ANY($1::text[])`, [c.OrganizationUnit])).rows[0].count, 10)
        : 0;
      const remUsers = c.User?.length
        ? parseInt((await client.query(`SELECT COUNT(*) FROM "User" WHERE id = ANY($1::text[])`, [c.User])).rows[0].count, 10)
        : 0;
      const remProjects = c.Project?.length
        ? parseInt((await client.query(`SELECT COUNT(*) FROM "Project" WHERE id = ANY($1::text[])`, [c.Project])).rows[0].count, 10)
        : 0;

      const rows: EntityManifestRow[] = [
        { entity: "User", before: c.User.length, created: c.User.length, deleted: c.User.length - remUsers, remainingByRunId: remUsers, after: 0 },
        { entity: "Employee", before: c.Employee.length, created: c.Employee.length, deleted: c.Employee.length - remEmployees, remainingByRunId: remEmployees, after: 0 },
        { entity: "OrganizationUnit", before: c.OrganizationUnit.length, created: c.OrganizationUnit.length, deleted: c.OrganizationUnit.length - remUnits, remainingByRunId: remUnits, after: 0 },
        { entity: "Project", before: c.Project.length, created: c.Project.length, deleted: c.Project.length - remProjects, remainingByRunId: remProjects, after: 0 },
        { entity: "EmployeeProjectAssignment", before: c.EmployeeProjectAssignment.length, created: c.EmployeeProjectAssignment.length, deleted: c.EmployeeProjectAssignment.length - remAssignments, remainingByRunId: remAssignments, after: 0 },
      ];

      console.log(`[FixtureManager] Cleanup completed for Manifest RunId: ${manifest.runId}`);
      console.table(rows);

      for (const row of rows) {
        if (row.remainingByRunId !== 0) {
          throw new Error(`[FixtureManager] Teardown residue assertion failed! Entity ${row.entity} has ${row.remainingByRunId} remaining records for manifest runId ${manifest.runId}`);
        }
      }

      // Cleanup local manifest files after zero residue verification
      if (fs.existsSync(linkPath)) fs.unlinkSync(linkPath);
      if (fs.existsSync(manifestFile)) fs.unlinkSync(manifestFile);
      const runIdFile = path.join(process.cwd(), ".current_fixture_run_id");
      if (fs.existsSync(runIdFile)) fs.unlinkSync(runIdFile);

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
      console.log(`[FixtureManager] Setup finished with RunId: ${runId}`);
    }).catch((err) => {
      console.error("[FixtureManager] Setup failed:", err);
      process.exit(1);
    });
  } else if (args.includes("--cleanup")) {
    manager.cleanup().then(() => {
      console.log("[FixtureManager] Exact manifest zero residue verified 🚀");
    }).catch((err) => {
      console.error("[FixtureManager] Cleanup failed:", err);
      process.exit(1);
    });
  } else {
    // Default mode: full setup & cleanup lifecycle test
    let activeRunId = "";
    manager.setup()
      .then(({ runId }) => {
        activeRunId = runId;
        return manager.cleanup(runId);
      })
      .then(() => {
        console.log(`[FixtureManager] Lifecycle test complete for ${activeRunId} 🚀`);
      })
      .catch((err) => {
        console.error("[FixtureManager] Lifecycle test failed:", err);
        process.exit(1);
      });
  }
}
