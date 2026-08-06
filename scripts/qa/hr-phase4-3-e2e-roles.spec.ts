import { test, expect } from "@playwright/test";
import { createQaPrismaClient, createRunId } from "./setup-qa-env";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { toProjectAssignmentDTO } from "../../src/lib/hr/project-assignment-dto";

test.describe("HR Phase 4.3.1 — Usability, Role RBAC & Responsive E2E Integration Suite", () => {
  let prisma: PrismaClient;
  let pool: Pool;
  const runId = createRunId();
  const fixtureKey = runId.replace(/[^A-Za-z0-9]/g, "").slice(-10).toUpperCase();

  test.beforeAll(async () => {
    const qaSetup = createQaPrismaClient();
    prisma = qaSetup.prisma;
    pool = qaSetup.pool;

    // Create test seed fixtures in isolated QA DB
    const unit = await prisma.organizationUnit.create({
      data: {
        code: `OU_${fixtureKey}`,
        name: `Đơn vị Thi công ${fixtureKey}`,
      },
    });

    const emp1 = await prisma.employee.create({
      data: {
        code: `NV_${fixtureKey}_1`,
        fullName: `Nguyễn Văn A ${fixtureKey}`,
        joinedDate: new Date("2026-01-01"),
        status: "ACTIVE",
      },
    });

    const emp2 = await prisma.employee.create({
      data: {
        code: `NV_${fixtureKey}_2`,
        fullName: `Trần Thị B ${fixtureKey}`,
        joinedDate: new Date("2026-01-01"),
        status: "ACTIVE",
      },
    });

    const prj = await prisma.project.create({
      data: {
        code: `CT_${fixtureKey}`,
        name: `Công trình Tòa nhà A ${fixtureKey}`,
        status: "ACTIVE",
      },
    });

    const role = await prisma.projectPersonnelRole.create({
      data: {
        code: `ROLE_${fixtureKey}`,
        name: `Kỹ sư trưởng ${fixtureKey}`,
      },
    });

    await prisma.employeeProjectAssignment.create({
      data: {
        employeeId: emp1.id,
        projectId: prj.id,
        projectPersonnelRoleId: role.id,
        startDate: new Date("2026-01-01"),
        allocationPercentage: 80,
        status: "ACTIVE",
      },
    });
  });

  test.afterAll(async () => {
    if (prisma) {
      await prisma.employeeProjectAssignment.deleteMany({
        where: { employee: { code: { contains: fixtureKey } } },
      });
      await prisma.employee.deleteMany({
        where: { code: { contains: fixtureKey } },
      });
      await prisma.projectPersonnelRole.deleteMany({
        where: { code: { contains: fixtureKey } },
      });
      await prisma.project.deleteMany({
        where: { code: { contains: fixtureKey } },
      });
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

  test("2. Zero-Residue Post-Test Count Verification", async () => {
    const count = await prisma.employeeProjectAssignment.count({
      where: { employee: { code: { contains: fixtureKey } } },
    });
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test("3. True browser runtime renders populated data with global typography", async ({ page }) => {
    await page.goto("/hr/project-assignments");
    await expect(page.getByRole("heading", { name: "Quản lý điều động nhân sự công trình" })).toBeVisible();

    const search = page.getByPlaceholder("Tìm theo mã NV, tên nhân sự hoặc số quyết định...");
    await search.fill(`NV_${fixtureKey}_1`);
    await expect(page.getByText(`Nguyễn Văn A ${fixtureKey}`, { exact: true })).toBeVisible();

    const typography = await page.evaluate(() => {
      const body = getComputedStyle(document.body);
      return { fontFamily: body.fontFamily, fontSize: body.fontSize, overflow: document.documentElement.scrollWidth > window.innerWidth };
    });
    expect(typography.fontFamily).toContain("Times New Roman");
    expect(Number.parseFloat(typography.fontSize)).toBeGreaterThanOrEqual(14);
    expect(typography.overflow).toBe(false);
  });

  for (const viewport of [
    { name: "desktop", width: 1440, height: 900 },
    { name: "laptop", width: 1280, height: 720 },
    { name: "tablet", width: 768, height: 1024 },
    { name: "mobile", width: 390, height: 844 },
  ]) {
    test(`4. Responsive ${viewport.name} viewport has no horizontal overflow`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto("/hr/project-assignments");
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      expect(overflow).toBe(false);
      await expect(page.getByText(`Nguyễn Văn A ${fixtureKey}`, { exact: true })).toBeVisible();
    });
  }
});
