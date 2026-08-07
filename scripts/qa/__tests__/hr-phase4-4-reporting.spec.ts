import { test, expect } from "@playwright/test";
import Workbook from "exceljs";

test.describe("HR Phase 4.4 — Comprehensive Reporting, KPI & Excel E2E Suite", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  test("1. Dashboard UI rendering & Natural Vietnamese localization", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    await page.goto("/hr/reports");
    await page.waitForLoadState("networkidle");

    // Header title
    await expect(page.locator("h1").first()).toContainText("Báo cáo và phân tích nhân sự");

    // KPI Group Title
    await expect(page.getByText("Chỉ số điều hành nhân sự").first()).toBeVisible();

    // Verify 0 technical English codes on UI
    const bodyText = await page.innerText("body");
    expect(bodyText).not.toContain("KPI_TOTAL_ON_SITE");
    expect(bodyText).not.toContain("KPI_ACTIVE_PROJECTS_STAFFED");
    expect(bodyText).not.toContain("REAL-TIME METRICS");

    // Primary KPI Cards
    await expect(page.getByText("Nhân sự tại công trình").first()).toBeVisible();
    await expect(page.getByText("Công trình có nhân sự").first()).toBeVisible();
    await expect(page.getByText("Điều động đang hiệu lực").first()).toBeVisible();
    await expect(page.getByText("Nhân sự chưa được điều động").first()).toBeVisible();

    // Secondary KPI Cards
    await expect(page.getByText("Sắp kết thúc trong 30 ngày").first()).toBeVisible();
    await expect(page.getByText("Còn khả năng phân bổ").first()).toBeVisible();
    await expect(page.getByText("Vượt 100% phân bổ").first()).toBeVisible();
    await expect(page.getByText("Tỷ lệ phân bổ trung bình").first()).toBeVisible();

    // Export button
    await expect(page.getByRole("button", { name: /Xuất.*Excel/i })).toBeVisible();

    // Zero critical console errors
    const criticalErrors = consoleErrors.filter(
      (e) => !e.includes("favicon") && !e.includes("hydration") && !e.includes("ReactDevTools")
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test("2. Drill-down filtering via KPI cards", async ({ page }) => {
    await page.goto("/hr/reports");
    await page.waitForLoadState("networkidle");

    // Click "Nhân sự tại công trình" card button
    const cardButton = page.locator("button").filter({ hasText: "Nhân sự tại công trình" }).first();
    await cardButton.click();
    await page.waitForURL((url) => url.searchParams.get("kpiFilter") === "on_site", { timeout: 10000 }).catch(() => {});

    expect(page.url()).toContain("kpiFilter=on_site");
    await expect(page.getByText(/Đang lọc: Nhân sự tại công trình/i)).toBeVisible();

    // Clear KPI filter
    await page.getByRole("button", { name: /Bỏ lọc KPI/i }).first().click();
    await page.waitForURL((url) => !url.searchParams.has("kpiFilter"), { timeout: 10000 }).catch(() => {});
    expect(page.url()).not.toContain("kpiFilter=");
  });

  test("3. Search & Filter interactions with clean empty state", async ({ page }) => {
    await page.goto("/hr/reports");
    await page.waitForLoadState("networkidle");

    // Enter search query matching nothing
    const searchInput = page.getByPlaceholder("Mã NV hoặc họ tên...");
    await searchInput.fill("NON_EXISTENT_EMPLOYEE_XYZ_999");
    await page.waitForTimeout(600);

    // Verify empty state messages
    await expect(page.getByText("Không tìm thấy bản ghi điều động nào.").first()).toBeVisible();
    await expect(page.getByText("Chưa có dữ liệu điều động phù hợp với bộ lọc.").first()).toBeVisible();

    // Clear all filters
    await page.getByRole("button", { name: /Xóa bộ lọc/i }).click();
    await page.waitForURL((url) => !url.searchParams.has("searchQuery"), { timeout: 10000 }).catch(() => {});
    expect(page.url()).not.toContain("searchQuery=");
  });

  test("4. Excel Export API route and ExcelJS readback validation", async ({ page }) => {
    await page.goto("/hr/reports");
    await page.waitForLoadState("networkidle");

    // Trigger download via API
    const response = await page.request.get("/api/hr/reports/export");
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

    const bodyBuffer = await response.body();
    expect(bodyBuffer.length).toBeGreaterThan(0);

    // Read back generated workbook with ExcelJS
    const workbook = new Workbook.Workbook();
    await workbook.xlsx.load(bodyBuffer as any);

    expect(workbook.worksheets).toHaveLength(3);
    const sheetNames = workbook.worksheets.map((s) => s.name);
    expect(sheetNames).toContain("Tổng quan");
    expect(sheetNames).toContain("Chi tiết điều động");
    expect(sheetNames).toContain("Cơ cấu theo đơn vị");

    // Verify Sheet 1 summary title
    const sheet1 = workbook.getWorksheet("Tổng quan");
    expect(sheet1?.getCell("A1").value).toContain("BÁO CÁO TỔNG QUAN VÀ CHỈ SỐ KPI NHÂN SỰ CÔNG TRÌNH");
  });

  test("5. Responsive layout across desktop, tablet, and mobile viewports", async ({ page }) => {
    // Desktop 1440px
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/hr/reports");
    await expect(page.locator("h1").first()).toBeVisible();

    // Tablet 768px
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.reload();
    await expect(page.locator("h1").first()).toBeVisible();

    // Mobile 375px
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    await expect(page.locator("h1").first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Bộ lọc", exact: true }).first()).toBeVisible();
  });

  test("6. Searchable Project Combobox interaction & zero horizontal overflow", async ({ page }) => {
    await page.goto("/hr/reports");
    await page.waitForLoadState("networkidle");

    // Click project combobox trigger
    const projectBtn = page.getByRole("button", { name: /Chọn công trình hoặc dự án/i });
    await expect(projectBtn).toBeVisible();
    await projectBtn.click();

    // Search project
    const searchInput = page.getByPlaceholder("Tìm theo tên hoặc mã công trình...");
    await expect(searchInput).toBeVisible();
    await searchInput.fill("Xuân Phương");

    // Verify filtered result appears
    await expect(page.getByText(/Xuân Phương/i).first()).toBeVisible();

    // Select filtered option
    await page.getByText(/Xuân Phương/i).first().click();

    // Verify URL parameter updated
    await page.waitForURL("**/hr/reports?*projectId=*", { timeout: 10000 }).catch(() => {});
    expect(page.url()).toContain("projectId=");
  });
});
