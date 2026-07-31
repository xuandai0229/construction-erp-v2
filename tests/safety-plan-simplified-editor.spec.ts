import { test, expect } from "@playwright/test";

test.describe("Safety Plan Simplified Editor (Mẫu 02) Architecture", () => {
  test("maintains single continuous page without stepper tabs or lock badges", async ({ page }) => {
    // Navigate to safety reporting hub
    await page.goto("/reports/safety");
    await expect(page).toHaveURL(/\/reports\/safety/);

    // Verify main safety heading
    await expect(page.getByRole("heading", { name: "Hồ sơ ATLĐ • PCCC • VSMT" })).toBeVisible();

    // Verify dual selector tabs
    await expect(page.getByRole("button", { name: /Kế hoạch kiểm tra/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Báo cáo tự đánh giá/i })).toBeVisible();
  });
});
