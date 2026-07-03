import { chromium, devices } from 'playwright';
import prisma from '../src/lib/prisma';
import fs from 'fs';
import path from 'path';

async function main() {
  const p = await prisma.project.findFirst({where: {deletedAt: null}});
  if (!p) { console.log("No project"); return; }
  
  const u = await prisma.user.findFirst();
  if (!u) { console.log("No user"); return; }
  
  const cookieValue = Buffer.from(JSON.stringify({ userId: u.id })).toString('base64');
  
  const outDir = path.join(process.cwd(), 'docs', 'qa', 'screenshots', 'field-progress-mobile-final-balance');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const url = `http://localhost:3000/projects/${p.id}/field-progress`;

  console.log("Taking screenshots...");

  const browser = await chromium.launch({ headless: true });

  // 1. iPhone 12 Pro (390 x 844)
  let context = await browser.newContext(devices['iPhone 12 Pro']);
  await context.addCookies([{ name: 'auth_session', value: cookieValue, domain: 'localhost', path: '/' }]);
  let page = await context.newPage();
  await page.goto(url);
  await page.waitForLoadState('networkidle');
  
  // master-top-390.png
  await page.screenshot({ path: path.join(outDir, 'master-top-390.png') });
  
  // master-editor-390.png
  // scroll down to the editor part (the first WORK item)
  await page.evaluate(() => window.scrollBy(0, 300));
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(outDir, 'master-editor-390.png') });
  
  // master-unit-picker-390.png
  // Click the unit button
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const unitButton = buttons.find(b => b.textContent?.includes('m³') || b.textContent?.includes('Chọn đơn vị') || b.textContent?.includes('Lần') || b.textContent?.includes('m²'));
    if (unitButton) unitButton.click();
  });
  await page.waitForTimeout(1000); // wait for modal
  await page.screenshot({ path: path.join(outDir, 'master-unit-picker-390.png') });
  
  await context.close();

  // 2. iPhone SE (375 x 667)
  context = await browser.newContext(devices['iPhone SE']);
  await context.addCookies([{ name: 'auth_session', value: cookieValue, domain: 'localhost', path: '/' }]);
  page = await context.newPage();
  await page.goto(url);
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => window.scrollBy(0, 300));
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(outDir, 'master-editor-375.png') });
  await context.close();
  
  // 3. Desktop (1366 x 768)
  context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  await context.addCookies([{ name: 'auth_session', value: cookieValue, domain: 'localhost', path: '/' }]);
  page = await context.newPage();
  await page.goto(url);
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: path.join(outDir, 'desktop-master-1366.png') });
  await context.close();

  await browser.close();
  await prisma.$disconnect();
  console.log("Done taking screenshots.");
}

main().catch(console.error);
