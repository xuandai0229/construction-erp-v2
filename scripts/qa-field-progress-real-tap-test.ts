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
  
  const outDir = path.join(process.cwd(), 'docs', 'qa', 'screenshots', 'field-progress-mobile-micro-interaction-real-test');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const url = `http://localhost:3000/projects/${p.id}/field-progress`;

  console.log("Starting Real Tap Test...");

  const browser = await chromium.launch({ headless: true });

  // 1. iPhone 12 Pro (390 x 844)
  const context = await browser.newContext({
    ...devices['iPhone 12 Pro'],
    recordVideo: { dir: outDir }
  });
  
  // Enable tracing
  await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
  await context.addCookies([{ name: 'auth_session', value: cookieValue, domain: 'localhost', path: '/' }]);
  
  const page = await context.newPage();
  await page.goto(url);
  await page.waitForLoadState('networkidle');

  // Test 1: Tap Group to collapse/expand
  console.log("Testing Group tap...");
  const firstGroupBtn = page.locator('button.w-full.flex.items-center.text-left').first();
  if (await firstGroupBtn.isVisible()) {
    // Tap to collapse
    await firstGroupBtn.tap();
    await page.waitForTimeout(400); // wait for transition
    await page.screenshot({ path: path.join(outDir, 'interaction-group-close.png') });
    
    // Tap to expand
    await firstGroupBtn.tap();
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(outDir, 'interaction-group-open.png') });
  }

  // Test 2: Tap Work Row
  console.log("Testing Work Row tap...");
  // Find a work row (has text 'Sửa' inside it)
  const workRow = page.locator('div.cursor-pointer').filter({ hasText: 'Sửa' }).first();
  if (await workRow.isVisible()) {
    // We expect the row itself to handle the click and open the sheet
    await workRow.tap();
    await page.waitForTimeout(500); // Wait for bottom sheet slide up
    await page.screenshot({ path: path.join(outDir, 'interaction-edit-sheet.png') });
    
    // Inside Bottom Sheet: Test Unit Picker
    console.log("Testing Unit Picker...");
    const unitButton = page.locator('button', { hasText: 'Chọn' }).or(page.locator('button', { hasText: 'm' })).or(page.locator('button', { hasText: 'm³' })).first();
    if (await unitButton.isVisible()) {
      await unitButton.tap();
      await page.waitForTimeout(500); // Wait for unit picker slide up
      await page.screenshot({ path: path.join(outDir, 'interaction-unit-picker.png') });
      
      // Select a unit chip
      const m3Chip = page.locator('button', { hasText: 'm³' }).first();
      if (await m3Chip.isVisible()) {
        await m3Chip.tap();
        await page.waitForTimeout(400);
      }
    }

    // Close bottom sheet (save or cancel)
    const closeBtn = page.locator('button', { hasText: 'Đóng' });
    if (await closeBtn.isVisible()) {
      await closeBtn.tap();
      await page.waitForTimeout(400);
    }
  }

  // Test 3: Test Search
  console.log("Testing Search...");
  const searchInput = page.locator('input[placeholder*="Tìm công việc"]');
  if (await searchInput.isVisible()) {
    // Focus search (simulating tap)
    await searchInput.tap();
    await page.waitForTimeout(200);
    await searchInput.fill('cống');
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(outDir, 'interaction-search-result.png') });
  }

  // Stop tracing
  await context.tracing.stop({ path: path.join(outDir, 'trace.zip') });
  await context.close();

  // Desktop Regression
  console.log("Testing Desktop Regression...");
  const desktopContext = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  await desktopContext.addCookies([{ name: 'auth_session', value: cookieValue, domain: 'localhost', path: '/' }]);
  const desktopPage = await desktopContext.newPage();
  await desktopPage.goto(url);
  await desktopPage.waitForLoadState('networkidle');
  await desktopPage.screenshot({ path: path.join(outDir, 'desktop-regression.png') });
  await desktopContext.close();

  await browser.close();
  await prisma.$disconnect();
  console.log("Done! Evidence saved to:", outDir);
}

main().catch(console.error);
