const { chromium } = require('playwright');
const { requireQaEnv } = require('./qa-env');

const adminEmail = process.env.QA_ADMIN_EMAIL || 'admin@construction.local';
const adminPassword = requireQaEnv('QA_ADMIN_PASSWORD');

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const baseUrl = 'http://localhost:3001';
  
  // Login
  await page.goto(`${baseUrl}/login`);
  await page.fill('input[name="email"]', adminEmail);
  await page.fill('input[name="password"]', adminPassword);
  await Promise.all([
    page.waitForNavigation(),
    page.click('button[type="submit"]')
  ]);

  const routes = [
    '/dashboard',
    '/projects',
    '/projects/new',
    '/projects/cmq6hstwf000fn8wkwhzoj472', // "Công Trình test" ID
    '/projects/cmq6hstwf000fn8wkwhzoj472/field-progress',
    '/projects/cmq6hstwf000fn8wkwhzoj472/field-progress/daily',
    '/projects/cmq6hstwf000fn8wkwhzoj472/field-progress/summary'
  ];

  let failed = 0;
  for (const r of routes) {
    const response = await page.goto(`${baseUrl}${r}`);
    if (response.status() >= 400) {
      console.log(`[FAIL] ${r} returned ${response.status()}`);
      failed++;
    } else {
      console.log(`[PASS] ${r} OK (status ${response.status()})`);
    }
  }

  await browser.close();
  if (failed > 0) process.exit(1);
}

run().catch(console.error);
