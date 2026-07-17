import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const viewports = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'tablet-portrait', width: 768, height: 1024 },
  { name: 'tablet-landscape', width: 1024, height: 768 },
  { name: 'laptop', width: 1366, height: 768 },
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'large-desktop', width: 1920, height: 1080 },
];

const routes = [
  { path: '/dashboard', name: 'dashboard' },
  { path: '/projects', name: 'projects' },
  { path: '/reports', name: 'reports' },
  { path: '/materials', name: 'materials' },
  { path: '/documents', name: 'documents' },
  { path: '/approvals', name: 'approvals' },
  { path: '/users', name: 'users' },
  { path: '/settings', name: 'settings' },
];

const resultsPath = path.join(process.cwd(), 'docs', 'qa', 'FULL_SYSTEM_UI_UX_VISUAL_RUNTIME_VERIFICATION.md');
let markdownReport = `# Báo cáo Runtime & Visual Verification (Phase 3)

| Route | Viewport | Runtime | Overflow | Console Errors | Page Errors | Screenshot |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
`;

test.describe('Full System Premium UI Visual & Runtime QA', () => {
  // Login first
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('#email', 'admin@construction.local');
    await page.fill('#password', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
  });

  for (const vp of viewports) {
    test.describe(`Viewport: ${vp.name}`, () => {
      test.use({ viewport: { width: vp.width, height: vp.height } });

      for (const route of routes) {
        test(`Verify ${route.name}`, async ({ page }) => {
          let consoleErrors = 0;
          let pageErrors = 0;

          page.on('console', msg => {
            if (msg.type() === 'error') consoleErrors++;
          });
          page.on('pageerror', () => {
            pageErrors++;
          });

          const response = await page.goto(route.path);
          const isSuccess = response && response.status() < 400;

          // Wait for network idle or timeout to ensure rendering
          await page.waitForLoadState('load', { timeout: 10000 }).catch(() => {});
          
          // Allow some time for animations
          await page.waitForTimeout(2000);

          // Check overflow
          const overflowState = await page.evaluate(() => {
            const doc = document.documentElement;
            return {
              scrollWidth: doc.scrollWidth,
              clientWidth: doc.clientWidth,
              hasOverflow: doc.scrollWidth > doc.clientWidth
            };
          });

          const screenshotPath = `test-results/ui-ux-phase-3/${vp.name}/${route.name}/after.png`;
          await page.screenshot({ path: screenshotPath, fullPage: false });

          // Append to report
          const row = `| \`${route.path}\` | ${vp.name} | ${isSuccess ? 'PASS' : 'FAIL'} | ${overflowState.hasOverflow ? 'FAIL (Overflow)' : 'PASS'} | ${consoleErrors} | ${pageErrors} | [Link](../../${screenshotPath}) |\n`;
          fs.appendFileSync(resultsPath, row, 'utf8');

          expect(isSuccess).toBeTruthy();
        });
      }
    });
  }
});
