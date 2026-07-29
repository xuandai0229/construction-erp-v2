import { test, expect } from "@playwright/test";

test.describe("Tổng hợp báo cáo tuần - E2E & Inline Modal Verification", () => {
  // ─── /reports Hub Verification ────────────────────────────
  test("trang /reports không còn thẻ Báo cáo họp tuần", async ({ page }) => {
    await page.goto("/reports");
    await expect(page.getByText("Báo cáo")).toBeVisible();

    // Should NOT have executive/meeting report card
    await expect(page.getByText("Báo cáo họp tuần")).toHaveCount(0);
    await expect(page.getByText("Ban Điều Hành")).toHaveCount(0);

    // Should have field progress card
    await expect(page.getByRole("link", { name: /Báo cáo hiện trường/i })).toBeVisible();
  });

  test("route /reports/executive trả 404", async ({ page }) => {
    const response = await page.goto("/reports/executive");
    expect(response?.status()).toBe(404);
  });

  // ─── Weekly Tab & Summary Button ──────────────────────────
  test("tab Báo cáo tuần có nút Tổng hợp", async ({ page }) => {
    await page.goto("/reports/field?tab=weekly");
    await expect(page.getByRole("button", { name: /Tổng hợp báo cáo tuần/i })).toBeVisible();
  });

  // ─── Summary Page (Clean Inline View) ─────────────────────
  test("bấm nút tổng hợp mở trang kết quả không chứa KPI trạng thái phê duyệt", async ({ page }) => {
    await page.goto("/reports/field?tab=weekly&weekStart=2026-07-20");
    await page.getByRole("button", { name: /Tổng hợp báo cáo tuần/i }).click();
    await expect(page).toHaveURL(/weekly-summary/);
    await expect(page.getByRole("heading", { name: /Tổng hợp báo cáo tuần/i })).toBeVisible();

    // Must NOT contain old administrative badges / metadata
    const content = await page.textContent("body");
    expect(content).not.toContain("Phạm vi: Toàn bộ công trình");
    expect(content).not.toContain("Thời điểm tổng hợp");
    expect(content).not.toContain("BC-BĐH");
    expect(content).not.toContain("Đã duyệt");
    expect(content).not.toContain("Chờ duyệt");
    expect(content).not.toContain("Cần bổ sung");
  });

  // ─── Inline Modal Preview Verification ────────────────────
  test("nút Xem bản in / PDF mở fullscreen modal mà không đổi URL", async ({ page }) => {
    await page.goto("/reports/field/weekly-summary?weekStart=2026-07-20");
    const currentUrl = page.url();

    await page.getByRole("button", { name: /Xem bản in \/ PDF/i }).click();

    // URL stays unchanged
    expect(page.url()).toBe(currentUrl);

    // Modal elements are visible
    await expect(page.getByText("Bản xem trước văn bản")).toBeVisible();
    await expect(page.getByText("CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM")).toBeVisible();
    await expect(page.getByText("CÔNG TY CỔ PHẦN XÂY DỰNG")).toBeVisible();
    await expect(page.getByText("1. Bảng tổng hợp kết quả các công trình")).toBeVisible();
    await expect(page.getByText("2. Nội dung chi tiết từng công trình")).toBeVisible();

    // Modal MUST NOT contain signature blocks
    const modalContent = await page.textContent("body");
    expect(modalContent).not.toContain("NGƯỜI LẬP BÁO CÁO");
    expect(modalContent).not.toContain("BAN ĐIỀU HÀNH");

    // Close button (Esc)
    await page.keyboard.press("Escape");
    await expect(page.getByText("Bản xem trước văn bản")).toHaveCount(0);
  });

  // ─── Server PDF & Word API Endpoints ──────────────────────
  test("API PDF export-pdf trả về HTTP 200 và content-type application/pdf", async ({ request }) => {
    const res = await request.get("/api/reports/weekly-summary/export-pdf?weekStart=2026-07-20");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("application/pdf");
  });

  test("API Word export trả về HTTP 200 và content-type docx", async ({ request }) => {
    const res = await request.get("/api/reports/weekly-summary/export?weekStart=2026-07-20");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("wordprocessingml");
  });
});
