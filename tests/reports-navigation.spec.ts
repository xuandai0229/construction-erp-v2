import { test, expect } from "@playwright/test";

test.describe("Báo cáo công trình - Navigation Hub & Workspace Direct Access", () => {
  test("chọn Báo cáo hiện trường mở trực tiếp workspace không có workspace tabs", async ({ page }) => {
    await page.goto("/reports");

    await page.getByRole("link", {
      name: /Báo cáo hiện trường/i,
    }).click();

    await expect(page).toHaveURL(/\/reports\/field/);

    await expect(
      page.getByRole("heading", {
        name: "Báo cáo hiện trường",
      })
    ).toBeVisible();

    // Verify back link exists
    await expect(
      page.getByRole("link", {
        name: "Báo cáo công trình",
      })
    ).toBeVisible();

    // Verify workspace selection tabs are NOT rendered in child route
    await expect(
      page.getByRole("tab", {
        name: /Kiểm tra & kế hoạch tuần/i,
      })
    ).toHaveCount(0);
  });

  test("chọn Kiểm tra & kế hoạch tuần mở trực tiếp workspace không có workspace tabs", async ({ page }) => {
    await page.goto("/reports");

    await page.getByRole("link", {
      name: /Kiểm tra & kế hoạch tuần/i,
    }).click();

    await expect(page).toHaveURL(/\/reports\/weekly-inspection/);

    await expect(
      page.getByRole("heading", {
        name: "Kiểm tra & kế hoạch tuần",
      })
    ).toBeVisible();

    // Verify back link exists
    await expect(
      page.getByRole("link", {
        name: "Báo cáo công trình",
      })
    ).toBeVisible();

    // Verify workspace selection tabs are NOT rendered in child route
    await expect(
      page.getByRole("tab", {
        name: /Hiện trường/i,
      })
    ).toHaveCount(0);
  });
});
