const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const ROUTES = [
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
  { width: 320, height: 568, name: 'iPhone_SE' },
  { width: 360, height: 800, name: 'Android_Medium' },
  { width: 390, height: 844, name: 'iPhone_12' },
  { width: 412, height: 915, name: 'Android_Large' },
];

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Try to login first (we assume default dev credentials or we just navigate to login)
  // Let's go to login and attempt to login as admin
  await page.goto('http://localhost:3000/login');
  
  try {
    await page.fill('input[type="email"]', 'admin@construction.local'); // A guess, if it works
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 3000 }).catch(() => {});
  } catch(e) {
    console.log('Login automation failed, we might only be checking public/login page or the session is active.');
  }

  const results = [];

  for (const route of ROUTES) {
    for (const vp of VIEWPORTS) {
      console.log(`Checking ${route} at ${vp.width}x${vp.height}...`);
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(`http://localhost:3000${route}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1500);

      const overflowStatus = await page.evaluate(() => {
        const scrollWidth = document.documentElement.scrollWidth;
        const clientWidth = document.documentElement.clientWidth;
        return { scrollWidth, clientWidth, isOverflowing: scrollWidth > clientWidth + 1 };
      });

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
              display: style.display,
            };
          })
          .filter(item => item.display !== 'none' && (item.right > viewportWidth + 1 || item.left < -1));
      });

      results.push({
        route,
        viewport: vp,
        overflowStatus,
        offenders: offenders.slice(0, 5) // keep it short
      });

      if (overflowStatus.isOverflowing) {
        console.error(`  -> OVERFLOW! scrollWidth: ${overflowStatus.scrollWidth}, clientWidth: ${overflowStatus.clientWidth}`);
      } else {
        console.log('  -> OK');
      }
    }
  }

  await browser.close();
  fs.writeFileSync('docs/qa/overflow-results.json', JSON.stringify(results, null, 2));
  console.log('Done.');
}

run();
