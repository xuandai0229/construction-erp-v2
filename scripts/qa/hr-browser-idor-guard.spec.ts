import { test, expect } from "@playwright/test";

test.describe("QA Guard — Production Route 404 Enforcement", () => {
  test("Test harness route is gated by ENABLE_QA_ROUTES for authenticated users", async ({ page }) => {
    // page uses global storageState (admin.json) created by globalSetup
    const response = await page.goto("/hr/test-idor");
    const status = response?.status() ?? 0;

    if (process.env.ENABLE_QA_ROUTES === "true") {
      // When QA flag IS set, route should render normally (200)
      expect(status).toBe(200);
      await expect(page.locator("#deactivate-btn")).toBeVisible();
    } else {
      // When QA flag is NOT set, route should return 404 via notFound()
      expect(status).toBe(404);
    }
  });
});
