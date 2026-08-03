import { test, expect } from "@playwright/test";

const artifactsDir = "C:/Users/admin/.gemini/antigravity/brain/0dbf49d4-0752-45d9-a912-f1c31cea75a0";

test("Capture 6 Required UX Verification Screenshots", async ({ page }) => {
  // 1. Desktop Header with CTA on the right (1536x864)
  await page.setViewportSize({ width: 1536, height: 864 });
  await page.goto("http://localhost:3000/reports/weekly-inspection", { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  await page.screenshot({
    path: `${artifactsDir}/ux_1_desktop_header_cta_right.png`,
    fullPage: false,
  });

  // 2. Menu open at Row 1
  const rows = page.locator("tbody tr");
  const count = await rows.count();
  if (count > 0) {
    const firstRowTrigger = rows.nth(0).locator('button[aria-label^="Mở thao tác hồ sơ"]');
    await firstRowTrigger.click();
    await page.waitForTimeout(400);
    await page.screenshot({
      path: `${artifactsDir}/ux_2_menu_open_row_1.png`,
      fullPage: false,
    });
  }

  // 3. Menu open at Row 2
  if (count > 1) {
    const secondRowTrigger = rows.nth(1).locator('button[aria-label^="Mở thao tác hồ sơ"]');
    await secondRowTrigger.click();
    await page.waitForTimeout(400);
    await page.screenshot({
      path: `${artifactsDir}/ux_3_menu_open_row_2.png`,
      fullPage: false,
    });
  }

  // 4. Menu auto-flip at Last Row
  if (count > 2) {
    const lastRowIndex = count - 1;
    const lastRowTrigger = rows.nth(lastRowIndex).locator('button[aria-label^="Mở thao tác hồ sơ"]');
    await lastRowTrigger.scrollIntoViewIfNeeded();
    await lastRowTrigger.click();
    await page.waitForTimeout(400);
    await page.screenshot({
      path: `${artifactsDir}/ux_4_menu_autoflip_row_last.png`,
      fullPage: false,
    });
  }

  // 5. Popover công trình mở
  await page.goto("http://localhost:3000/reports/weekly-inspection", { waitUntil: "networkidle" });
  const projectBadges = page.locator('button[aria-controls^="project-popover-"]');
  if ((await projectBadges.count()) > 0) {
    await projectBadges.nth(0).click();
    await page.waitForTimeout(400);
    await page.screenshot({
      path: `${artifactsDir}/ux_5_popover_open.png`,
      fullPage: false,
    });
  }

  // 6. Mobile Layout (390x844)
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("http://localhost:3000/reports/weekly-inspection", { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  await page.screenshot({
    path: `${artifactsDir}/ux_6_mobile_layout.png`,
    fullPage: false,
  });
});
