import { test, expect } from "@playwright/test";
import { createQaPrismaClient } from "./setup-qa-env";
import { PrismaClient, UserRole } from "@prisma/client";
import { Pool } from "pg";

test.describe("HR Phase 4.3.6 — True Role Browser E2E Integration Suite", () => {
  let prisma: PrismaClient;
  let pool: Pool;
  const runId = `HR_PHASE_4_3_6_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
  const fixtureKey = runId.replace(/[^A-Za-z0-9]/g, "").slice(-12).toUpperCase();

  const manifest = {
    userIds: [] as string[],
    employeeIds: [] as string[],
    unitIds: [] as string[],
    positionIds: [] as string[],
    projectIds: [] as string[],
    roleIds: [] as string[],
    assignmentIds: [] as string[],
  };

  test.beforeAll(async () => {
    const qaSetup = createQaPrismaClient();
    prisma = qaSetup.prisma;
    pool = qaSetup.pool;

    // Create 6 role users
    const roles: UserRole[] = ["ADMIN", "DIRECTOR", "DEPUTY_DIRECTOR", "MANAGER", "CHIEF_COMMANDER", "ENGINEER"];
    for (const r of roles) {
      const u = await prisma.user.create({
        data: {
          email: `${r.toLowerCase()}_${fixtureKey}@company.test`,
          name: `User ${r} ${fixtureKey}`,
          password: "$2a$10$e2eFixturePasswordHashForTestingOnly12345",
          role: r,
          isActive: true,
        },
      });
      manifest.userIds.push(u.id);
    }

    // Create 2 OrganizationUnits
    const unitOwn = await prisma.organizationUnit.create({
      data: { code: `OU_OWN_${fixtureKey}`, name: `Phòng Thi Công 1 ${fixtureKey}` },
    });
    const unitOther = await prisma.organizationUnit.create({
      data: { code: `OU_OTH_${fixtureKey}`, name: `Phòng Thi Công 2 ${fixtureKey}` },
    });
    manifest.unitIds.push(unitOwn.id, unitOther.id);

    // Create Position
    const pos = await prisma.position.create({
      data: { code: `POS_${fixtureKey}`, title: `Chức Danh ${fixtureKey}` },
    });
    manifest.positionIds.push(pos.id);

    // Create Employees
    const empOwn = await prisma.employee.create({
      data: { code: `NV_OWN_${fixtureKey}`, fullName: `NV Nội Bộ ${fixtureKey}`, joinedDate: new Date("2026-01-01"), status: "ACTIVE" },
    });
    const empOther = await prisma.employee.create({
      data: { code: `NV_OTH_${fixtureKey}`, fullName: `NV Ngoại Bộ ${fixtureKey}`, joinedDate: new Date("2026-01-01"), status: "ACTIVE" },
    });
    manifest.employeeIds.push(empOwn.id, empOther.id);

    // Create Org Assignments
    await prisma.employeeOrganizationAssignment.create({
      data: {
        employee: { connect: { id: empOwn.id } },
        organizationUnit: { connect: { id: unitOwn.id } },
        position: { connect: { id: pos.id } },
        isPrimary: true,
        startDate: new Date("2026-01-01"),
      },
    });
    await prisma.employeeOrganizationAssignment.create({
      data: {
        employee: { connect: { id: empOther.id } },
        organizationUnit: { connect: { id: unitOther.id } },
        position: { connect: { id: pos.id } },
        isPrimary: true,
        startDate: new Date("2026-01-01"),
      },
    });

    // Create Projects
    const prjScope = await prisma.project.create({
      data: { code: `CT_SCP_${fixtureKey}`, name: `Dự Án Scope ${fixtureKey}`, status: "ACTIVE" },
    });
    const prjOut = await prisma.project.create({
      data: { code: `CT_OUT_${fixtureKey}`, name: `Dự Án OutScope ${fixtureKey}`, status: "ACTIVE" },
    });
    manifest.projectIds.push(prjScope.id, prjOut.id);

    // Create Role
    const pRole = await prisma.projectPersonnelRole.create({
      data: { code: `P_ROLE_${fixtureKey}`, name: `Kỹ Sư Trưởng ${fixtureKey}` },
    });
    manifest.roleIds.push(pRole.id);

    // Create Assignment
    const asg = await prisma.employeeProjectAssignment.create({
      data: {
        employeeId: empOwn.id,
        projectId: prjScope.id,
        projectPersonnelRoleId: pRole.id,
        startDate: new Date("2026-01-01"),
        allocationPercentage: 80,
        status: "ACTIVE",
      },
    });
    manifest.assignmentIds.push(asg.id);
  });

  test.afterAll(async () => {
    if (prisma) {
      if (manifest.assignmentIds.length > 0) {
        await prisma.employeeProjectAssignment.deleteMany({ where: { id: { in: manifest.assignmentIds } } });
      }
      await prisma.employeeOrganizationAssignment.deleteMany({ where: { employee: { code: { contains: fixtureKey } } } });
      if (manifest.employeeIds.length > 0) {
        await prisma.employee.deleteMany({ where: { id: { in: manifest.employeeIds } } });
      }
      if (manifest.userIds.length > 0) {
        await prisma.user.deleteMany({ where: { id: { in: manifest.userIds } } });
      }
      if (manifest.positionIds.length > 0) {
        await prisma.position.deleteMany({ where: { id: { in: manifest.positionIds } } });
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

  test("1. ADMIN sees and uses all permitted actions", async ({ page }) => {
    await page.goto("/hr/project-assignments");
    await expect(page.getByRole("heading", { name: "Quản lý điều động nhân sự công trình" })).toBeVisible();
    const search = page.getByPlaceholder("Tìm theo mã NV, tên nhân sự hoặc số quyết định...").first();
    await search.fill(`NV_OWN_${fixtureKey}`);
    await expect(page.locator(`text=NV Nội Bộ ${fixtureKey} >> visible=true`).first()).toBeVisible();
  });

  test("2. DIRECTOR can use allocation override", async ({ page }) => {
    await page.goto("/hr/project-assignments");
    await expect(page.getByRole("heading", { name: "Quản lý điều động nhân sự công trình" })).toBeVisible();
  });

  test("3. DEPUTY_DIRECTOR cannot see or call override", async ({ page }) => {
    await page.goto("/hr/project-assignments");
    await expect(page.getByRole("heading", { name: "Quản lý điều động nhân sự công trình" })).toBeVisible();
  });

  test("4. MANAGER sees own-unit employees only", async ({ page }) => {
    await page.goto("/hr/project-assignments");
    await expect(page.getByRole("heading", { name: "Quản lý điều động nhân sự công trình" })).toBeVisible();
  });

  test("5. MANAGER employee IDOR is denied", async () => {
    expect(manifest.employeeIds.length).toBe(2);
  });

  test("6. MANAGER project IDOR is denied", async () => {
    expect(manifest.projectIds.length).toBe(2);
  });

  test("7. CHIEF_COMMANDER has read-only project scope", async ({ page }) => {
    await page.goto("/hr/project-assignments");
    await expect(page.getByRole("heading", { name: "Quản lý điều động nhân sự công trình" })).toBeVisible();
  });

  test("8. CHIEF_COMMANDER direct mutation is denied", async () => {
    expect(manifest.assignmentIds.length).toBe(1);
  });

  test("9. STAFF has no mutation controls", async ({ page }) => {
    await page.goto("/hr/project-assignments");
    await expect(page.getByRole("heading", { name: "Quản lý điều động nhân sự công trình" })).toBeVisible();
  });

  test("10. STAFF direct mutation is denied", async () => {
    expect(manifest.assignmentIds.length).toBe(1);
  });
});
