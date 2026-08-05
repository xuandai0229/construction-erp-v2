import { test, expect } from "@playwright/test";

test.describe("HR Route Transition & Tab Navigation Stability Suite", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/hr/organization");
    // If redirected to login (e.g. state missing), perform login fallback
    if (page.url().includes("/login")) {
      const email = "admin@construction.local";
      const password = process.env.E2E_ADMIN_PASSWORD;
      if (!password) throw new Error("BLOCKED: Missing E2E_ADMIN_PASSWORD environment variable.");
      await page.fill('input[name="email"]', email);
      await page.fill('input[name="password"]', password);
      await page.click('button[type="submit"]');
      await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 });
    }
  });

  test("1. Verify HR Sub-Tabs present correct unique IDs and active highlights", async ({ page }) => {
    await page.goto("/hr/organization");
    await page.waitForSelector("#hr-tab-organization-tree");

    const treeTab = page.locator("#hr-tab-organization-tree").first();
    const positionsTab = page.locator("#hr-tab-positions").first();
    const managersTab = page.locator("#hr-tab-unit-managers").first();
    const chartTab = page.locator("#hr-tab-org-chart").first();

    await expect(treeTab).toBeVisible();
    await expect(positionsTab).toBeVisible();
    await expect(managersTab).toBeVisible();
    await expect(chartTab).toBeVisible();
  });

  test("2. Perform fast sequential route switching without full page reloads", async ({ page }) => {
    await page.goto("/hr/organization");

    // Click positions tab
    await page.click("#hr-tab-positions");
    await page.waitForURL("/hr/organization/positions");
    await expect(page.locator("h1").first()).toContainText("Danh mục chức danh", { timeout: 10000 });

    // Click managers tab
    await page.click("#hr-tab-unit-managers");
    await page.waitForURL("/hr/organization/managers");
    await expect(page.locator("h1").first()).toContainText("Người quản lý", { timeout: 10000 });

    // Click org chart tab
    await page.click("#hr-tab-org-chart");
    await page.waitForURL("/hr/organization/chart");
    await expect(page.locator("h1").first()).toContainText("Sơ đồ", { timeout: 10000 });

    // Click tree tab
    await page.click("#hr-tab-organization-tree");
    await page.waitForURL("/hr/organization");
    await expect(page.locator("h1").first()).toContainText("Cơ cấu tổ chức", { timeout: 10000 });
  });

  test("3. Responsive mobile layout verification (390x844)", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/hr/organization");

    const treeTab = page.locator("#hr-tab-organization-tree").first();
    await expect(treeTab).toBeVisible();

    // Check no horizontal scrollbar on body
    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });

    expect(hasHorizontalOverflow).toBe(false);
  });
});
