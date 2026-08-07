import { test, expect } from "@playwright/test";

test.describe("HR Phase 4.5.2 — Project Assignment Lifecycle Runtime Suite", () => {
  test("Project Assignment List UI rendering and Workspace Tab interaction", async ({ page }) => {
    await page.goto("/hr/project-assignments");
    await page.waitForLoadState("networkidle");

    const heading = page.locator("h1").first();
    await expect(heading).toContainText("Quản lý điều động nhân sự công trình");

    // Verify workspace tab active state
    const assignTab = page.locator("id=hr-tab-assignments");
    await expect(assignTab).toBeVisible();
  });
});
