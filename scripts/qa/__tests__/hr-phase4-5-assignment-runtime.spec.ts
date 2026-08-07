import { test, expect } from "@playwright/test";

test.describe("HR Phase 4.5.3 — Project Assignment UI Runtime Suite", () => {
  test("1. Project Assignment List UI rendering and Workspace Tab interaction", async ({ page }) => {
    await page.goto("/hr/project-assignments");
    await page.waitForLoadState("networkidle");

    const heading = page.locator("h1").first();
    await expect(heading).toContainText("Quản lý điều động nhân sự công trình");

    // Verify workspace tab active state
    const assignTab = page.locator("id=hr-tab-assignments");
    await expect(assignTab).toBeVisible();
  });
});
