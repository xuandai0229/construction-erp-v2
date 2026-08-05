import { test, expect } from "@playwright/test";

test.describe("QA Guard — Production Route 404 Enforcement", () => {
  test("Test harness route is gated by ENABLE_QA_ROUTES for authenticated users", async ({ page }) => {
    await page.goto("/hr/test-idor");

    if (process.env.ENABLE_QA_ROUTES === "true") {
      // When QA flag IS set, route should render harness UI
      await expect(page.locator("h1")).toHaveText("QA IDOR Test Harness");
      await expect(page.locator("#deactivate-btn")).toBeVisible();
    } else {
      // When QA flag is NOT set, route triggers notFound() showing 404/Not Found UI
      await expect(page.locator("#deactivate-btn")).not.toBeVisible();
      await expect(page.locator("body")).toContainText("Không tìm thấy hồ sơ");
    }
  });
});
