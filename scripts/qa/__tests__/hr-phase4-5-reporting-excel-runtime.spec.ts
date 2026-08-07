import { test, expect } from "@playwright/test";
import Workbook from "exceljs";

test.describe("HR Phase 4.5.2 — Reporting & Excel Content Readback Runtime Suite", () => {
  test("1. KPI Cards & Searchable Project Combobox Interaction", async ({ page }) => {
    await page.goto("/hr/reports");
    await page.waitForLoadState("networkidle");

    const projectBtn = page.getByRole("button", { name: /Chọn công trình hoặc dự án/i });
    await expect(projectBtn).toBeVisible();
    await projectBtn.click();

    const searchInput = page.getByPlaceholder("Tìm theo tên hoặc mã công trình...");
    await expect(searchInput).toBeVisible();
    await searchInput.fill("Xuân Phương");

    await page.getByText(/Xuân Phương/i).first().click();
    await page.waitForURL("**/hr/reports?*projectId=*", { timeout: 10000 }).catch(() => {});
    expect(page.url()).toContain("projectId=");

    await page.getByRole("button", { name: /Xóa bộ lọc/i }).click();
    await page.waitForURL((url) => !url.searchParams.has("projectId"), { timeout: 10000 }).catch(() => {});
    expect(page.url()).not.toContain("projectId=");
  });

  test("2. Excel Export API Route & ExcelJS 3-Sheet Content Readback", async ({ page }) => {
    await page.goto("/hr/reports");
    await page.waitForLoadState("networkidle");

    const response = await page.request.get("/api/hr/reports/export");
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

    const buffer = await response.body();
    expect(buffer.length).toBeGreaterThan(0);

    const workbook = new Workbook.Workbook();
    await workbook.xlsx.load(buffer as any);

    expect(workbook.worksheets.length).toBe(3);
    const sheetNames = workbook.worksheets.map((s) => s.name);
    expect(sheetNames).toContain("Tổng quan");
    expect(sheetNames).toContain("Chi tiết điều động");
    expect(sheetNames).toContain("Cơ cấu theo đơn vị");
  });
});
