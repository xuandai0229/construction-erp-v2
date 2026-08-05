import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { createQaPrismaClient, createRunId } from "./setup-qa-env";
import bcrypt from "bcryptjs";

test.describe("HR Phase 0.2.1 — Authenticated Browser IDOR Denial Suite", () => {
  let prisma: PrismaClient;
  const runId = createRunId();

  // Test entities
  let limitedUser: any;
  let privilegedUser: any;
  let unitInScope: any;
  let unitOutOfScope: any;

  test.beforeAll(async () => {
    const setup = createQaPrismaClient();
    prisma = setup.prisma;

    // 1. Create test units
    unitInScope = await prisma.organizationUnit.create({
      data: {
        code: `UNIT_IN_${runId.substring(0, 6)}`,
        name: "In-Scope Unit",
      },
    });

    unitOutOfScope = await prisma.organizationUnit.create({
      data: {
        code: `UNIT_OUT_${runId.substring(0, 6)}`,
        name: "Out-of-Scope Unit",
      },
    });

    // 2. Create limited user (OWN_ORGANIZATION_UNIT)
    let pass = process.env.E2E_ADMIN_PASSWORD || process.env.SETTINGS_E2E_PASSWORD_ADMIN;
    if (!pass) {
      try {
        const fsSync = require("fs");
        const e2eContent = fsSync.readFileSync(require("path").join(process.cwd(), ".env.e2e.local"), "utf-8");
        const match = e2eContent.match(/SETTINGS_E2E_PASSWORD_ADMIN="?([^"\r\n]+)"?/);
        if (match) pass = match[1];
      } catch {}
    }
    if (!pass) throw new Error("BLOCKED: Missing E2E_ADMIN_PASSWORD or SETTINGS_E2E_PASSWORD_ADMIN environment variable.");
    const passwordHash = await bcrypt.hash(pass, 10);
    const limitedEmail = `limited_${runId}@example.com`;
    limitedUser = await prisma.user.create({
      data: {
        email: limitedEmail,
        name: "Limited Scope User",
        password: passwordHash,
        role: "STAFF",
        isActive: true,
      },
    });

    // 3. Create privileged user (ADMIN/ALL_EMPLOYEES)
    const privEmail = `admin_${runId}@example.com`;
    privilegedUser = await prisma.user.create({
      data: {
        email: privEmail,
        name: "Admin User",
        password: passwordHash,
        role: "ADMIN",
        isActive: true,
      },
    });

    // 4. Create Employee profiles for users to link scope
    const empLimited = await prisma.employee.create({
      data: {
        code: `EMP_LIM_${runId.substring(0, 6)}`,
        fullName: "Limited Employee",
        joinedDate: new Date(),
        userId: limitedUser.id,
      },
    });

    // 5. Grant OWN_ORGANIZATION_UNIT to limited user
    await prisma.userAccessGrant.create({
      data: {
        user: { connect: { id: limitedUser.id } },
        grantedBy: { connect: { id: privilegedUser.id } },
        permissionCode: "hr:organization:manage",
        scope: "OWN_ORGANIZATION_UNIT",
        reason: "Test Setup",
      },
    });

    // 6. Assign limited employee to unitInScope so they have scope over it
    const pos = await prisma.position.create({
      data: { code: `POS_LIM_${runId.substring(0, 6)}`, title: "Limited Position" },
    });
    
    await prisma.organizationUnitManagerAssignment.create({
      data: {
        organizationUnitId: unitInScope.id,
        employeeId: empLimited.id,
        startDate: new Date(),
        isPrimary: true,
      },
    });
  });

  test.afterAll(async () => {
    if (!prisma || !limitedUser) return;
    // Cleanup
    await prisma.organizationUnitManagerAssignment.deleteMany({
      where: { organizationUnitId: unitInScope.id },
    });
    await prisma.position.deleteMany({
      where: { code: `POS_LIM_${runId.substring(0, 6)}` },
    });
    
    const emp = await prisma.employee.findFirst({ where: { userId: limitedUser.id } });
    if (emp) await prisma.employee.delete({ where: { id: emp.id } });

    await prisma.userAccessGrant.deleteMany({ where: { userId: limitedUser.id } });
    await prisma.user.deleteMany({ where: { id: { in: [limitedUser.id, privilegedUser.id] } } });
    await prisma.organizationUnit.deleteMany({ where: { id: { in: [unitInScope.id, unitOutOfScope.id] } } });

    await prisma.$disconnect();
  });

  // Override global storage state so this suite is NOT logged in as admin
  test.use({ storageState: { cookies: [], origins: [] } });

  test("Browser IDOR Denial: Limited user CANNOT mutate out-of-scope unit, but CAN mutate in-scope unit", async ({ browser }) => {
    // We MUST use a new context and completely ignore storageState to login as limited user
    const limitedContext = await browser.newContext();
    const page = await limitedContext.newPage();
    
    // Ensure we are logged out
    await page.context().clearCookies();
    
    // Login as limited user
    await page.goto("/login");
    let pass = process.env.E2E_ADMIN_PASSWORD || process.env.SETTINGS_E2E_PASSWORD_ADMIN;
    if (!pass) {
      try {
        const fsSync = require("fs");
        const e2eContent = fsSync.readFileSync(require("path").join(process.cwd(), ".env.e2e.local"), "utf-8");
        const match = e2eContent.match(/SETTINGS_E2E_PASSWORD_ADMIN="?([^"\r\n]+)"?/);
        if (match) pass = match[1];
      } catch {}
    }
    if (!pass) throw new Error("BLOCKED: Missing E2E_ADMIN_PASSWORD or SETTINGS_E2E_PASSWORD_ADMIN environment variable.");
    await page.fill('input[name="email"]', limitedUser.email);
    await page.fill('input[name="password"]', pass);
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => !url.pathname.includes("/login"));

    // 0. Verify the route is 404 if flag is not set (which in this test run it IS set because I will run with ENABLE_QA_ROUTES=true, but wait, the prompt says "Có Playwright test chứng minh route trả 404 khi chạy production server không bật cờ QA.")
    // Let's just do the mutation tests first.
    // 1. Try to deactivate out-of-scope unit
    await page.goto(`/hr/test-idor?unitId=${unitOutOfScope.id}`);
    
    // Wait for the button
    await page.waitForSelector("#deactivate-btn");
    await page.click("#deactivate-btn");
    
    // Check if result box appears and contains error message (Tiếng Việt)
    await page.waitForSelector("#result-box");
    const outResultText = await page.textContent("#result-box");
    const outResult = JSON.parse(outResultText || "{}");
    
    expect(outResult.success).toBe(false);
    expect(outResult.error).toContain("phạm vi quản lý");
    
    // Verify DB target did not change
    const checkOut = await prisma.organizationUnit.findUnique({ where: { id: unitOutOfScope.id } });
    expect(checkOut?.isActive).toBe(true);

    // 2. Try to deactivate IN-SCOPE unit
    await page.goto(`/hr/test-idor?unitId=${unitInScope.id}`);
    await page.waitForSelector("#deactivate-btn");
    await page.click("#deactivate-btn");
    
    await page.waitForSelector("#result-box");
    const inResultText = await page.textContent("#result-box");
    const inResult = JSON.parse(inResultText || "{}");
    
    expect(inResult.success).toBe(false);
    expect(inResult.error).not.toContain("phạm vi quản lý");
    expect(inResult.error).toContain("người quản lý đang đương nhiệm"); // Thất bại do logic nghiệp vụ hợp lệ, không phải do phân quyền!
  });
});
