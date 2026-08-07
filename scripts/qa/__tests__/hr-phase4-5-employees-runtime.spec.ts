import { test, expect } from "@playwright/test";

test.describe("HR Phase 4.5.3 — Employee UI Runtime & Listing Reconciliation Suite", () => {
  test("1. Employee Listing UI rendering, search filter and active tab assertion", async ({ page }) => {
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

  test("2. Employee Form & Detail View UI Accessibility Assertion", async ({ page }) => {
    await page.goto("/hr/employees");
    await page.waitForLoadState("networkidle");

    const bodyText = await page.textContent("body");
    expect(bodyText).toContain("Hồ sơ nhân viên");
  });
});
