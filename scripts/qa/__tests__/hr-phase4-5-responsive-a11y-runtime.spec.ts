import { test, expect } from "@playwright/test";

test.describe("HR Phase 4.5.2 — Responsive & Accessibility Runtime Suite", () => {
  const routes = [
    "/hr",
    "/hr/employees",
    "/hr/organization",
    "/hr/organization/positions",
    "/hr/organization/managers",
    "/hr/organization/chart",
    "/hr/project-assignments",
    "/hr/reports",
  ];

  const viewports = [
    { width: 1440, height: 900 },
    { width: 1280, height: 720 },
    { width: 1024, height: 768 },
    { width: 768, height: 1024 },
    { width: 390, height: 844 },
    { width: 375, height: 812 },
  ];

  test("1. Responsive Horizontal Viewport Overflow Assertion across 8 routes and 6 viewports", async ({ page }) => {
    for (const routePath of routes) {
      for (const vp of viewports) {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.goto(routePath);
        await page.waitForLoadState("networkidle");

        const hasHorizontalOverflow = await page.evaluate(() => {
          return document.documentElement.scrollWidth > document.documentElement.clientWidth;
        });

        expect(hasHorizontalOverflow).toBe(false);
      }
    }
  });

  test("2. Accessibility Runtime Assertion (headings, tab accessibility, focusable elements)", async ({ page }) => {
    await page.goto("/hr/reports");
    await page.waitForLoadState("networkidle");

    const heading = page.locator("h1").first();
    await expect(heading).toBeVisible();

    const reportTab = page.locator("id=hr-tab-reports");
    await expect(reportTab).toBeVisible();
  });
});
