import { test, expect } from "@playwright/test";
import Workbook from "exceljs";

test.describe("HR Phase 4.5.1 — Comprehensive Cross-Module E2E & Release Validation", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  test("1. HR Route Inventory & HTTP Response Status Validation", async ({ page }) => {
    const consoleErrors: string[] = [];
    const failedRequests: string[] = [];

    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    page.on("requestfailed", (request) => {
      failedRequests.push(`${request.method()} ${request.url()}: ${request.failure()?.errorText}`);
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

      await page.waitForLoadState("networkidle");

      // Heading assertion
      const heading = page.locator("h1").first();
      await expect(heading).toBeVisible();
      await expect(heading).toContainText(route.title);
    }

    // Filter out non-critical browser dev notices
    const criticalErrors = consoleErrors.filter(
      (e) => !e.includes("favicon") && !e.includes("hydration") && !e.includes("ReactDevTools")
    );
    expect(criticalErrors).toHaveLength(0);
    expect(failedRequests).toHaveLength(0);
  });

  test("2. Cross-Module Navigation & HR Workspace Tab State Preservation", async ({ page }) => {
    await page.goto("/hr");
    await page.waitForLoadState("networkidle");

    // Click "Hồ sơ nhân viên" tab
    await page.click("id=hr-tab-employees");
    await page.waitForURL("**/hr/employees");
    await expect(page.locator("h1").first()).toContainText("Hồ sơ nhân viên");

    // Click "Điều động công trình" tab
    await page.click("id=hr-tab-assignments");
    await page.waitForURL("**/hr/project-assignments");
    await expect(page.locator("h1").first()).toContainText("Quản lý điều động nhân sự công trình");

    // Click "Báo cáo và phân tích" tab
    await page.click("id=hr-tab-reports");
    await page.waitForURL("**/hr/reports");
    await expect(page.locator("h1").first()).toContainText("Báo cáo và phân tích nhân sự");
  });

  test("3. Searchable Project Combobox & Filter Sync on Reporting Workspace", async ({ page }) => {
    await page.goto("/hr/reports");
    await page.waitForLoadState("networkidle");

    // Open project combobox
    const projectBtn = page.getByRole("button", { name: /Chọn công trình hoặc dự án/i });
    await expect(projectBtn).toBeVisible();
    await projectBtn.click();

    // Search input typing
    const searchInput = page.getByPlaceholder("Tìm theo tên hoặc mã công trình...");
    await expect(searchInput).toBeVisible();
    await searchInput.fill("Xuân Phương");

    // Select project option
    await page.getByText(/Xuân Phương/i).first().click();

    // Verify URL parameter updated
    await page.waitForURL("**/hr/reports?*projectId=*", { timeout: 10000 }).catch(() => {});
    expect(page.url()).toContain("projectId=");

    // Clear filters button
    await page.getByRole("button", { name: /Xóa bộ lọc/i }).click();
    await page.waitForURL((url) => !url.searchParams.has("projectId"), { timeout: 10000 }).catch(() => {});
    expect(page.url()).not.toContain("projectId=");
  });

  test("4. Excel Export API Route & ExcelJS Multi-Sheet Structure Validation", async ({ page }) => {
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

  test("5. PII & Secret Security Surface Inspection", async ({ page }) => {
    await page.goto("/hr/reports");
    await page.waitForLoadState("networkidle");

    const bodyText = await page.innerText("body");
    expect(bodyText).not.toContain("CCCD:");
    expect(bodyText).not.toContain("CMND:");
    expect(bodyText).not.toContain("Tài khoản ngân hàng:");
    expect(bodyText).not.toContain("Mật khẩu:");
    expect(bodyText).not.toContain("AUTH_SECRET");
    expect(bodyText).not.toContain("DATABASE_URL");
  });

  test("6. Responsive Viewport Suite & Horizontal Viewport Overflow Assertion", async ({ page }) => {
    const viewports = [
      { width: 1440, height: 900 },
      { width: 1280, height: 720 },
      { width: 1024, height: 768 },
      { width: 768, height: 1024 },
      { width: 390, height: 844 },
      { width: 375, height: 667 },
    ];

    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/hr/reports");
      await page.waitForLoadState("networkidle");

      // Strict horizontal overflow assertion: scrollWidth <= clientWidth
      const hasHorizontalOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });

      expect(hasHorizontalOverflow).toBe(false);
    }
  });

  test("7. Browser Zoom 125% & 150% Accessibility & Layout Stability", async ({ page }) => {
    await page.goto("/hr/reports");
    await page.waitForLoadState("networkidle");

    // 125% Zoom simulation via CSS transform/zoom
    await page.evaluate(() => {
      document.body.style.zoom = "1.25";
    });
    let hasOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasOverflow).toBe(false);

    // 150% Zoom simulation
    await page.evaluate(() => {
      document.body.style.zoom = "1.5";
    });
    hasOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasOverflow).toBe(false);
  });
});
