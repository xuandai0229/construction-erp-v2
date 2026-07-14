import { test, expect } from '@playwright/test';

test.use({ storageState: 'playwright/.auth/admin.json' });

test.describe('Mobile App Shell & Viewport Overflow', () => {
  const viewports = [
    { width: 320, height: 568, name: 'iPhone SE (320px)' },
    { width: 430, height: 932, name: 'iPhone 14 Pro Max (430px)' },
    { width: 639, height: 800, name: 'Large Mobile (639px)' },
    { width: 640, height: 800, name: 'Tablet (640px)' },
  ];

  for (const v of viewports) {
    test(`Verify shell density and overflow at ${v.name}`, async ({ page }) => {
      await page.setViewportSize({ width: v.width, height: v.height });
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // 1. Take Screenshots
      await page.screenshot({ path: `docs/qa/artifacts/full-app-mobile-density-2026-07-14/SHELL-${v.width}.png` });

      // 2. Measure root scroll width vs client width
      const isOverflowing = await page.evaluate(() => {
        const root = document.documentElement;
        return root.scrollWidth > root.clientWidth + 1;
      });
      expect(isOverflowing).toBe(false);

      // 3. Open Mobile Menu
      if (v.width < 1024) {
        const menuBtn = page.getByRole('button', { name: 'Mở menu' });
        if (await menuBtn.isVisible()) {
          await menuBtn.click();
          await page.waitForTimeout(500); // Wait for transition
          
          // Measure overflow with Drawer Open
          const drawerOverflow = await page.evaluate(() => {
            const root = document.documentElement;
            return root.scrollWidth > root.clientWidth + 1;
          });
          expect(drawerOverflow).toBe(false);
          
          // Click backdrop to close
          await page.mouse.click(10, 10);
          await page.waitForTimeout(500);
        }
      }

      // 4. Open Notification Bell
      const bellBtn = page.getByRole('button', { name: 'Thông báo' });
      if (await bellBtn.isVisible()) {
        await bellBtn.click();
        await page.waitForTimeout(500);
        
        // Take another screenshot for verification
        await page.screenshot({ path: `docs/qa/artifacts/full-app-mobile-density-2026-07-14/SHELL-BELL-${v.width}.png` });

        const bellOverflow = await page.evaluate(() => {
          const root = document.documentElement;
          return root.scrollWidth > root.clientWidth + 1;
        });
        expect(bellOverflow).toBe(false);
      }
    });
  }
});
