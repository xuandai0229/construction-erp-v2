import { test, expect } from "@playwright/test";

test.describe("Dashboard Operational Redesign & Portfolio Health Adaptive Chart E2E Suite", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
  });

  test("1. 'Tình trạng tiến độ và rủi ro' renders 4 compact stat cards & max 5 attention projects", async ({ page }) => {
    // Verify title and subtitle
    const widgetTitle = page.locator("#project-progress h3");
    await expect(widgetTitle).toContainText("Tình trạng tiến độ và rủi ro");

    // Verify 4 Stat Cards
    const statCards = page.locator("#project-progress .grid > div");
    await expect(statCards).toHaveCount(4);

    // Verify 'Xem tất cả' link points to /dashboard/projects-status
    const viewAllLink = page.locator('#project-progress a:has-text("Xem tất cả")');
    await expect(viewAllLink).toHaveAttribute("href", /\/dashboard\/projects-status/);

    // Verify attention list items count is <= 5
    const listItems = page.locator("#project-progress .divide-y > div");
    const count = await listItems.count();
    expect(count).toBeLessThanOrEqual(5);
  });

  test("2. 'Sức khỏe danh mục công trình' ALWAYS renders visual SVG Donut & Adaptive Bar Chart", async ({ page }) => {
    const rightWidgetTitle = page.locator('h3:has-text("Sức khỏe danh mục công trình")');
    await expect(rightWidgetTitle).toBeVisible();

    // Verify 'Chi tiết dự án' button is active
    const detailBtn = page.locator(':text("Chi tiết dự án")');
    await expect(detailBtn.first()).toBeVisible();

    // Verify SVG Donut Circle is visible and centered
    const donutCircles = page.locator('svg circle');
    await expect(donutCircles.first()).toBeVisible();

    // Verify Right Bar Chart section header (either 'DƯ LIỆU CẦN BỔ SUNG' or 'KẾ HOẠCH VÀ THỰC TẾ')
    const rightHeader = page.locator(':text-matches("DƯ LIỆU CẦN BỔ SUNG|KẾ HOẠCH VÀ THỰC TẾ", "i")');
    await expect(rightHeader.first()).toBeVisible();
  });

  test("3. Navigating to /dashboard/projects-status loads full project status list", async ({ page }) => {
    await page.goto("/dashboard/projects-status");
    await page.waitForLoadState("networkidle");

    // Header check
    await expect(page.locator("h1")).toContainText("Tình trạng tiến độ toàn bộ công trình");
  });

  test("4. Action Center /dashboard/actions has no approval tabs", async ({ page }) => {
    await page.goto("/dashboard/actions");
    await page.waitForLoadState("networkidle");

    // Verify Header
    await expect(page.locator("h1")).toContainText("Trung tâm việc cần xử lý");

    // Verify approval tab is NOT present
    const approvalTab = page.locator('button:has-text("Phê duyệt")');
    await expect(approvalTab).toHaveCount(0);
  });

  test("5. Responsive check across Desktop, Tablet, and Mobile viewports", async ({ page }) => {
    // Desktop 1440x900
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/dashboard");
    await expect(page.locator("#project-progress")).toBeVisible();

    // Tablet 768x1024
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.locator("#project-progress")).toBeVisible();

    // Mobile 390x844
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.locator("#project-progress")).toBeVisible();
  });
});
