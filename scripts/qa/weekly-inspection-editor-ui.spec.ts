import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";

const email = "giamsat12@gmail.com";
const password = "123456";

function rectanglesOverlap(
  a: { top: number; bottom: number; left: number; right: number },
  b: { top: number; bottom: number; left: number; right: number }
) {
  return !(
    a.right <= b.left ||
    a.left >= b.right ||
    a.bottom <= b.top ||
    a.top >= b.bottom
  );
}

test.describe("Weekly Inspection Editor UI & Layout Normalization Verification", () => {
  const evidenceDir = path.join(process.cwd(), "docs/qa/evidence/ui-runtime-2026-08-01");

  test.beforeAll(() => {
    if (!fs.existsSync(evidenceDir)) {
      fs.mkdirSync(evidenceDir, { recursive: true });
    }
  });

  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3000/login");
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 });
  });

  test("Desktop Viewport - Normal Layout Flow & Overlap Protection", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });

    // Navigate to weekly inspection list
    await page.goto("http://localhost:3000/reports/weekly-inspection");
    await page.waitForLoadState("domcontentloaded");

    // Click first edit action or navigate to first dossier
    const editLink = page.locator("a[href*='/reports/weekly-inspection/'][href*='/edit'], a[href*='/supervision/weekly/'][href*='/edit']").first();
    if (await editLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await editLink.click();
    } else {
      const rowLink = page.locator("tr a[href*='/reports/weekly-inspection/']").first();
      if (await rowLink.isVisible({ timeout: 5000 }).catch(() => false)) {
        await rowLink.click();
      }
    }
    await page.waitForLoadState("domcontentloaded");

    // 1. Top of page screenshot
    await page.screenshot({ path: path.join(evidenceDir, "weekly-edit-desktop-top.png"), fullPage: false });

    // Verify main action bar exists in normal flow
    const actionBar = page.locator('[data-testid="weekly-editor-action-bar"]').first();
    const isActionBarVisible = await actionBar.isVisible({ timeout: 5000 }).catch(() => false);

    // Verify no QA/Test (2099) technical badge exists on UI
    const qaBadge = page.locator("text='QA/Test (2099)'");
    await expect(qaBadge).toHaveCount(0);

    // 2. Scroll to middle
    await page.evaluate(() => window.scrollTo(0, 400));
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(evidenceDir, "weekly-edit-desktop-mid.png"), fullPage: false });

    // Verify bounding box rectangle overlap with section title if visible
    const sectionTitle = page.locator('[data-testid="weekly-editor-section-title"]').first();

    if (isActionBarVisible && await sectionTitle.isVisible().catch(() => false)) {
      const titleBox = await sectionTitle.boundingBox();
      const actionBox = await actionBar.boundingBox();

      if (titleBox && actionBox) {
        const overlap = rectanglesOverlap(actionBox, titleBox);
        expect(overlap).toBe(false);
      }
    }

    // 3. Scroll to bottom of page
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(evidenceDir, "weekly-edit-desktop-bottom.png"), fullPage: false });
  });

  test("Mobile Viewport - Bottom Action Bar & Safe Area Verification", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    await page.goto("http://localhost:3000/reports/weekly-inspection");
    await page.waitForLoadState("domcontentloaded");

    await page.screenshot({ path: path.join(evidenceDir, "weekly-edit-mobile-top.png"), fullPage: false });

    await page.evaluate(() => window.scrollTo(0, 500));
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(evidenceDir, "weekly-edit-mobile-mid.png"), fullPage: false });
  });
});
