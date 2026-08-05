import { test, expect } from "@playwright/test";

const hrRoutes = [
  "/hr",
  "/hr/employees",
  "/hr/employees/new",
  "/hr/contracts",
  "/hr/certificates",
  "/hr/organization",
  "/hr/project-assignments",
  "/hr/alerts",
];

test.describe("HR Phase 2 runtime smoke", () => {
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

  for (const route of hrRoutes) {
    test(`${route} renders without server errors`, async ({ page }) => {
      const response = await page.goto(route, { waitUntil: "networkidle" });
      expect(response?.status()).toBeLessThan(500);
      await expect(page.locator("body")).not.toContainText("Application error");
    });
  }

  for (const viewport of [
    { name: "desktop", width: 1440, height: 900 },
    { name: "tablet", width: 768, height: 1024 },
    { name: "mobile", width: 390, height: 844 },
  ]) {
    test(`/hr dashboard and employee list fit ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto("/hr", { waitUntil: "networkidle" });
      await expect(page.getByRole("heading", { name: /Tổng quan nhân sự/i })).toBeVisible();
      const dashboardOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
      expect(dashboardOverflow).toBe(false);
      await page.screenshot({ path: `artifacts/hr-phase2-dashboard-${viewport.name}.png`, fullPage: true });

      await page.goto("/hr/employees", { waitUntil: "networkidle" });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
      expect(overflow).toBe(false);
      await page.screenshot({ path: `artifacts/hr-phase2-${viewport.name}.png`, fullPage: true });
    });
  }
});
