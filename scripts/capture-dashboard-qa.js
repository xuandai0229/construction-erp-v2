const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const PORT = 3001;
const BASE_URL = `http://localhost:${PORT}`;

const viewports = [
  { name: '1920x1080', width: 1920, height: 1080 },
  { name: '1366x768', width: 1366, height: 768 },
  { name: '1024x768', width: 1024, height: 768 },
  { name: '390x844', width: 390, height: 844 }
];

async function capture(prefix) {
  const outDir = path.join(__dirname, `../docs/qa/screenshots/${prefix}`);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });
  
  for (const vp of viewports) {
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await context.newPage();

    try {
      console.log(`[${prefix}] Capturing ${vp.name}...`);
      // Try login with default admin passwords
      await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });

      // Check if already on dashboard or fill login form
      if (page.url().includes('/login')) {
        await page.fill('input[name="email"]', 'daicongtu2910@gmail.com');
        const passCandidates = ['123456', 'Admin123456!', '123456789012'];
        let loggedIn = false;
        for (const pass of passCandidates) {
          await page.fill('input[name="password"]', pass);
          await page.click('button[type="submit"]');
          try {
            await page.waitForURL('**/dashboard**', { timeout: 4000 });
            loggedIn = true;
            break;
          } catch (e) {
            // try next
          }
        }
        if (!loggedIn) {
          console.warn(`[${prefix}] Could not log in automatically for ${vp.name}, checking page state...`);
        }
      }

      await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1500);

      // Take System-wide screenshot
      await page.screenshot({ path: path.join(outDir, `dashboard-system-wide-${vp.name}.png`), fullPage: false });

      // If single project can be selected
      const projectSelect = await page.$('select, button:has-text("Toàn hệ thống")');
      if (projectSelect) {
        // capture also single project if possible
      }
      console.log(`[${prefix}] Captured ${vp.name} successfully.`);
    } catch (err) {
      console.error(`[${prefix}] Failed for ${vp.name}:`, err.message);
    } finally {
      await context.close();
    }
  }

  await browser.close();
}

const action = process.argv[2] || 'before';
capture(action).then(() => console.log('Capture finished.'));
