import { chromium } from 'playwright';
import prisma from '../src/lib/prisma';
import fs from 'fs';
import path from 'path';

async function main() {
  const p = await prisma.project.findFirst({where: {deletedAt: null}});
  if (!p) { console.log("No project"); return; }
  
  const u = await prisma.user.findFirst();
  if (!u) { console.log("No user"); return; }
  
  const cookieValue = Buffer.from(JSON.stringify({ userId: u.id })).toString('base64');
  
  const outDir = path.join(process.cwd(), 'docs', 'qa', 'screenshots', 'field-progress-desktop-final-table-ui');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });

  // 1. Desktop 1366x768
  const context1366 = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  await context1366.addCookies([{ name: 'auth_session', value: cookieValue, domain: 'localhost', path: '/' }]);
  const page1366 = await context1366.newPage();

  // Field progress
  await page1366.goto(`http://localhost:3000/projects/${p.id}/field-progress`);
  await page1366.waitForLoadState('networkidle');
  
  // Wait for table to render
  await page1366.waitForSelector('table');

  // Input some long text to test readability
  const inputs = await page1366.$$('textarea');
  if (inputs.length >= 2) {
    await inputs[0].fill('Nội dung công việc rất dài có thể vượt qua hai dòng nếu cần thiết trên màn hình hẹp hơn');
    await inputs[1].fill('Mũi thi công chuyên trách phần móng cống thoát nước số 2');
    await page1366.waitForTimeout(500);
  }
  
  // Take screenshot of header one line and no info icon
  await page1366.screenshot({ path: path.join(outDir, 'desktop-table-header-one-line-1366.png'), fullPage: true });
  await page1366.screenshot({ path: path.join(outDir, 'desktop-table-no-info-icon-1366.png'), fullPage: true });

  // Open unit picker at the MIDDLE row
  const unitButtons = await page1366.locator('td:nth-child(4) button').all();
  if (unitButtons.length > 2) {
    const middleIndex = Math.floor(unitButtons.length / 2);
    await unitButtons[middleIndex].click();
    await page1366.waitForTimeout(500);
    await page1366.screenshot({ path: path.join(outDir, 'desktop-unit-picker-middle-row-1366.png'), fullPage: true });
    
    // Close it
    await page1366.locator('.fixed.inset-0.z-\\[9998\\]').click();
    await page1366.waitForTimeout(300);
  }

  // Open unit picker at the LAST row
  if (unitButtons.length > 0) {
    const lastUnitButton = unitButtons[unitButtons.length - 1];
    await lastUnitButton.click();
    await page1366.waitForTimeout(500);
    // Take screenshot of popover at bottom row
    await page1366.screenshot({ path: path.join(outDir, 'desktop-unit-picker-bottom-row-1366.png'), fullPage: true });
  }

  // Close the popup
  await page1366.locator('.fixed.inset-0.z-\\[9998\\]').click();
  await page1366.waitForTimeout(300);

  // Open unit picker at the FIRST row for custom unit test
  const firstUnitButton = await page1366.locator('td:nth-child(4) button').first();
  await firstUnitButton.click();
  await page1366.waitForTimeout(500);
  await page1366.screenshot({ path: path.join(outDir, 'desktop-unit-picker-first-row-1366.png'), fullPage: true });

  // Click 'Khác...' / Enter custom unit
  const customInput = await page1366.locator('input[placeholder="Nhập tuỳ chỉnh..."]');
  await customInput.fill('tuyến');
  await page1366.waitForTimeout(500);
  await page1366.screenshot({ path: path.join(outDir, 'desktop-custom-unit-1366.png'), fullPage: true });
  await page1366.screenshot({ path: path.join(outDir, 'desktop-unit-picker-apply-button-one-line.png') });



  
  await context1366.close();

  // 2. Desktop 1440x900
  const context1440 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context1440.addCookies([{ name: 'auth_session', value: cookieValue, domain: 'localhost', path: '/' }]);
  const page1440 = await context1440.newPage();
  await page1440.goto(`http://localhost:3000/projects/${p.id}/field-progress`);
  await page1440.waitForLoadState('networkidle');
  await page1440.screenshot({ path: path.join(outDir, 'field-progress-master-1440.png'), fullPage: true });
  await context1440.close();

  // 3. Mobile Regression 390x844
  const context390 = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  await context390.addCookies([{ name: 'auth_session', value: cookieValue, domain: 'localhost', path: '/' }]);
  const page390 = await context390.newPage();
  await page390.goto(`http://localhost:3000/projects/${p.id}/field-progress`);
  await page390.waitForLoadState('networkidle');
  await page390.screenshot({ path: path.join(outDir, 'mobile-regression-master-390.png'), fullPage: true });

  // Open unit picker on mobile
  const mobileRow = await page390.locator('.md\\:hidden .cursor-pointer').first();
  await mobileRow.click();
  await page390.waitForTimeout(500);
  const mobileUnitButton = await page390.locator('.fixed.inset-0.z-\\[55\\] button:has(.lucide-chevron-down)').first();
  if (mobileUnitButton) {
    await mobileUnitButton.click();
    await page390.waitForTimeout(500);
    await page390.screenshot({ path: path.join(outDir, 'mobile-regression-unit-picker-390.png'), fullPage: true });
  }
  await context390.close();

  await browser.close();
  await prisma.$disconnect();
  console.log("Done! Evidence saved to:", outDir);
}

main().catch(console.error);
