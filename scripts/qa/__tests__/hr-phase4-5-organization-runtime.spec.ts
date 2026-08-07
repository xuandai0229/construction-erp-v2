import { test, expect } from "@playwright/test";

test.describe("HR Phase 4.5.2 — Organization Module Runtime Suite", () => {
  test("Org Units, Positions, Unit Managers, and Org Chart UI rendering", async ({ page }) => {
    // 1. Org Units
    await page.goto("/hr/organization");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("h1").first()).toContainText("Cơ cấu tổ chức");

    // 2. Positions
    await page.goto("/hr/organization/positions");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("h1").first()).toContainText("Danh mục chức danh");

    // 3. Unit Managers
    await page.goto("/hr/organization/managers");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("h1").first()).toContainText("Người quản lý đơn vị");

    // 4. Org Chart
    await page.goto("/hr/organization/chart");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("h1").first()).toContainText("Sơ đồ cây tổ chức");
  });
});
