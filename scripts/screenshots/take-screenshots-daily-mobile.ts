import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import prisma from '../src/lib/prisma';

const outDir = path.join(process.cwd(), 'docs/qa/screenshots/field-progress-daily-mobile-final-uat');

async function main() {
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const p = await prisma.project.findFirst({where: {deletedAt: null}});
  if (!p) { console.log("No project"); return; }
  
  const u = await prisma.user.findFirst();
  if (!u) { console.log("No user"); return; }
  
  const cookieValue = Buffer.from(JSON.stringify({ userId: u.id })).toString('base64');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 375, height: 667 }, // iPhone SE
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true
  });
  
  await context.addCookies([{ name: 'auth_session', value: cookieValue, domain: 'localhost', path: '/' }]);

  const page = await context.newPage();

  // Navigate to Daily field progress
  if (p) {
    await page.goto(`http://localhost:3000/projects/${p.id}/field-progress/daily`);
    await page.waitForLoadState('networkidle');

    // 1. Top (Header & Calendar) / Compact view
    await page.screenshot({ path: path.join(outDir, 'daily-filter-compact-390.png') });

    // 2. Filter Chips no cut
    await page.evaluate(() => window.scrollBy(0, 300));
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(outDir, 'daily-top-filter-chip-final.png') });

    // 3. Fast entry list view (unentered filter)
    const notEnteredBtn = await page.locator('button', { hasText: 'Chưa nhập' }).first();
    if (await notEnteredBtn.isVisible()) {
      await notEnteredBtn.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(outDir, 'daily-unentered-filter-390.png') });
      const allBtn = await page.locator('button', { hasText: 'Tất cả' }).first();
      await allBtn.click();
      await page.waitForTimeout(500);
    }

    // 4. Next unentered focus
    // Click the group header title to expand/collapse.
    const expandBtn = await page.locator('h3.line-clamp-2').first();
    if (await expandBtn.isVisible()) {
      await expandBtn.click();
      await page.waitForTimeout(500);
    }
    const nextBtn = await page.locator('button[title="Tiếp theo"]').first();
    if (await nextBtn.isVisible()) {
      await nextBtn.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(outDir, 'daily-floating-next-final.png') });
    }

    // 5. Sequential entry and Over Volume warning
    const input = await page.locator('div.lg\\:hidden input[inputmode="decimal"]').first();
    if (await input.isVisible()) {
      await input.focus();
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(outDir, 'daily-focused-row-highlight-final.png') });
      await input.fill('1.5');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(500);

      const nextInput = await page.locator('div.lg\\:hidden input[inputmode="decimal"]').nth(1);
      if (await nextInput.isVisible()) {
        await nextInput.fill('9999999'); // Trigger over volume
        await page.keyboard.press('Escape'); // Hide keyboard
        await page.waitForTimeout(500);
      } else {
        await input.fill('9999999');
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
      }
      
      // Sticky save is active now
      await page.screenshot({ path: path.join(outDir, 'daily-sticky-save-active-390.png') });
      
      // Scroll to see the over volume warning
      await page.evaluate(() => window.scrollBy(0, 100));
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(outDir, 'daily-over-volume-single-warning-final.png') });
    }

    // scroll to bottom to check padding
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(outDir, 'daily-bottom-padding-final.png') });

    // 7. Bottom Sheet Detail Full Text
    const detailBtn = await page.locator('div.lg\\:hidden button', { has: page.locator('svg') }).first();
    if (await detailBtn.isVisible()) {
      await detailBtn.click();
      await page.waitForTimeout(500);
    }
  }

  // 8. Mobile SE 375
  const contextSE = await browser.newContext({ viewport: { width: 375, height: 667 } });
  await contextSE.addCookies([{ name: 'auth_session', value: cookieValue, domain: 'localhost', path: '/' }]);
  const pageSE = await contextSE.newPage();
  if (p) {
    await pageSE.goto(`http://localhost:3000/projects/${p.id}/field-progress/daily`);
    await pageSE.waitForLoadState('networkidle');
    await pageSE.waitForTimeout(500);
    await pageSE.screenshot({ path: path.join(outDir, 'daily-top-375.png') });
  }

  // 9. Mobile 430
  const contextProMax = await browser.newContext({ viewport: { width: 430, height: 932 } });
  await contextProMax.addCookies([{ name: 'auth_session', value: cookieValue, domain: 'localhost', path: '/' }]);
  const pageProMax = await contextProMax.newPage();
  if (p) {
    await pageProMax.goto(`http://localhost:3000/projects/${p.id}/field-progress/daily`);
    await pageProMax.waitForLoadState('networkidle');
    await pageProMax.waitForTimeout(500);
    await pageProMax.screenshot({ path: path.join(outDir, 'daily-top-430.png') });
  }

  // Desktop regression
  const contextDesktop = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  await contextDesktop.addCookies([{ name: 'auth_session', value: cookieValue, domain: 'localhost', path: '/' }]);
  const pageDesktop = await contextDesktop.newPage();
  if (p) {
    await pageDesktop.goto(`http://localhost:3000/projects/${p.id}/field-progress/daily`);
    await pageDesktop.waitForLoadState('networkidle');
    await pageDesktop.waitForTimeout(500);
    await pageDesktop.screenshot({ path: path.join(outDir, 'daily-desktop-regression-1366.png') });
  }

  await browser.close();
  console.log(`Done! Screenshots saved to ${outDir}`);
}

main().catch(console.error);
