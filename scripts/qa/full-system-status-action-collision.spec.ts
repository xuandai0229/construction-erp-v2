import { test, expect } from '@playwright/test';

function boxesOverlap(
  box1: { x: number; y: number; width: number; height: number },
  box2: { x: number; y: number; width: number; height: number }
): boolean {
  return !(
    box1.x + box1.width <= box2.x ||
    box2.x + box2.width <= box1.x ||
    box1.y + box1.height <= box2.y ||
    box2.y + box2.height <= box1.y
  );
}

test.describe('Status & Action Table Column Layout Contract & Optional Data Audit', () => {
  const viewports = [
    { width: 1920, height: 1080, name: '1920x1080' },
    { width: 1600, height: 900, name: '1600x900' },
    { width: 1440, height: 900, name: '1440x900' },
    { width: 1366, height: 768, name: '1366x768' },
    { width: 1280, height: 800, name: '1280x800' },
  ];

  for (const vp of viewports) {
    test(`Desktop Viewport ${vp.name}: Status and Action columns have guaranteed gap >= 12px and 0 overlap`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/users');
      await page.waitForLoadState('networkidle');

      // Check horizontal scrollbar on document
      const hasPageHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth + 2;
      });
      expect(hasPageHorizontalScroll).toBe(false);

      // Locate rows
      const rows = page.locator('tbody tr');
      const rowCount = await rows.count();
      expect(rowCount).toBeGreaterThan(0);

      for (let i = 0; i < Math.min(rowCount, 5); i++) {
        const row = rows.nth(i);
        const statusBadge = row.locator('[data-status-badge] span').first();
        const viewButton = row.locator('[data-action-view]').first();
        const editButton = row.locator('[data-action-edit]').first();

        if ((await statusBadge.isVisible()) && (await viewButton.isVisible())) {
          const statusBox = await statusBadge.boundingBox();
          const viewBox = await viewButton.boundingBox();

          expect(statusBox).not.toBeNull();
          expect(viewBox).not.toBeNull();

          if (statusBox && viewBox) {
            // 1. Assert no bounding box overlap
            const overlap = boxesOverlap(statusBox, viewBox);
            expect(overlap).toBe(false);

            // 2. Assert gap >= 12px (Status right to View left)
            const gap = viewBox.x - (statusBox.x + statusBox.width);
            expect(gap).toBeGreaterThanOrEqual(12);
          }

          if (await editButton.isVisible()) {
            const editBox = await editButton.boundingBox();
            if (viewBox && editBox) {
              // Assert View and Edit do not overlap
              expect(boxesOverlap(viewBox, editBox)).toBe(false);
            }
          }
        }
      }
    });
  }

  test('Optional Data Presentation: No lone "@" or "· @" in metadata across rows', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.goto('/users');
    await page.waitForLoadState('networkidle');

    const bodyText = await page.locator('tbody').innerText();

    // Assert that string "· @" or " @ " does not appear in table body
    expect(bodyText).not.toContain('· @');
    expect(bodyText).not.toMatch(/\s+@\s+/);
  });

  test('Mobile Responsive Mode (430x932): Renders User Cards without 5-column table or horizontal page scroll', async ({ page }) => {
    await page.setViewportSize({ width: 430, height: 932 });
    await page.goto('/users');
    await page.waitForLoadState('networkidle');

    // Desktop table should be hidden
    const desktopTable = page.locator('table');
    await expect(desktopTable).not.toBeVisible();

    // Mobile cards should be visible
    const mobileCards = page.locator('.lg\\:hidden > div');
    const cardCount = await mobileCards.count();
    expect(cardCount).toBeGreaterThan(0);

    // Assert zero page horizontal scrollbar
    const hasPageHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth + 2;
    });
    expect(hasPageHorizontalScroll).toBe(false);
  });
});
