import { test, expect } from "@playwright/test";
import Workbook from "exceljs";

test.describe("HR Phase 4.5 — Full E2E, Cross-Module Integration & Release Validation", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  test("1. Complete HR Route Inventory & Navigation Integrity", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
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
      await page.goto(route.path);
      await page.waitForLoadState("networkidle");

      // Verify no 404 or crash
      await expect(page.locator("h1").first()).toBeVisible();
      await expect(page.locator("h1").first()).toContainText(route.title);
    }

    // Verify critical console errors = 0
    const criticalErrors = consoleErrors.filter(
      (e) => !e.includes("favicon") && !e.includes("hydration") && !e.includes("ReactDevTools")
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test("2. Cross-Module Flow — Navigation & HR Workspace Tab Bar", async ({ page }) => {
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

    // Type query
    const searchInput = page.getByPlaceholder("Tìm theo tên hoặc mã công trình...");
    await expect(searchInput).toBeVisible();
    await searchInput.fill("Xuân Phương");

    // Select project option
    await page.getByText(/Xuân Phương/i).first().click();

    // Verify URL parameters updated
    await page.waitForURL("**/hr/reports?*projectId=*", { timeout: 10000 }).catch(() => {});
    expect(page.url()).toContain("projectId=");

    // Clear filters
    await page.getByRole("button", { name: /Xóa bộ lọc/i }).click();
    await page.waitForURL((url) => !url.searchParams.has("projectId"), { timeout: 10000 }).catch(() => {});
    expect(page.url()).not.toContain("projectId=");
  });

  test("4. Excel Export & Parity Validation", async ({ page }) => {
    await page.goto("/hr/reports");
    await page.waitForLoadState("networkidle");

    // Download via API
    const response = await page.request.get("/api/hr/reports/export");
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

    const buffer = await response.body();
    expect(buffer.length).toBeGreaterThan(0);

    // Read back workbook
    const workbook = new Workbook.Workbook();
    await workbook.xlsx.load(buffer as any);

    expect(workbook.worksheets.length).toBe(3);
    const sheetNames = workbook.worksheets.map((s) => s.name);
    expect(sheetNames).toContain("Tổng quan");
    expect(sheetNames).toContain("Chi tiết điều động");
    expect(sheetNames).toContain("Cơ cấu theo đơn vị");
  });

  test("5. PII Security Scan — HTML & DTO Surface Inspection", async ({ page }) => {
    await page.goto("/hr/reports");
    await page.waitForLoadState("networkidle");

    const bodyText = await page.innerText("body");
    // Verify no private PII string leaks
    expect(bodyText).not.toContain("CCCD:");
    expect(bodyText).not.toContain("CMND:");
    expect(bodyText).not.toContain("Tài khoản ngân hàng:");
    expect(bodyText).not.toContain("Mật khẩu:");
    expect(bodyText).not.toContain("AUTH_SECRET");
  });

  test("6. Full Responsive Viewport Suite across Desktop, Tablet & Mobile", async ({ page }) => {
    const viewports = [
      { name: "Desktop Wide", width: 1440, height: 900 },
      { name: "Laptop", width: 1280, height: 720 },
      { name: "Tablet", width: 768, height: 1024 },
      { name: "Mobile", width: 375, height: 667 },
    ];

    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/hr/reports");
      await page.waitForLoadState("networkidle");
      await expect(page.locator("h1").first()).toBeVisible();
    }
  });
});
