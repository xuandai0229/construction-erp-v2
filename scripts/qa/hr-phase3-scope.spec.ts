import { test, expect } from "@playwright/test";
import { createQaPrismaClient, createRunId } from "./setup-qa-env";
import { PrismaClient, HrDataScope } from "@prisma/client";
import { Pool } from "pg";
import {
  buildEmployeeScopeWhereClause,
  buildOrganizationUnitScopeWhereClause,
  buildManagerAssignmentScopeWhereClause,
  HrUserContext,
} from "../../src/lib/hr/hr-auth-guard";

test.describe("HR Phase 3.3 — Data Scope Matrix Suite", () => {
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

  test("1. ALL_EMPLOYEES Scope allows querying all active records", async () => {
    const adminCtx: HrUserContext = {
      session: { id: "admin-user-id", role: "ADMIN", name: "Admin" },
      isSystemAdmin: true,
      employeeId: null,
    };

    const where = await buildEmployeeScopeWhereClause(adminCtx, HrDataScope.ALL_EMPLOYEES);
    expect(where).toEqual({});

    const employees = await prisma.employee.findMany({ where, take: 5 });
    expect(Array.isArray(employees)).toBe(true);
  });

  test("2. OWN_ORGANIZATION_UNIT Scope restricts to managed unit assignments", async () => {
    let unit: any;
    let manager: any;
    let subEmployee: any;
    let pos: any;

    try {
      unit = await prisma.organizationUnit.create({
        data: {
          code: `ORG_SCOP_${runId.substring(0, 6)}`,
          name: `Scope Test Unit ${runId.substring(0, 6)}`,
        },
      });

      manager = await prisma.employee.create({
        data: {
          code: `NV_MGR_S_${runId.substring(0, 6)}`,
          fullName: "Scope Test Manager",
          joinedDate: new Date("2026-01-01"),
        },
      });

      subEmployee = await prisma.employee.create({
        data: {
          code: `NV_SUB_S_${runId.substring(0, 6)}`,
          fullName: "Scope Test Subordinate",
          joinedDate: new Date("2026-01-01"),
        },
      });

      pos = await prisma.position.create({
        data: {
          code: `POS_SCOP_${runId.substring(0, 6)}`,
          title: "Staff Position",
        },
      });

      // Manager assignment
      await prisma.organizationUnitManagerAssignment.create({
        data: {
          organizationUnitId: unit.id,
          employeeId: manager.id,
          startDate: new Date("2026-01-01"),
          isPrimary: true,
        },
      });

      // Subordinate org assignment
      await prisma.employeeOrganizationAssignment.create({
        data: {
          employeeId: subEmployee.id,
          organizationUnitId: unit.id,
          positionId: pos.id,
          startDate: new Date("2026-01-01"),
          isPrimary: true,
        },
      });

      const mgrCtx: HrUserContext = {
        session: { id: "mgr-user-id", role: "STAFF", name: "Manager User" },
        isSystemAdmin: false,
        employeeId: manager.id,
      };

      const where = await buildEmployeeScopeWhereClause(mgrCtx, HrDataScope.OWN_ORGANIZATION_UNIT, prisma);
      const visibleEmployees = await prisma.employee.findMany({ where });

      expect(visibleEmployees.some((e) => e.id === subEmployee.id)).toBe(true);

    } finally {
      if (unit?.id) {
        await prisma.organizationUnitManagerAssignment.deleteMany({ where: { organizationUnitId: unit.id } });
        await prisma.employeeOrganizationAssignment.deleteMany({ where: { organizationUnitId: unit.id } });
      }
      if (manager?.id || subEmployee?.id) {
        await prisma.employee.deleteMany({ where: { id: { in: [manager?.id, subEmployee?.id].filter(Boolean) } } });
      }
      if (pos?.id) {
        await prisma.position.delete({ where: { id: pos.id } });
      }
      if (unit?.id) {
        await prisma.organizationUnit.delete({ where: { id: unit.id } });
      }
    }
  });

  test("3. SELF_ONLY Scope restricts strictly to self employee profile ID", async () => {
    let emp: any;
    try {
      emp = await prisma.employee.create({
        data: {
          code: `NV_SELF_${runId.substring(0, 6)}`,
          fullName: "Self Only Employee",
          joinedDate: new Date("2026-01-01"),
        },
      });

      const selfCtx: HrUserContext = {
        session: { id: "self-user-id", role: "STAFF", name: "Self User" },
        isSystemAdmin: false,
        employeeId: emp.id,
      };

      const where = await buildEmployeeScopeWhereClause(selfCtx, HrDataScope.SELF_ONLY);
      expect(where).toEqual({ id: emp.id });

      const visibleEmployees = await prisma.employee.findMany({ where });
      expect(visibleEmployees.length).toBe(1);
      expect(visibleEmployees[0].id).toBe(emp.id);
    } finally {
      if (emp?.id) {
        await prisma.employee.delete({ where: { id: emp.id } });
      }
    }
  });

  test("4. NONE Scope returns impossible filter blocking all records", async () => {
    const noneCtx: HrUserContext = {
      session: { id: "none-user-id", role: "STAFF", name: "None User" },
      isSystemAdmin: false,
      employeeId: "some-emp-id",
    };

    const where = await buildEmployeeScopeWhereClause(noneCtx, HrDataScope.NONE);
    expect(where).toEqual({ id: "IMPOSSIBLE_NON_EXISTENT_ID" });

    const visibleEmployees = await prisma.employee.findMany({ where });
    expect(visibleEmployees.length).toBe(0);
  });
});
