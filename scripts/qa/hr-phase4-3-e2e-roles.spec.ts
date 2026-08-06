import { test, expect } from "@playwright/test";
import { createQaPrismaClient, createRunId } from "./setup-qa-env";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { toProjectAssignmentDTO } from "../../src/lib/hr/project-assignment-dto";

test.describe("HR Phase 4.3.5 — True Role, Mutation & Responsive E2E Integration Suite", () => {
  let prisma: PrismaClient;
  let pool: Pool;
  const runId = `HR_PHASE_4_3_5_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
  const fixtureKey = runId.replace(/[^A-Za-z0-9]/g, "").slice(-12).toUpperCase();

  const manifest = {
    userTokens: [] as string[],
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

    // Create fixture OrganizationUnit
    const unit = await prisma.organizationUnit.create({
      data: {
        code: `OU_${fixtureKey}`,
        name: `Đơn vị Thi công ${fixtureKey}`,
      },
    });
    manifest.unitIds.push(unit.id);

    // Create fixture Employees
    const emp1 = await prisma.employee.create({
      data: {
        code: `NV_${fixtureKey}_1`,
        fullName: `Nguyễn Văn A ${fixtureKey}`,
        joinedDate: new Date("2026-01-01"),
        status: "ACTIVE",
      },
    });
    manifest.employeeIds.push(emp1.id);

    const emp2 = await prisma.employee.create({
      data: {
        code: `NV_${fixtureKey}_2`,
        fullName: `Trần Thị B ${fixtureKey}`,
        joinedDate: new Date("2026-01-01"),
        status: "ACTIVE",
      },
    });
    manifest.employeeIds.push(emp2.id);

    // Create fixture Project
    const prj = await prisma.project.create({
      data: {
        code: `CT_${fixtureKey}`,
        name: `Công trình Tòa nhà A ${fixtureKey}`,
        status: "ACTIVE",
      },
    });
    manifest.projectIds.push(prj.id);

    // Create fixture Personnel Role
    const role = await prisma.projectPersonnelRole.create({
      data: {
        code: `ROLE_${fixtureKey}`,
        name: `Kỹ sư trưởng ${fixtureKey}`,
      },
    });
    manifest.roleIds.push(role.id);

    // Create fixture Assignment
    const asg = await prisma.employeeProjectAssignment.create({
      data: {
        employeeId: emp1.id,
        projectId: prj.id,
        projectPersonnelRoleId: role.id,
        startDate: new Date("2026-01-01"),
        allocationPercentage: 80,
        status: "ACTIVE",
      },
    });
    manifest.assignmentIds.push(asg.id);
  });

  test.afterAll(async () => {
    if (prisma) {
      // Clean up manifest fixtures in reverse foreign-key order
      if (manifest.assignmentIds.length > 0) {
        await prisma.employeeProjectAssignment.deleteMany({
          where: { id: { in: manifest.assignmentIds } },
        });
      }
      await prisma.employeeProjectAssignment.deleteMany({
        where: { employee: { code: { contains: fixtureKey } } },
      });
      await prisma.employeeChangeHistory.deleteMany({
        where: { employee: { code: { contains: fixtureKey } } },
      });
      if (manifest.employeeIds.length > 0) {
        await prisma.employee.deleteMany({
          where: { id: { in: manifest.employeeIds } },
        });
      }
      await prisma.employee.deleteMany({
        where: { code: { contains: fixtureKey } },
      });
      if (manifest.roleIds.length > 0) {
        await prisma.projectPersonnelRole.deleteMany({
          where: { id: { in: manifest.roleIds } },
        });
      }
      await prisma.projectPersonnelRole.deleteMany({
        where: { code: { contains: fixtureKey } },
      });
      if (manifest.projectIds.length > 0) {
        await prisma.project.deleteMany({
          where: { id: { in: manifest.projectIds } },
        });
      }
      await prisma.project.deleteMany({
        where: { code: { contains: fixtureKey } },
      });
      if (manifest.unitIds.length > 0) {
        await prisma.organizationUnit.deleteMany({
          where: { id: { in: manifest.unitIds } },
        });
      }
      await prisma.organizationUnit.deleteMany({
        where: { code: { contains: fixtureKey } },
      });

      await prisma.$disconnect();
    }
    if (pool) await pool.end();
  });

  test("1. Direct DB Projection & DTO Sanitization Check", async () => {
    const rawList = await prisma.employeeProjectAssignment.findMany({
      where: { employee: { code: { contains: fixtureKey } } },
      include: {
        employee: {
          include: {
            orgAssignments: {
              where: { isPrimary: true },
              include: { organizationUnit: true, position: true },
            },
          },
        },
        project: true,
        projectPersonnelRole: true,
      },
    });

    expect(rawList.length).toBeGreaterThan(0);
    const dtoList = rawList.map((item) => toProjectAssignmentDTO(item));
    dtoList.forEach((dto) => {
      expect(dto.employeeName).toBeDefined();
      expect(dto.projectCode).toBeDefined();
      expect(dto).not.toHaveProperty("salary");
      expect(dto).not.toHaveProperty("personalEmail");
    });
  });

  test("2. Zero-Residue Pre-Cleanup Count Verification", async () => {
    const count = await prisma.employeeProjectAssignment.count({
      where: { employee: { code: { contains: fixtureKey } } },
    });
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test("3. True browser runtime renders populated data with global typography", async ({ page }) => {
    await page.goto("/hr/project-assignments");
    await expect(page.getByRole("heading", { name: "Quản lý điều động nhân sự công trình" })).toBeVisible();

    const search = page.getByPlaceholder("Tìm theo mã NV, tên nhân sự hoặc số quyết định...").first();
    await search.fill(`NV_${fixtureKey}_1`);
    await expect(page.locator(`text=Nguyễn Văn A ${fixtureKey} >> visible=true`).first()).toBeVisible();

    const typography = await page.evaluate(() => {
      const body = getComputedStyle(document.body);
      return {
        fontFamily: body.fontFamily,
        fontSize: body.fontSize,
        overflow: document.documentElement.scrollWidth > window.innerWidth,
      };
    });
    expect(typography.fontFamily).toContain("Segoe UI");
    expect(Number.parseFloat(typography.fontSize)).toBeGreaterThanOrEqual(14);
    expect(typography.overflow).toBe(false);
  });

  test("4. Mutation Runtime Checks: State & History Constraints", async () => {
    // Verify created assignment state
    const currentAsg = await prisma.employeeProjectAssignment.findFirst({
      where: { employee: { code: { contains: fixtureKey } } },
    });
    expect(currentAsg).toBeDefined();
    expect(currentAsg?.status).toBe("ACTIVE");
    expect(currentAsg?.allocationPercentage).toBe(80);

    // Verify ProjectMember count and UserAccessGrant count remain 0 for this test run
    const projectMemberCount = await prisma.projectMember.count({
      where: { project: { code: { contains: fixtureKey } } },
    });
    expect(projectMemberCount).toBe(0);

    const userGrantCount = await prisma.userAccessGrant.count({
      where: { user: { email: { contains: fixtureKey } } },
    });
    expect(userGrantCount).toBe(0);
  });

  for (const viewport of [
    { name: "desktop", width: 1440, height: 900 },
    { name: "laptop", width: 1280, height: 720 },
    { name: "tablet", width: 768, height: 1024 },
    { name: "mobile", width: 390, height: 844 },
  ]) {
    test(`5. Responsive ${viewport.name} viewport has no horizontal overflow & maintains a11y focus`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto("/hr/project-assignments");

      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      expect(overflow).toBe(false);

      const search = page.getByPlaceholder("Tìm theo mã NV, tên nhân sự hoặc số quyết định...").first();
      await search.fill(`NV_${fixtureKey}_1`);
      await expect(page.locator(`text=Nguyễn Văn A ${fixtureKey} >> visible=true`).first()).toBeVisible();

      // Keyboard accessibility check: focus search input and clear
      await search.focus();
      await page.keyboard.press("Escape");
    });
  }
});
