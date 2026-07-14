import { test, expect } from '@playwright/test';

test.describe('Documents Mobile Responsive Hardening', () => {
  const viewports = [
    { width: 320, height: 568, name: 'iphone-se' },
    { width: 390, height: 844, name: 'iphone-12' },
    { width: 414, height: 896, name: 'iphone-xr' },
    { width: 640, height: 1024, name: 'sm-breakpoint' }
  ];

  for (const vp of viewports) {
    test(`Viewport ${vp.width}x${vp.height} (${vp.name}) should have no horizontal overflow`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      
      // Navigate to a project documents page (Mock or existing path)
      // Assuming user is logged in via global setup, otherwise we would login here.
      // We will just hit the route. If it redirects to login, we'll measure login page instead.
      // But the requirement is to verify UI layout so we should navigate and capture.
      await page.goto('/documents/dummy-project-id');

      // Wait for layout to settle
      await page.waitForTimeout(2000);
      
      // Evaluate scroll width
      const hasOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth + 1;
      });

      expect(hasOverflow).toBe(false);
      
      await page.screenshot({ path: `docs/qa/DOC-${vp.name}-main.png`, fullPage: true });

      // If there is a context menu button, try to open it
      const contextBtn = page.locator('article button[title="Thêm thao tác"]').first();
      if (await contextBtn.isVisible()) {
        await contextBtn.click();
        await page.waitForTimeout(1000); // Wait for bottom sheet animation
        
        const hasOverflowAfter = await page.evaluate(() => {
          return document.documentElement.scrollWidth > document.documentElement.clientWidth + 1;
        });
        expect(hasOverflowAfter).toBe(false);
        await page.screenshot({ path: `docs/qa/DOC-${vp.name}-context.png` });
      }

      // If there is a drawer button, try to open it
      const drawerBtn = page.locator('button:has-text("Tài liệu hệ thống")').first();
      if (await drawerBtn.isVisible()) {
        await drawerBtn.click();
        await page.waitForTimeout(1000);
        await page.screenshot({ path: `docs/qa/DOC-${vp.name}-drawer.png` });
      }
    });
  }
});
