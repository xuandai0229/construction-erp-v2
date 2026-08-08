import "dotenv/config";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, EmployeeStatus } from "@prisma/client";
import { createProjectAssignment } from "../project-assignment-service";

describe("Source Org Destructive Hard-Delete E2E Test Suite", () => {
  let pool: Pool;
  let adapter: PrismaPg;
  let db: PrismaClient;

  const runId = `SRC_ORG_DESTRUCTIVE_${Date.now()}`;
  let unitAId: string;
  let unitBId: string;
  let positionId: string;
  let employeeId: string;
  let projectId: string;
  let roleId: string;
  let assignmentId: string;

  beforeAll(async () => {
    const connectionString = process.env.QA_DATABASE_URL || process.env.DATABASE_URL;
    pool = new Pool({ connectionString });
    adapter = new PrismaPg(pool);
    db = new PrismaClient({ adapter });

    // 1. Create Unit A & Unit B
    const unitA = await db.organizationUnit.create({
      data: {
        code: `UNIT_A_${runId}`,
        name: `Phong Ban Unit A ${runId}`,
      },
    });
    unitAId = unitA.id;

    const unitB = await db.organizationUnit.create({
      data: {
        code: `UNIT_B_${runId}`,
        name: `Phong Ban Unit B ${runId}`,
      },
    });
    unitBId = unitB.id;

    // 2. Create Position
    const pos = await db.position.create({
      data: {
        code: `POS_${runId}`,
        title: `Chuc danh Test ${runId}`,
      },
    });
    positionId = pos.id;

    // 3. Create Employee & assign to Unit A as primary
    const emp = await db.employee.create({
      data: {
        code: `NV_DESTRUCT_${runId}`,
        fullName: "Nguyen Van Destructive Test",
        joinedDate: new Date("2024-01-01"),
        status: EmployeeStatus.ACTIVE,
      },
    });
    employeeId = emp.id;

    await db.employeeOrganizationAssignment.create({
      data: {
        employeeId: emp.id,
        organizationUnitId: unitAId,
        positionId: positionId,
        startDate: new Date("2024-01-01"),
        isPrimary: true,
      },
    });

    // 4. Create Project & Role
    const prj = await db.project.create({
      data: {
        code: `PRJ_DEST_${runId}`,
        name: `Du An Destructive ${runId}`,
        status: "ACTIVE",
      },
    });
    projectId = prj.id;

    const r = await db.projectPersonnelRole.create({
      data: {
        code: `ROLE_DEST_${runId}`,
        name: `Kysu Destructive ${runId}`,
      },
    });
    roleId = r.id;
  });

  afterAll(async () => {
    if (db) {
      if (assignmentId) {
        await db.employeeProjectAssignment.deleteMany({ where: { id: assignmentId } });
      }
      if (employeeId) {
        await db.employeeOrganizationAssignment.deleteMany({ where: { employeeId } });
        await db.employee.deleteMany({ where: { id: employeeId } });
      }
      if (roleId) await db.projectPersonnelRole.deleteMany({ where: { id: roleId } });
      if (projectId) await db.project.deleteMany({ where: { id: projectId } });
      if (positionId) await db.position.deleteMany({ where: { id: positionId } });
      if (unitAId) await db.organizationUnit.deleteMany({ where: { id: unitAId } });
      if (unitBId) await db.organizationUnit.deleteMany({ where: { id: unitBId } });

      await db.$disconnect();
    }
    if (pool) await pool.end();
  });

  it("creates project assignment snapshotting Unit A, survives employee transfer to Unit B and hard-delete of Unit A", async () => {
    // Step A: Create assignment while Employee is in Unit A
    const created = await createProjectAssignment(db, {
      employeeId,
      projectId,
      projectPersonnelRoleId: roleId,
      startDate: new Date("2026-01-01"),
      allocationPercentage: 50,
    });
    assignmentId = created.id;

    // Assert initial snapshot
    expect(created.sourceOrgUnitId).toBe(unitAId);
    expect(created.sourceOrgUnitCodeSnapshot).toContain(`UNIT_A_${runId}`);
    expect(created.sourceOrgUnitNameSnapshot).toContain(`Phong Ban Unit A ${runId}`);

    // Step B: Transfer Employee primary org assignment to Unit B
    await db.employeeOrganizationAssignment.updateMany({
      where: { employeeId, isPrimary: true },
      data: { endDate: new Date("2026-06-01"), isPrimary: false },
    });

    await db.employeeOrganizationAssignment.create({
      data: {
        employeeId,
        organizationUnitId: unitBId,
        positionId,
        startDate: new Date("2026-06-01"),
        isPrimary: true,
      },
    });

    // Verify existing assignment snapshot remains Unit A
    const assAfterEmpTransfer = await db.employeeProjectAssignment.findUniqueOrThrow({
      where: { id: assignmentId },
    });
    expect(assAfterEmpTransfer.sourceOrgUnitId).toBe(unitAId);
    expect(assAfterEmpTransfer.sourceOrgUnitCodeSnapshot).toContain(`UNIT_A_${runId}`);
    expect(assAfterEmpTransfer.sourceOrgUnitNameSnapshot).toContain(`Phong Ban Unit A ${runId}`);

    // Step C: HARD DELETE Unit A (True Hard Delete)
    // First remove inactive EmployeeOrganizationAssignment linking to Unit A
    await db.employeeOrganizationAssignment.deleteMany({ where: { organizationUnitId: unitAId } });
    await db.organizationUnit.delete({ where: { id: unitAId } });

    // Step D: Verify post hard-delete behavior
    const assAfterHardDelete = await db.employeeProjectAssignment.findUniqueOrThrow({
      where: { id: assignmentId },
    });

    // 1. Assignment survives
    expect(assAfterHardDelete.id).toBe(assignmentId);

    // 2. FK sourceOrgUnitId set to NULL per onDelete: SetNull
    expect(assAfterHardDelete.sourceOrgUnitId).toBeNull();

    // 3. Snapshots survive completely intact
    expect(assAfterHardDelete.sourceOrgUnitCodeSnapshot).toContain(`UNIT_A_${runId}`);
    expect(assAfterHardDelete.sourceOrgUnitNameSnapshot).toContain(`Phong Ban Unit A ${runId}`);

    // 4. Employee not deleted
    const empStillExists = await db.employee.findUnique({ where: { id: employeeId } });
    expect(empStillExists).not.toBeNull();
    expect(empStillExists?.id).toBe(employeeId);
  });
});
