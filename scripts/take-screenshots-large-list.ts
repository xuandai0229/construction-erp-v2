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
  
  const outDir = path.join(process.cwd(), 'docs', 'qa', 'screenshots', 'field-progress-master-mobile-large-list');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const url = `http://localhost:3000/projects/${p.id}/field-progress`;

  console.log("Taking screenshots...");

  const browser = await chromium.launch({ headless: true });

  // 1. iPhone 12 Pro (390 x 844) — Top view
  let context = await browser.newContext(devices['iPhone 12 Pro']);
  await context.addCookies([{ name: 'auth_session', value: cookieValue, domain: 'localhost', path: '/' }]);
  let page = await context.newPage();
  await page.goto(url);
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: path.join(outDir, 'master-large-list-top-390.png') });
  
  // Scroll to see the group card expanded
  await page.evaluate(() => window.scrollBy(0, 250));
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(outDir, 'master-large-list-expanded-group-390.png') });
  
  // Type in search box
  const searchInput = page.locator('input[placeholder*="Tìm công việc"]');
  if (await searchInput.isVisible()) {
    await searchInput.fill('cống');
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(outDir, 'master-large-list-search-390.png') });
    await searchInput.fill('');
    await page.waitForTimeout(300);
  }
  
  // Click a "Sửa" button to open edit sheet
  const editBtn = page.locator('text=Sửa').first();
  if (await editBtn.isVisible()) {
    await editBtn.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(outDir, 'master-large-list-edit-sheet-390.png') });
    // Close sheet
    const closeBtn = page.locator('text=Đóng');
    if (await closeBtn.isVisible()) await closeBtn.click();
    await page.waitForTimeout(300);
  }

  await context.close();

  // 2. iPhone SE (375 x 667)
  context = await browser.newContext(devices['iPhone SE']);
  await context.addCookies([{ name: 'auth_session', value: cookieValue, domain: 'localhost', path: '/' }]);
  page = await context.newPage();
  await page.goto(url);
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => window.scrollBy(0, 250));
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(outDir, 'master-large-list-375.png') });
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
  console.log("Done! Screenshots saved to:", outDir);
}

main().catch(console.error);
