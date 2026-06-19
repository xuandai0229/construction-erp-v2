import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { requireQaEnv } from './qa-env';

const adminPassword = requireQaEnv('QA_ADMIN_PASSWORD');

async function main() {
  const screenshotsDir = path.join(__dirname, '../docs/qa/screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  const browser = await chromium.launch();

  const testViewport = async (name: string, width: number, height: number) => {
    const context = await browser.newContext({ viewport: { width, height } });
    const page = await context.newPage();
    
    console.log(`Testing ${name} (${width}x${height})...`);
    await page.goto('http://localhost:3000/login');
    
    // Wait for animation
    await page.waitForTimeout(1000);
    
    await page.screenshot({ path: path.join(screenshotsDir, `login-${name}.png`) });
    await context.close();
  };

  await testViewport('desktop', 1920, 1080);
  await testViewport('laptop', 1366, 768);
  await testViewport('mobile-1', 390, 844);
  await testViewport('mobile-2', 430, 932);

  // Test Auth Logic
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();
  
  console.log('Testing Auth: Wrong Password...');
  await page.goto('http://localhost:3000/login');
  await page.fill('input[name="email"]', 'admin@construction.local');
  await page.fill('input[name="password"]', 'wrongpassword');
  await page.click('button[type="submit"]');
  
  // Wait for error alert
  await page.waitForSelector('.text-red-800');
  await page.screenshot({ path: path.join(screenshotsDir, 'login-auth-error.png') });

  // Correct login
  console.log('Testing Auth: Correct Login...');
  await page.fill('input[name="password"]', adminPassword);
  
  await browser.close();
  console.log('Done!');
}

main().catch(console.error);
