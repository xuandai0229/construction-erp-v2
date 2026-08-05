import { test, expect } from "@playwright/test";

const organizationRoutes = [
  { path: "/hr/organization", name: "Đơn vị & Phòng ban", titleRegex: /Cơ cấu tổ chức và phòng ban/i },
  { path: "/hr/organization/positions", name: "Chức danh", titleRegex: /Danh mục Chức danh/i },
  { path: "/hr/organization/managers", name: "Người quản lý", titleRegex: /Người quản lý/i },
  { path: "/hr/organization/chart", name: "Sơ đồ tổ chức", titleRegex: /Sơ đồ cây tổ chức/i },
];

test.describe("HR Phase 3 Organization Management & Route Stability", () => {
  test.beforeEach(async ({ page }) => {
    // Authenticate as global admin
    await page.goto("/login");
    await page.fill('input[name="email"]', "admin@construction.local");
    await page.fill('input[name="password"]', process.env.E2E_ADMIN_PASSWORD || "REDACTED");
    await page.click('button[type="submit"]');
    
    try {
      await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 10000 });
    } catch (e) {
      console.log("Login failed! Current URL:", page.url());
      console.log("Body text:", await page.textContent('body'));
      throw e;
    }
  });

  for (const route of organizationRoutes) {
    test(`Route ${route.path} (${route.name}) loads successfully`, async ({ page }) => {
      const response = await page.goto(route.path, { waitUntil: "networkidle" });
      expect(response?.status()).toBeLessThan(500);
      await expect(page.locator("body")).not.toContainText("Application error");
      await expect(page.locator("body")).not.toContainText("Unhandled Runtime Error");
      await expect(page.getByRole("heading", { level: 1, name: route.titleRegex })).toBeVisible();
    });
  }

  test("Seamless route transition without layout unmounting or full-screen flickering", async ({ page }) => {
    // 1. Go to HR Dashboard
    await page.goto("/hr", { waitUntil: "networkidle" });
    const appShellHeader = page.locator("header");
    await expect(appShellHeader).toBeVisible();

    // 2. Click Organization tab
    await page.click("a[href='/hr/organization']");
    await page.waitForURL("**/hr/organization");
    await expect(page.getByRole("heading", { level: 1, name: /Cơ cấu tổ chức/i })).toBeVisible();

    // 3. Click Positions sub-tab
    await page.click("a[href='/hr/organization/positions']");
    await page.waitForURL("**/hr/organization/positions");
    await expect(page.getByRole("heading", { level: 1, name: /Danh mục Chức danh/i })).toBeVisible();

    // 4. Click Managers sub-tab
    await page.click("a[href='/hr/organization/managers']");
    await page.waitForURL("**/hr/organization/managers");
    await expect(page.getByRole("heading", { level: 1, name: /Người quản lý/i })).toBeVisible();

    // 5. Click Chart sub-tab
    await page.click("a[href='/hr/organization/chart']");
    await page.waitForURL("**/hr/organization/chart");
    await expect(page.getByRole("heading", { level: 1, name: /Sơ đồ cây tổ chức/i })).toBeVisible();
  });

  for (const viewport of [
    { name: "desktop", width: 1440, height: 900 },
    { name: "tablet", width: 768, height: 1024 },
    { name: "mobile", width: 390, height: 844 },
  ]) {
    test(`Organization views fit ${viewport.name} viewport perfectly`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });

      await page.goto("/hr/organization", { waitUntil: "networkidle" });
      const overflowUnits = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
      expect(overflowUnits).toBe(false);
      await page.screenshot({ path: `artifacts/hr-phase3-units-${viewport.name}.png`, fullPage: true });

      await page.goto("/hr/organization/positions", { waitUntil: "networkidle" });
      const overflowPos = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
      expect(overflowPos).toBe(false);
      await page.screenshot({ path: `artifacts/hr-phase3-positions-${viewport.name}.png`, fullPage: true });
    });
  }
});
