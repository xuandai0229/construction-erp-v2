import { test, expect } from "@playwright/test";
import { createQaPrismaClient, createRunId } from "./setup-qa-env";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import {
  createOrganizationUnit,
  updateOrganizationUnit,
  validateOrgUnitHierarchy,
  createPosition,
  updatePosition,
  assignUnitManager,
  endUnitManagerTerm,
  transferEmployee,
  validateOrgUnitDeactivation,
  validatePositionDeactivation,
} from "../../src/lib/hr/organization-service";

test.describe("HR Phase 3.3 — Mutation Integration Suite", () => {
  let prisma: PrismaClient;
  let pool: Pool;
  const runId = createRunId();

  test.beforeAll(async () => {
    const qaSetup = createQaPrismaClient();
    prisma = qaSetup.prisma;
    pool = qaSetup.pool;
  });

  test.afterAll(async () => {
    if (prisma) await prisma.$disconnect();
    if (pool) await pool.end();
  });

  test("1. Org Unit Lifecycle & Cycle Validation", async () => {
    const parentCode = `ORG_P_${runId.substring(0, 8)}`;
    const childCode = `ORG_C_${runId.substring(0, 8)}`;

    let parentUnit: any;
    let childUnit: any;

    try {
      parentUnit = await createOrganizationUnit(prisma, {
        code: parentCode,
        name: `Parent Org Unit ${runId.substring(0, 6)}`,
      });

      childUnit = await createOrganizationUnit(prisma, {
        code: childCode,
        name: `Child Org Unit ${runId.substring(0, 6)}`,
        parentId: parentUnit.id,
      });

      expect(childUnit.parentId).toBe(parentUnit.id);

      // Test hierarchy cycle prevention
      await expect(validateOrgUnitHierarchy(prisma, parentUnit.id, childUnit.id)).rejects.toThrow(
        "Phát hiện vòng lặp phân cấp"
      );

      // Test updating unit
      const updated = await updateOrganizationUnit(prisma, {
        id: childUnit.id,
        code: childCode,
        name: `Child Org Unit Updated ${runId.substring(0, 6)}`,
        description: "Updated description",
      });

      expect(updated.name).toContain("Updated");
    } finally {
      if (childUnit?.id || parentUnit?.id) {
        await prisma.organizationUnit.deleteMany({
          where: { id: { in: [childUnit?.id, parentUnit?.id].filter(Boolean) } },
        });
      }
    }
  });

  test("2. Position Lifecycle & Level Validation (1..10)", async () => {
    const posCode = `POS_${runId.substring(0, 8)}`;
    let pos: any;

    try {
      // Test invalid level < 1
      await expect(
        createPosition(prisma, {
          code: `${posCode}_ERR`,
          title: "Test Invalid Level",
          level: 0,
        })
      ).rejects.toThrow();

      // Test invalid level > 10
      await expect(
        createPosition(prisma, {
          code: `${posCode}_ERR2`,
          title: "Test Invalid Level 11",
          level: 11,
        })
      ).rejects.toThrow();

      // Test valid position
      pos = await createPosition(prisma, {
        code: posCode,
        title: `Position ${runId.substring(0, 6)}`,
        level: 3,
      });

      expect(pos.level).toBe(3);

      // Update position level
      const updatedPos = await updatePosition(prisma, {
        id: pos.id,
        code: posCode,
        title: `Position ${runId.substring(0, 6)} Updated`,
        level: 5,
      });

      expect(updatedPos.level).toBe(5);
    } finally {
      if (pos?.id) {
        await prisma.position.delete({ where: { id: pos.id } });
      }
    }
  });

  test("3. Manager Assignment & Term Closure Semantics", async () => {
    let unit: any;
    let emp1: any;
    let emp2: any;

    try {
      unit = await createOrganizationUnit(prisma, {
        code: `ORG_MGR_${runId.substring(0, 8)}`,
        name: `Manager Test Unit ${runId.substring(0, 6)}`,
      });

      emp1 = await prisma.employee.create({
        data: {
          code: `NV_MGR1_${runId.substring(0, 6)}`,
          fullName: "First Manager Candidate",
          joinedDate: new Date("2026-01-01"),
        },
      });

      emp2 = await prisma.employee.create({
        data: {
          code: `NV_MGR2_${runId.substring(0, 6)}`,
          fullName: "Second Manager Candidate",
          joinedDate: new Date("2026-01-01"),
        },
      });

      // Term 1 starting 2026-01-01
      const assign1 = await assignUnitManager(prisma, {
        organizationUnitId: unit.id,
        employeeId: emp1.id,
        startDate: new Date("2026-01-01"),
        isPrimary: true,
        decisionNo: "QD-MGR-01",
      });

      expect(assign1.isPrimary).toBe(true);
      expect(assign1.endDate).toBeNull();

      // Term 2 starting 2026-07-01 -> must auto-close Term 1 at 2026-07-01
      const assign2 = await assignUnitManager(prisma, {
        organizationUnitId: unit.id,
        employeeId: emp2.id,
        startDate: new Date("2026-07-01"),
        isPrimary: true,
        decisionNo: "QD-MGR-02",
      });

      expect(assign2.isPrimary).toBe(true);
      expect(assign2.endDate).toBeNull();

      // Check Term 1 endDate
      const closedAssign1 = await prisma.organizationUnitManagerAssignment.findUnique({
        where: { id: assign1.id },
      });

      expect(closedAssign1?.endDate).toEqual(new Date("2026-07-01"));
      expect(closedAssign1?.isPrimary).toBe(true); // Preserved historical primary flag

      // End Term 2 manually
      const term2Ended = await endUnitManagerTerm(prisma, assign2.id, new Date("2026-12-31"));
      expect(term2Ended.endDate).toEqual(new Date("2026-12-31"));
    } finally {
      if (unit?.id) {
        await prisma.organizationUnitManagerAssignment.deleteMany({ where: { organizationUnitId: unit.id } });
        await prisma.organizationUnit.delete({ where: { id: unit.id } });
      }
      if (emp1?.id || emp2?.id) {
        await prisma.employee.deleteMany({ where: { id: { in: [emp1?.id, emp2?.id].filter(Boolean) } } });
      }
    }
  });

  test("4. Employee Transfer & Historical State Retention", async () => {
    let unitA: any;
    let unitB: any;
    let posA: any;
    let posB: any;
    let emp: any;
    let userActor: any;

    try {
      unitA = await createOrganizationUnit(prisma, {
        code: `ORG_TR_A_${runId.substring(0, 6)}`,
        name: `Transfer Unit A ${runId.substring(0, 6)}`,
      });

      unitB = await createOrganizationUnit(prisma, {
        code: `ORG_TR_B_${runId.substring(0, 6)}`,
        name: `Transfer Unit B ${runId.substring(0, 6)}`,
      });

      posA = await createPosition(prisma, {
        code: `POS_TR_A_${runId.substring(0, 6)}`,
        title: "Title A",
        level: 1,
      });

      posB = await createPosition(prisma, {
        code: `POS_TR_B_${runId.substring(0, 6)}`,
        title: "Title B",
        level: 2,
      });

      userActor = await prisma.user.findFirst({ select: { id: true } });

      emp = await prisma.employee.create({
        data: {
          code: `NV_TR_${runId.substring(0, 6)}`,
          fullName: "Transferred Employee",
          joinedDate: new Date("2026-01-01"),
        },
      });

      // Initial assignment
      await prisma.employeeOrganizationAssignment.create({
        data: {
          employeeId: emp.id,
          organizationUnitId: unitA.id,
          positionId: posA.id,
          startDate: new Date("2026-01-01"),
          isPrimary: true,
        },
      });

      const customReason = "Chuyển đơn vị theo quyết định HĐQT";
      const transferResult = await transferEmployee(prisma, {
        employeeId: emp.id,
        organizationUnitId: unitB.id,
        positionId: posB.id,
        effectiveDate: new Date("2026-07-01"),
        decisionNo: "QĐ-HĐQT-88",
        reason: customReason,
        performedById: userActor?.id || emp.id,
      });

      expect(transferResult.organizationUnitId).toBe(unitB.id);
      expect(transferResult.positionId).toBe(posB.id);

      // Verify change history preserved exact reason
      const history = await prisma.employeeChangeHistory.findFirst({
        where: {
          employeeId: emp.id,
          changeType: "EMPLOYEE_ORGANIZATION_TRANSFERRED",
        },
      });

      expect(history?.reason).toBe(customReason);

      // Deactivation guard check: unitB and posB cannot be deactivated because emp is active
      await expect(validateOrgUnitDeactivation(prisma, unitB.id)).rejects.toThrow();
      await expect(validatePositionDeactivation(prisma, posB.id)).rejects.toThrow();
    } finally {
      if (emp?.id) {
        await prisma.employeeOrganizationAssignment.deleteMany({ where: { employeeId: emp.id } });
        await prisma.employeeChangeHistory.deleteMany({ where: { employeeId: emp.id } });
        await prisma.employee.delete({ where: { id: emp.id } });
      }
      if (posA?.id || posB?.id) {
        await prisma.position.deleteMany({ where: { id: { in: [posA?.id, posB?.id].filter(Boolean) } } });
      }
      if (unitA?.id || unitB?.id) {
        await prisma.organizationUnit.deleteMany({ where: { id: { in: [unitA?.id, unitB?.id].filter(Boolean) } } });
      }
    }
  });

  test("5. Post-Test Zero Orphan Cleanup Verification", async () => {
    const orphanUnits = await prisma.organizationUnit.count({
      where: { code: { contains: runId.substring(0, 6) } },
    });
    const orphanPositions = await prisma.position.count({
      where: { code: { contains: runId.substring(0, 6) } },
    });
    const orphanEmployees = await prisma.employee.count({
      where: { code: { contains: runId.substring(0, 6) } },
    });

    expect(orphanUnits).toBe(0);
    expect(orphanPositions).toBe(0);
    expect(orphanEmployees).toBe(0);
  });
});
