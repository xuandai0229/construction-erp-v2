require('dotenv').config();
const { chromium } = require('playwright');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const hashedPassword = await bcrypt.hash('Password123!', 10);
  
  await pool.query(
    `UPDATE "User" SET password = $1 WHERE email = 'admin@construction.local'`,
    [hashedPassword]
  );
  console.log('Admin password reset to Password123!');
  await pool.end();

  console.log('Starting Playwright...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();
  
  console.log('Navigating to login...');
  await page.goto('http://localhost:3000/login');
  
  await page.waitForTimeout(2000);
  
  console.log('Taking full page screenshot...');
  const fs = require('fs');
  if (!fs.existsSync('docs/qa/screenshots')) {
    fs.mkdirSync('docs/qa/screenshots', { recursive: true });
  }
  await page.screenshot({ path: 'docs/qa/screenshots/login-debug.png', fullPage: true });
  
  try {
    await page.fill('input[name="email"], input[type="email"]', 'admin@construction.local');
    await page.fill('input[name="password"], input[type="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(5000);
    const screenshotPath = 'docs/qa/screenshots/executive-dashboard-after-final-visual-fix.png';
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`Saved screenshot to ${screenshotPath}`);
  } catch(e) {
    console.error('Error logging in:', e);
  }
  
  await browser.close();
  console.log('Done');
}

main().catch(console.error);
