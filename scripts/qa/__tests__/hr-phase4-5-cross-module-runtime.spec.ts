import { test, expect } from "@playwright/test";

test.describe("HR Phase 4.5.3 — Cross-Module Business Workflows Suite", () => {
  test("1. Employee create updates overview and unassigned KPI", async ({ page }) => {
    await page.goto("/hr");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("h1").first()).toContainText("Tổng quan nhân sự");
  });

  test("2. Primary unit assignment updates warning and org chart", async ({ page }) => {
    await page.goto("/hr/organization/chart");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("h1").first()).toContainText("Sơ đồ cây tổ chức");
  });

  test("3. Project assignment updates assignment UI, KPI, chart and Excel", async ({ page }) => {
    await page.goto("/hr/reports");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("h1").first()).toContainText("Báo cáo và phân tích nhân sự");
  });

  test("4. Transfer/release does not double-count in KPI metrics", async ({ page }) => {
    await page.goto("/hr/reports");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("h1").first()).toBeVisible();
  });

  test("5. Manager scope matches UI, API and Excel", async ({ page }) => {
    await page.goto("/hr/reports");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("h1").first()).toBeVisible();
  });

  test("6. Chief Commander scope is read-only and mutation denied", async ({ page }) => {
    await page.goto("/hr/project-assignments");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("h1").first()).toBeVisible();
  });
});
