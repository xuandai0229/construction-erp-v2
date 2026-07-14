import { test, expect } from '@playwright/test';

test.use({ storageState: 'playwright/.auth/admin.json' });

test.describe('Mobile Documents Module', () => {
  const viewports = [
    { width: 320, height: 568, name: 'iPhone SE (320px)' },
    { width: 390, height: 844, name: 'iPhone 12/13/14 (390px)' },
    { width: 430, height: 932, name: 'iPhone 14 Pro Max (430px)' },
    { width: 639, height: 800, name: 'Large Mobile (639px)' },
    { width: 640, height: 800, name: 'Tablet (640px)' },
  ];

  for (const v of viewports) {
    test(`Verify documents workspace at ${v.name}`, async ({ page }) => {
      await page.setViewportSize({ width: v.width, height: v.height });
      await page.goto('/documents');
      
      // Navigate to a project documents workspace
      // Using generic selector since projects depend on DB
      const projectCard = page.locator('article.group').first();
      if (await projectCard.isVisible()) {
        await projectCard.click();
        await page.waitForLoadState('networkidle');

        // 1. Screenshot Root Workspace
        await page.screenshot({ path: `docs/qa/artifacts/full-app-mobile-density-2026-07-14/DOCUMENTS-ROOT-${v.width}.png` });

        // 2. Open Mobile Folder Navigator
        if (v.width < 640) {
          const navBtn = page.getByRole('button', { name: 'Duyệt cây thư mục' });
          if (await navBtn.isVisible()) {
            await navBtn.click();
            await page.waitForTimeout(500);
            await page.screenshot({ path: `docs/qa/artifacts/full-app-mobile-density-2026-07-14/DOCUMENTS-NAVIGATOR-${v.width}.png` });

            // Close navigator by clicking trash (or backdrop)
            await page.mouse.click(10, 10);
            await page.waitForTimeout(500);
          }
        }

        // 3. Open Context Menu
        const firstFolderMenuBtn = page.locator('article.group div.absolute button').first();
        if (await firstFolderMenuBtn.isVisible()) {
          await firstFolderMenuBtn.click();
          await page.waitForTimeout(500);
          await page.screenshot({ path: `docs/qa/artifacts/full-app-mobile-density-2026-07-14/DOCUMENTS-MENU-${v.width}.png` });
          
          // Check for overflow
          const isOverflowing = await page.evaluate(() => {
            const root = document.documentElement;
            return root.scrollWidth > root.clientWidth + 1;
          });
          expect(isOverflowing).toBe(false);

          await page.keyboard.press('Escape');
          await page.waitForTimeout(500);
        }
      }
    });
  }
});
