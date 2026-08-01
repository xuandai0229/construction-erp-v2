import { test, expect } from "@playwright/test";
import prisma from "../../src/lib/prisma";
import "dotenv/config";

test.describe("Safety Weekly File Delete E2E Pipeline", () => {
  const testAnchorDate = "2026-12-07"; // Unique test date for W49-2026
  let adminUserId = "";

  test.beforeAll(async () => {
    const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
    if (admin) {
      adminUserId = admin.id;
    }
  });

  test("Admin can successfully delete a weekly safety file from UI portal menu", async ({ page }) => {
    // 1. Ensure clean slate for test anchor date
    const weekStart = new Date("2026-12-07");
    await prisma.safetyWeeklyFile.deleteMany({
      where: { periodStart: weekStart },
    });

    // 2. Navigate directly to /reports/safety (already authenticated via storageState)
    await page.goto("/reports/safety");
    await page.waitForLoadState("networkidle");

    // 3. Open Create Modal & Create QA Dossier
    const createBtn = page.locator("button:has-text('Tạo hồ sơ tuần')");
    await expect(createBtn).toBeVisible({ timeout: 15000 });
    await createBtn.click();

    const dateInput = page.locator("input[type='date']");
    await expect(dateInput).toBeVisible();
    await dateInput.fill(testAnchorDate);

    const submitCreateBtn = page.locator("button:has-text('Khởi tạo hồ sơ')");
    await submitCreateBtn.click();

    // 4. Wait for redirect to detail workspace then navigate back to list
    await page.waitForURL(/\/reports\/safety\/weekly-files\/.*/, { timeout: 15000 });
    const createdUrl = page.url();
    const createdWfId = createdUrl.split("/weekly-files/")[1];
    expect(createdWfId).toBeTruthy();

    await page.goto("/reports/safety");
    await page.waitForLoadState("networkidle");

    // 5. Verify row exists in list
    const rowMenuTrigger = page.locator("button[aria-label='Mở menu thao tác hồ sơ']").first();
    await expect(rowMenuTrigger).toBeVisible({ timeout: 10000 });

    // 6. Click 3-dots trigger to open Portal Menu
    await rowMenuTrigger.click();

    // 7. Verify Portal Menu button "Xóa hồ sơ" is visible
    const deleteBtn = page.locator("button:has-text('Xóa hồ sơ')");
    await expect(deleteBtn).toBeVisible();

    // 8. Click "Xóa hồ sơ" button
    await deleteBtn.click();

    // 9. Verify row is immediately removed from UI
    await expect(page.locator(`text=${createdWfId}`)).not.toBeVisible({ timeout: 10000 });

    // 10. Refresh page to confirm row does NOT reappear
    await page.reload();
    await page.waitForLoadState("networkidle");
    await expect(page.locator(`text=${createdWfId}`)).not.toBeVisible();

    // 11. Database Verification
    const dbWf = await prisma.safetyWeeklyFile.findUnique({
      where: { id: createdWfId },
      include: { plans: true, assessments: true },
    });

    expect(dbWf?.deletedAt).not.toBeNull();
    expect(dbWf?.deletedById).toBe(adminUserId);
    expect(dbWf?.plans[0]?.deletedAt).not.toBeNull();
    expect(dbWf?.plans[0]?.status).toBe("CANCELLED");
    expect(dbWf?.assessments[0]?.deletedAt).not.toBeNull();
    expect(dbWf?.assessments[0]?.status).toBe("CANCELLED");

    const auditLog = await prisma.safetyReportAuditLog.findFirst({
      where: { reportId: createdWfId, action: "DELETE" },
    });
    expect(auditLog).not.toBeNull();
  });
});
