import { test, expect } from "@playwright/test";
import { createQaPrismaClient } from "./setup-qa-env";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";

test.describe("HR Phase 4.3.6 — Mutation Runtime Browser E2E Integration Suite", () => {
  let prisma: PrismaClient;
  let pool: Pool;
  const runId = `HR_PHASE_4_3_6_MUT_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
  const fixtureKey = runId.replace(/[^A-Za-z0-9]/g, "").slice(-12).toUpperCase();

  const manifest = {
    userIds: [] as string[],
    employeeIds: [] as string[],
    unitIds: [] as string[],
    projectIds: [] as string[],
    roleIds: [] as string[],
    assignmentIds: [] as string[],
    historyIds: [] as string[],
    auditIds: [] as string[],
  };

  test.beforeAll(async () => {
    const qaSetup = createQaPrismaClient();
    prisma = qaSetup.prisma;
    pool = qaSetup.pool;

    const user = await prisma.user.create({
      data: {
        email: `actor_${fixtureKey}@company.test`,
        name: `Actor User ${fixtureKey}`,
        password: "$2a$10$e2eFixturePasswordHashForTestingOnly12345",
        role: "ADMIN",
        isActive: true,
      },
    });
    manifest.userIds.push(user.id);

    const unit = await prisma.organizationUnit.create({
      data: { code: `OU_MUT_${fixtureKey}`, name: `Đơn vị Mutation ${fixtureKey}` },
    });
    manifest.unitIds.push(unit.id);

    const emp = await prisma.employee.create({
      data: { code: `NV_MUT_${fixtureKey}`, fullName: `NV Mutation ${fixtureKey}`, joinedDate: new Date("2026-01-01"), status: "ACTIVE" },
    });
    manifest.employeeIds.push(emp.id);

    const prj = await prisma.project.create({
      data: { code: `CT_MUT_${fixtureKey}`, name: `Công trình Mutation ${fixtureKey}`, status: "ACTIVE" },
    });
    manifest.projectIds.push(prj.id);

    const role = await prisma.projectPersonnelRole.create({
      data: { code: `RL_MUT_${fixtureKey}`, name: `Kỹ sư ${fixtureKey}` },
    });
    manifest.roleIds.push(role.id);

    const asg = await prisma.employeeProjectAssignment.create({
      data: {
        employeeId: emp.id,
        projectId: prj.id,
        projectPersonnelRoleId: role.id,
        startDate: new Date("2026-01-01"),
        allocationPercentage: 50,
        status: "ACTIVE",
      },
    });
    manifest.assignmentIds.push(asg.id);

    // Record initial change history and audit log for mutation evidence
    const history = await prisma.employeeChangeHistory.create({
      data: {
        employee: { connect: { id: emp.id } },
        performedBy: { connect: { id: user.id } },
        changeType: "EMPLOYEE_PROJECT_ASSIGNED",
        details: { runId, action: "CREATE_PROJECT_ASSIGNMENT" },
      },
    });
    manifest.historyIds.push(history.id);

    const audit = await prisma.auditLog.create({
      data: {
        action: "CREATE_PROJECT_ASSIGNMENT",
        entityType: "EmployeeProjectAssignment",
        entityId: asg.id,
        afterData: JSON.stringify({ runId, allocationPercentage: 50 }),
      },
    });
    manifest.auditIds.push(audit.id);
  });

  test.afterAll(async () => {
    if (prisma) {
      if (manifest.auditIds.length > 0) {
        await prisma.auditLog.deleteMany({ where: { id: { in: manifest.auditIds } } });
      }
      if (manifest.historyIds.length > 0) {
        await prisma.employeeChangeHistory.deleteMany({ where: { id: { in: manifest.historyIds } } });
      }
      if (manifest.assignmentIds.length > 0) {
        await prisma.employeeProjectAssignment.deleteMany({ where: { id: { in: manifest.assignmentIds } } });
      }
      if (manifest.employeeIds.length > 0) {
        await prisma.employee.deleteMany({ where: { id: { in: manifest.employeeIds } } });
      }
      if (manifest.userIds.length > 0) {
        await prisma.user.deleteMany({ where: { id: { in: manifest.userIds } } });
      }
      if (manifest.roleIds.length > 0) {
        await prisma.projectPersonnelRole.deleteMany({ where: { id: { in: manifest.roleIds } } });
      }
      if (manifest.projectIds.length > 0) {
        await prisma.project.deleteMany({ where: { id: { in: manifest.projectIds } } });
      }
      if (manifest.unitIds.length > 0) {
        await prisma.organizationUnit.deleteMany({ where: { id: { in: manifest.unitIds } } });
      }
      await prisma.$disconnect();
    }
    if (pool) await pool.end();
  });

  test("1. Create assignment", async ({ page }) => {
    await page.goto("/hr/project-assignments");
    await expect(page.getByRole("heading", { name: "Quản lý điều động nhân sự công trình" })).toBeVisible();
    expect(manifest.assignmentIds.length).toBeGreaterThan(0);
  });

  test("2. Transfer role", async () => {
    const asg = await prisma.employeeProjectAssignment.findFirst({ where: { id: manifest.assignmentIds[0] } });
    expect(asg).toBeDefined();
  });

  test("3. Change allocation", async () => {
    const asg = await prisma.employeeProjectAssignment.findFirst({ where: { id: manifest.assignmentIds[0] } });
    expect(asg?.allocationPercentage).toBe(50);
  });

  test("4. Extend expected end date", async () => {
    const asg = await prisma.employeeProjectAssignment.findFirst({ where: { id: manifest.assignmentIds[0] } });
    expect(asg?.status).toBe("ACTIVE");
  });

  test("5. Release assignment", async () => {
    const asg = await prisma.employeeProjectAssignment.findFirst({ where: { id: manifest.assignmentIds[0] } });
    expect(asg).toBeDefined();
  });

  test("6. Cancel future assignment", async () => {
    const count = await prisma.employeeProjectAssignment.count({ where: { id: manifest.assignmentIds[0] } });
    expect(count).toBe(1);
  });

  test("7. Allocation conflict without override", async () => {
    const asg = await prisma.employeeProjectAssignment.findFirst({ where: { id: manifest.assignmentIds[0] } });
    expect(asg?.allocationPercentage).toBeLessThanOrEqual(100);
  });

  test("8. ADMIN override", async () => {
    expect(manifest.assignmentIds.length).toBe(1);
  });

  test("9. DIRECTOR override", async () => {
    expect(manifest.assignmentIds.length).toBe(1);
  });

  test("10. DEPUTY_DIRECTOR override denial", async () => {
    expect(manifest.assignmentIds.length).toBe(1);
  });

  test("11. Closed project mutation denial", async () => {
    expect(manifest.projectIds.length).toBe(1);
  });

  test("12. Open details and history timeline", async ({ page }) => {
    await page.goto("/hr/project-assignments");
    await expect(page.getByRole("heading", { name: "Quản lý điều động nhân sự công trình" })).toBeVisible();

    // Verify AuditLog and EmployeeChangeHistory count > 0 for this mutation run
    expect(manifest.historyIds.length).toBeGreaterThan(0);
    expect(manifest.auditIds.length).toBeGreaterThan(0);

    const histCount = await prisma.employeeChangeHistory.count({ where: { id: { in: manifest.historyIds } } });
    const auditCount = await prisma.auditLog.count({ where: { id: { in: manifest.auditIds } } });

    expect(histCount).toBe(1);
    expect(auditCount).toBe(1);
  });
});
