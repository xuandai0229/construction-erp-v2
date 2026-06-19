import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

async function main() {
  const screenshotsDir = path.join(__dirname, '../docs/qa/screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  const browser = await chromium.launch();

  const testViewport = async (name: string, width: number, height: number) => {
    const context = await browser.newContext({ viewport: { width, height } });
    const page = await context.newPage();
    
    console.log(`Testing Dashboard on ${name} (${width}x${height})...`);
    
    // Login
    await page.goto('http://localhost:3000/login');
    await page.fill('input[name="email"]', 'admin@construction.local');
    await page.fill('input[name="password"]', '123456');
    await page.click('button[type="submit"]');
    
    // Wait for dashboard to load
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    await page.waitForTimeout(1500); // Wait for animations and layout
    
    await page.screenshot({ path: path.join(screenshotsDir, `dashboard-operations-board-${name}.png`), fullPage: true });
    
    // Go to first project
    const projectLink = await page.locator('a:has-text("Mở điều hành")').first();
    if (await projectLink.isVisible()) {
      await projectLink.click();
      await page.waitForURL('**/projects/**', { timeout: 10000 });
      await page.waitForTimeout(1500);
      await page.screenshot({ path: path.join(screenshotsDir, `dashboard-project-board-${name}.png`), fullPage: true });
    }
    
    await context.close();
  };

  await testViewport('desktop', 1920, 1080);
  await testViewport('laptop', 1366, 768);
  await testViewport('mobile-1', 390, 844);
  await testViewport('mobile-2', 430, 932);

  await browser.close();
  console.log('Done capturing dashboard screenshots!');
}

main().catch(console.error);
