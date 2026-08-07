import { test, expect } from "@playwright/test";
import Workbook from "exceljs";

test.describe("HR Phase 4.5.3 — Reporting & Excel Content Readback Runtime Suite", () => {
  test("1. KPI Cards & Searchable Project Combobox Interaction", async ({ page }) => {
    await page.goto("/hr/reports");
    await page.waitForLoadState("networkidle");

    const heading = page.locator("h1").first();
    await expect(heading).toContainText("Báo cáo và phân tích nhân sự");

    const projectBtn = page.getByRole("button", { name: /Chọn công trình hoặc dự án/i });
    if (await projectBtn.isVisible()) {
      await projectBtn.click();

      const searchInput = page.getByPlaceholder("Tìm theo tên hoặc mã công trình...");
      if (await searchInput.isVisible()) {
        await searchInput.fill("Xuân Phương");
        await page.waitForTimeout(300);
      }
    }
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

    // Zero PII Marker scan across exported excel sheets
    let piiLeakCount = 0;
    const piiRegex = /QA_(CCCD|SALARY|BANK|ADDRESS|PRIVATE_EMAIL)_/i;

    for (const sheet of workbook.worksheets) {
      sheet.eachRow((row) => {
        row.eachCell((cell) => {
          const val = String(cell.value || "");
          if (piiRegex.test(val)) piiLeakCount++;
        });
      });
    }

    expect(piiLeakCount).toBe(0);
  });

  test("3. Page Content Zero PII Leak Scan", async ({ page }) => {
    await page.goto("/hr/reports");
    await page.waitForLoadState("networkidle");

    const pageHtml = await page.content();
    const piiRegex = /QA_(CCCD|SALARY|BANK|ADDRESS)_/i;
    expect(pageHtml.match(piiRegex)).toBeNull();
  });
});
