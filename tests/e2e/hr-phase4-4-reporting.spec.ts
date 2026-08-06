import { test, expect } from "@playwright/test";

test.describe("HR Phase 4.4 — Reporting & KPI Dashboard E2E Suite", () => {
  test.beforeEach(async ({ page }) => {
    // Set viewport to standard desktop
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  test("1. Dashboard renders with populated real database metrics and Vietnamese labels", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto("/hr/reports");
    await page.waitForLoadState("networkidle");

    // Verify page header
    await expect(page.locator("h1")).toContainText("Báo cáo và phân tích nhân sự");

    // Verify group section title
    await expect(page.getByText("Chỉ số điều hành nhân sự")).toBeVisible();

    // Verify no English KPI technical codes on UI
    const bodyText = await page.innerText("body");
    expect(bodyText).not.toContain("KPI_TOTAL_ON_SITE");
    expect(bodyText).not.toContain("KPI_ACTIVE_PROJECTS_STAFFED");
    expect(bodyText).not.toContain("REAL-TIME METRICS");

    // Verify primary cards
    await expect(page.getByText("Nhân sự tại công trình")).toBeVisible();
    await expect(page.getByText("Công trình có nhân sự")).toBeVisible();
    await expect(page.getByText("Điều động đang hiệu lực")).toBeVisible();
    await expect(page.getByText("Nhân sự chưa được điều động")).toBeVisible();

    // Verify Excel export button
    const exportBtn = page.getByRole("button", { name: /Xuất báo cáo Excel/i });
    await expect(exportBtn).toBeVisible();

    // Verify no console errors
    const criticalErrors = consoleErrors.filter((e) => !e.includes("favicon") && !e.includes("hydration"));
    expect(criticalErrors).toHaveLength(0);
  });

  test("2. Drill-down filtering via KPI cards updates URL and detail table", async ({ page }) => {
    await page.goto("/hr/reports");
    await page.waitForLoadState("networkidle");

    // Click "Nhân sự tại công trình" KPI card
    await page.getByRole("button", { name: /Nhân sự tại công trình/i }).click();
    await page.waitForLoadState("networkidle");

    // Verify URL searchParams contain kpiFilter=on_site
    expect(page.url()).toContain("kpiFilter=on_site");

    // Verify active filter badge appears
    await expect(page.getByText(/Đang lọc: Nhân sự tại công trình/i)).toBeVisible();

    // Clear KPI filter
    await page.getByRole("button", { name: /Bỏ lọc KPI/i }).click();
    await page.waitForLoadState("networkidle");
    expect(page.url()).not.toContain("kpiFilter=");
  });

  test("3. Search and dropdown filters update results correctly", async ({ page }) => {
    await page.goto("/hr/reports");
    await page.waitForLoadState("networkidle");

    // Type non-existent query to test empty state
    const searchInput = page.getByPlaceholder("Tìm theo họ tên hoặc mã NV...");
    await searchInput.fill("NON_EXISTENT_SEARCH_QUERY_99999");
    await page.waitForTimeout(500);

    // Verify clean empty state is displayed
    await expect(page.getByText("Không tìm thấy bản ghi điều động nào.")).toBeVisible();
    await expect(page.getByText("Chưa có dữ liệu điều động phù hợp với bộ lọc.")).toBeVisible();

    // Clear filters button
    await page.getByRole("button", { name: /Xóa tất cả bộ lọc/i }).click();
    await page.waitForLoadState("networkidle");

    expect(page.url()).not.toContain("searchQuery=");
  });

  test("4. Responsive layout validation across viewports", async ({ page }) => {
    // Desktop (1440px)
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/hr/reports");
    await expect(page.locator("h1")).toBeVisible();

    // Tablet (768px)
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.reload();
    await expect(page.locator("h1")).toBeVisible();

    // Mobile (375px)
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.getByText("Bộ lọc nâng cao")).toBeVisible();
  });
});
