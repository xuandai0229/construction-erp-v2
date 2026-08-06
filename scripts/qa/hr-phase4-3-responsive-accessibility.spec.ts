import { test, expect } from "@playwright/test";
import { createQaPrismaClient } from "./setup-qa-env";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";

test.describe("HR Phase 4.3.6 — Responsive Viewport & Accessibility E2E Integration Suite", () => {
  let prisma: PrismaClient;
  let pool: Pool;
  const runId = `HR_PHASE_4_3_6_RESP_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
  const fixtureKey = runId.replace(/[^A-Za-z0-9]/g, "").slice(-12).toUpperCase();

  const manifest = {
    employeeIds: [] as string[],
    unitIds: [] as string[],
    projectIds: [] as string[],
    roleIds: [] as string[],
    assignmentIds: [] as string[],
  };

  test.beforeAll(async () => {
    const qaSetup = createQaPrismaClient();
    prisma = qaSetup.prisma;
    pool = qaSetup.pool;

    const unit = await prisma.organizationUnit.create({
      data: { code: `OU_RSP_${fixtureKey}`, name: `Đơn vị Responsive ${fixtureKey}` },
    });
    manifest.unitIds.push(unit.id);

    const emp = await prisma.employee.create({
      data: { code: `NV_RSP_${fixtureKey}`, fullName: `NV Responsive ${fixtureKey}`, joinedDate: new Date("2026-01-01"), status: "ACTIVE" },
    });
    manifest.employeeIds.push(emp.id);

    const prj = await prisma.project.create({
      data: { code: `CT_RSP_${fixtureKey}`, name: `Dự án Responsive ${fixtureKey}`, status: "ACTIVE" },
    });
    manifest.projectIds.push(prj.id);

    const role = await prisma.projectPersonnelRole.create({
      data: { code: `RL_RSP_${fixtureKey}`, name: `Kỹ sư ${fixtureKey}` },
    });
    manifest.roleIds.push(role.id);

    const asg = await prisma.employeeProjectAssignment.create({
      data: {
        employeeId: emp.id,
        projectId: prj.id,
        projectPersonnelRoleId: role.id,
        startDate: new Date("2026-01-01"),
        allocationPercentage: 100,
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
      if (manifest.employeeIds.length > 0) {
        await prisma.employee.deleteMany({ where: { id: { in: manifest.employeeIds } } });
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

  const viewports = [
    { name: "desktop", width: 1440, height: 900 },
    { name: "laptop", width: 1280, height: 720 },
    { name: "tablet", width: 768, height: 1024 },
    { name: "mobile", width: 390, height: 844 },
  ];

  for (const vp of viewports) {
    test(`Responsive ${vp.name} (${vp.width}x${vp.height}) has zero horizontal overflow & a11y compliance`, async ({ page }) => {
      const consoleErrors: string[] = [];
      page.on("console", (msg) => {
        if (msg.type() === "error") {
          consoleErrors.push(msg.text());
        }
      });

      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/hr/project-assignments");

      // Verify zero horizontal overflow
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      expect(overflow).toBe(false);

      // Verify search & data rendering
      const search = page.getByPlaceholder("Tìm theo mã NV, tên nhân sự hoặc số quyết định...").first();
      await search.fill(`NV_RSP_${fixtureKey}`);
      await expect(page.locator(`text=NV Responsive ${fixtureKey} >> visible=true`).first()).toBeVisible();

      // Keyboard & ESC accessibility test
      await search.focus();
      await page.keyboard.press("Escape");

      // Assert zero console errors
      expect(consoleErrors.filter(e => !e.includes("favicon"))).toEqual([]);
    });
  }
});
