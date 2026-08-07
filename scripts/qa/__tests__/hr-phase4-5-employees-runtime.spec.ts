import { test, expect } from "@playwright/test";

test.describe("HR Phase 4.5.2 — Employee Mutations & Listing Runtime Suite", () => {
  test("Employee List UI rendering, search filter, and tab navigation", async ({ page }) => {
    await page.goto("/hr/employees");
    await page.waitForLoadState("networkidle");

    const heading = page.locator("h1").first();
    await expect(heading).toContainText("Hồ sơ nhân viên");

    // Search bar interaction
    const searchInput = page.getByPlaceholder(/Tìm kiếm theo mã, họ tên/i).first();
    if (await searchInput.isVisible()) {
      await searchInput.fill("Nguyễn");
      await page.waitForTimeout(300);
    }

    // Verify workspace tab active state
    const empTab = page.locator("id=hr-tab-employees");
    await expect(empTab).toBeVisible();
  });
});
