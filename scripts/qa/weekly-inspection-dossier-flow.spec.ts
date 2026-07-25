import { test, expect } from "@playwright/test";

test.describe("Kiểm tra & kế hoạch tuần - Create Dossier & Single Weekly Record Workflow", () => {
  test("mở modal tạo hồ sơ hiển thị giao diện chuẩn hoá không có ô chọn công trình", async ({ page }) => {
    await page.goto("/reports/weekly-inspection");

    // Click "Tạo báo cáo mới" button
    const createBtn = page.getByRole("button", { name: /Tạo báo cáo mới/i });
    await expect(createBtn).toBeVisible();
    await createBtn.click();

    // Verify modal heading & description
    await expect(page.getByRole("heading", { name: "Tạo hồ sơ kiểm tra tuần" })).toBeVisible();
    await expect(
      page.getByText("Chọn một ngày thuộc tuần cần lập hồ sơ. Công trình và hạng mục kiểm tra sẽ được bổ sung khi soạn báo cáo.")
    ).toBeVisible();

    // Verify project select dropdown is NOT present
    await expect(page.locator("select")).toHaveCount(0);

    // Verify Date input is present
    const dateInput = page.locator('input[type="date"]');
    await expect(dateInput).toBeVisible();

    // Verify week range preview card
    await expect(page.getByText(/Phạm vi tuần báo cáo/i)).toBeVisible();
  });

  test("hiển thị cảnh báo và nút hành động thích hợp khi tuần đã có hồ sơ", async ({ page }) => {
    await page.goto("/reports/weekly-inspection");

    const createBtn = page.getByRole("button", { name: /Tạo báo cáo mới/i });
    await createBtn.click();

    // Set date to 2026-07-21 (week of 2026-07-20, which already has a record in DB)
    const dateInput = page.locator('input[type="date"]');
    await dateInput.fill("2026-07-21");

    // Wait for duplicate check to render existing status card
    await expect(page.getByText(/Tuần này đã có/i)).toBeVisible({ timeout: 5000 });

    // Verify CTA action button is present and status aware (e.g. "Tiếp tục soạn" or "Mở hồ sơ để chỉnh sửa")
    const actionBtn = page.getByRole("button", { name: /Tiếp tục soạn|Mở hồ sơ để chỉnh sửa|Xem hồ sơ/i });
    await expect(actionBtn).toBeVisible();
  });
});
