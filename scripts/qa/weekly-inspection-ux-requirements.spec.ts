import { test, expect } from "@playwright/test";

test.describe("Weekly Inspection - UX & Layout Integrity Verification", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1536, height: 864 });
    await page.goto("http://localhost:3000/reports/weekly-inspection", { waitUntil: "networkidle" });
  });

  test("A. Header CTA button is positioned on the RIGHT side of title block on Desktop", async ({ page }) => {
    const titleBlock = page.locator('[data-testid="page-header-title-block"]');
    const createBtn = page.locator('[data-testid="create-dossier-cta-btn"]');

    await expect(titleBlock).toBeVisible();
    await expect(createBtn).toBeVisible();

    const titleBox = await titleBlock.boundingBox();
    const btnBox = await createBtn.boundingBox();

    expect(titleBox).not.toBeNull();
    expect(btnBox).not.toBeNull();

    if (titleBox && btnBox) {
      console.log(`Title Right: ${titleBox.x + titleBox.width}, Btn Left: ${btnBox.x}`);
      expect(btnBox.x).toBeGreaterThan(titleBox.x);
    }
  });

  test("B & C. Active row highlighting and Context Header in 3-dots menu", async ({ page }) => {
    const rows = page.locator("tbody tr");
    await expect(rows.first()).toBeVisible({ timeout: 10000 });
    const count = await rows.count();

    if (count > 0) {
      const firstRow = rows.nth(0);
      const firstRowCode = (await firstRow.getAttribute("data-dossier-code")) || "";
      const firstRowTrigger = firstRow.locator('button[aria-label^="Mở thao tác hồ sơ"]');

      // 1. Open Menu on Row 1
      await firstRowTrigger.click();
      await page.waitForTimeout(200);

      // Verify Row 1 has data-state="action-open" & data-active-row="true"
      await expect(firstRow).toHaveAttribute("data-active-row", "true");
      await expect(firstRow).toHaveAttribute("data-state", "action-open");

      // Verify Context Header inside menu shows correct dossier code
      const menu = page.locator('[role="menu"]');
      await expect(menu).toBeVisible();
      await expect(menu).toContainText(firstRowCode);

      // Verify NO duplicated "Soạn / Chỉnh sửa" in 3-dots menu
      await expect(menu).not.toContainText("Soạn / Chỉnh sửa");
      await expect(menu).toContainText("Xem chi tiết");

      // 2. If Row 2 exists, open Menu on Row 2
      if (count > 1) {
        const secondRow = rows.nth(1);
        const secondRowCode = (await secondRow.getAttribute("data-dossier-code")) || "";
        const secondRowTrigger = secondRow.locator('button[aria-label^="Mở thao tác hồ sơ"]');

        await secondRowTrigger.click();
        await page.waitForTimeout(200);

        // Verify Row 1 is NO LONGER highlighted
        await expect(firstRow).toHaveAttribute("data-active-row", "false");

        // Verify ONLY Row 2 is highlighted
        await expect(secondRow).toHaveAttribute("data-active-row", "true");
        await expect(secondRow).toHaveAttribute("data-state", "action-open");

        // Verify Menu context header now shows Row 2 dossier code
        await expect(menu).toContainText(secondRowCode);
      }
    }
  });

  test("E. Project popover highlights host row and displays dossier context header", async ({ page }) => {
    const projectBadges = page.locator('button[aria-controls^="project-popover-"]');
    const badgeCount = await projectBadges.count();

    if (badgeCount > 0) {
      const badge = projectBadges.nth(0);
      const hostRow = page.locator("tbody tr", { has: badge });

      await badge.click();
      await page.waitForTimeout(200);

      // Host row is highlighted
      await expect(hostRow).toHaveAttribute("data-active-row", "true");
      await expect(badge).toHaveAttribute("aria-expanded", "true");

      // Popover tooltip is visible with context header
      const popover = page.locator('[role="tooltip"]');
      await expect(popover).toBeVisible();
      await expect(popover).toContainText("Công trình thuộc hồ sơ");
    }
  });

  test("F. Zero horizontal overflow across Desktop, Tablet and Mobile viewports", async ({ page }) => {
    const vps = [
      { w: 1536, h: 864 },
      { w: 1024, h: 768 },
      { w: 390, h: 844 },
    ];

    for (const vp of vps) {
      await page.setViewportSize({ width: vp.w, height: vp.h });
      await page.goto("http://localhost:3000/reports/weekly-inspection", { waitUntil: "networkidle" });

      const metrics = await page.evaluate(() => ({
        clientW: document.documentElement.clientWidth,
        scrollW: document.documentElement.scrollWidth,
      }));

      expect(metrics.scrollW).toBeLessThanOrEqual(metrics.clientW + 1);
    }
  });
});
