import { test, expect } from "@playwright/test";
import Workbook from "exceljs";

test.describe("HR Phase 4.5.2 — Real Release Gate & E2E Validation Suite", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  test("1. Route Inventory, Final URL & Server Response Validation", async ({ page }) => {
    const consoleErrors: string[] = [];
    const pageErrors: Error[] = [];
    const serverErrors: string[] = [];

    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });
    page.on("pageerror", (err) => pageErrors.push(err));
    page.on("response", (res) => {
      if (res.status() >= 500) {
        serverErrors.push(`${res.request().method()} ${res.url()}: HTTP ${res.status()}`);
      }
    });

    const routes = [
      { path: "/hr", title: "Tổng quan nhân sự" },
      { path: "/hr/employees", title: "Hồ sơ nhân viên" },
      { path: "/hr/organization", title: "Cơ cấu tổ chức" },
      { path: "/hr/organization/positions", title: "Danh mục chức danh" },
      { path: "/hr/organization/managers", title: "Người quản lý đơn vị" },
      { path: "/hr/organization/chart", title: "Sơ đồ cây tổ chức" },
      { path: "/hr/project-assignments", title: "Quản lý điều động nhân sự công trình" },
      { path: "/hr/reports", title: "Báo cáo và phân tích nhân sự" },
    ];

    for (const route of routes) {
      const response = await page.goto(route.path);
      expect(response).not.toBeNull();
      expect(response?.status()).toBe(200);

      // Verify final URL matches without redirect loop
      expect(page.url()).toContain(route.path);

      await page.waitForLoadState("networkidle");

      const heading = page.locator("h1").first();
      await expect(heading).toBeVisible();
      await expect(heading).toContainText(route.title);
    }

    expect(pageErrors).toHaveLength(0);
    expect(serverErrors).toHaveLength(0);
  });

  test("2. Cross-Module Navigation & HR Workspace Tab Preservation", async ({ page }) => {
    await page.goto("/hr");
    await page.waitForLoadState("networkidle");

    await page.click("id=hr-tab-employees");
    await page.waitForURL("**/hr/employees");
    await expect(page.locator("h1").first()).toContainText("Hồ sơ nhân viên");

    await page.click("id=hr-tab-assignments");
    await page.waitForURL("**/hr/project-assignments");
    await expect(page.locator("h1").first()).toContainText("Quản lý điều động nhân sự công trình");

    await page.click("id=hr-tab-reports");
    await page.waitForURL("**/hr/reports");
    await expect(page.locator("h1").first()).toContainText("Báo cáo và phân tích nhân sự");
  });

  test("3. Excel Export API Route & Multi-Sheet ExcelJS Validation", async ({ page }) => {
    await page.goto("/hr/reports");
    await page.waitForLoadState("networkidle");

    const response = await page.request.get("/api/hr/reports/export");
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

    const buffer = await response.body();
    expect(buffer.length).toBeGreaterThan(0);

    const workbook = new Workbook.Workbook();
    await workbook.xlsx.load(buffer as any);

    expect(workbook.worksheets.length).toBe(3);
    const sheetNames = workbook.worksheets.map((s) => s.name);
    expect(sheetNames).toContain("Tổng quan");
    expect(sheetNames).toContain("Chi tiết điều động");
    expect(sheetNames).toContain("Cơ cấu theo đơn vị");
  });
});
