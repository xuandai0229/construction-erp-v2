import { test, expect } from '@playwright/test';

const ROUTES_TO_TEST = [
  '/login',
  '/dashboard',
  '/projects',
  '/users',
  '/settings',
  '/audit',
  '/materials',
  '/approvals',
];

const VIEWPORTS = [
  { width: 320, height: 568, name: 'iPhone SE/Small' },
  { width: 360, height: 800, name: 'Android Medium' },
  { width: 390, height: 844, name: 'iPhone 12/13/14' },
  { width: 412, height: 915, name: 'Android Large' },
];

test.describe('Full App Mobile Responsive Overflow Audit', () => {
  for (const route of ROUTES_TO_TEST) {
    for (const vp of VIEWPORTS) {
      test(`Route ${route} at ${vp.width}x${vp.height} (${vp.name})`, async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.goto(`http://localhost:3000${route}`, { waitUntil: 'networkidle' });

        // Wait a bit for animations/rendering
        await page.waitForTimeout(1000);

        // Check page-level overflow
        const overflowStatus = await page.evaluate(() => {
          const scrollWidth = document.documentElement.scrollWidth;
          const clientWidth = document.documentElement.clientWidth;
          return { scrollWidth, clientWidth, isOverflowing: scrollWidth > clientWidth + 1 };
        });

        // Find specific offenders
        const offenders = await page.evaluate(() => {
          const viewportWidth = document.documentElement.clientWidth;
          return [...document.querySelectorAll('body *')]
            .map(element => {
              const rect = element.getBoundingClientRect();
              const style = window.getComputedStyle(element);
              return {
                tag: element.tagName,
                id: element.id,
                className: typeof element.className === 'string' ? element.className : '',
                left: rect.left,
                right: rect.right,
                width: rect.width,
                position: style.position,
                display: style.display,
                overflowX: style.overflowX,
                whiteSpace: style.whiteSpace,
              };
            })
            .filter(item => item.display !== 'none' && (item.right > viewportWidth + 1 || item.left < -1));
        });

        if (overflowStatus.isOverflowing) {
          console.error(`\n[OVERFLOW DETECTED] ${route} @ ${vp.width}x${vp.height}`);
          console.error(`ScrollWidth: ${overflowStatus.scrollWidth}, ClientWidth: ${overflowStatus.clientWidth}`);
          if (offenders.length > 0) {
            console.error('Offending elements:');
            offenders.slice(0, 5).forEach(o => {
              console.error(`- <${o.tag} id="${o.id}" class="${o.className}">: right=${o.right}, left=${o.left}`);
            });
          }
        }

        expect(overflowStatus.isOverflowing, `Page overflows on ${route} at ${vp.width}x${vp.height}`).toBeFalsy();
      });
    }
  }
});
