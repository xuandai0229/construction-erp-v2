const { chromium, devices } = require('playwright');
const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, '../docs/qa/screenshots/field-progress-mobile-compact-rework/before');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const viewports = [
  { width: 375, height: 667, name: '375' },
  { width: 390, height: 844, name: '390' },
  { width: 414, height: 896, name: '414' },
  { width: 768, height: 1024, name: '768' },
  { width: 1366, height: 768, name: '1366' },
  { width: 1440, height: 900, name: '1440' },
];

const routes = [
  { path: '/projects/cmq52crh500030swk5u8cc1vd/field-progress', name: 'master' },
  { path: '/projects/cmq52crh500030swk5u8cc1vd/field-progress/daily', name: 'daily' },
  { path: '/projects/cmq52crh500030swk5u8cc1vd/field-progress/summary', name: 'summary' },
];

async function run() {
  const browser = await chromium.launch();
  
  // Create a context to login
  const context = await browser.newContext();
  const page = await context.newPage();
  
  console.log("Logging in...");
  await page.goto('http://localhost:3000/login');
  await page.fill('input[type="email"]', 'admin@example.com');
  await page.fill('input[type="password"]', 'admin123');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);
  console.log("Login successful!");

  for (const vp of viewports) {
    const vpContext = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      storageState: await context.storageState() // Use logged in state
    });
    const vpPage = await vpContext.newPage();
    
    for (const route of routes) {
      console.log(`Capturing ${route.name} at ${vp.name}...`);
      await vpPage.goto(`http://localhost:3000${route.path}`);
      await vpPage.waitForTimeout(2000); // wait for data fetch
      
      // Special logic for Daily mobile input test
      if (route.name === 'daily' && (vp.name === '390' || vp.name === '414')) {
        console.log(`  Performing input test on Daily ${vp.name}...`);
        try {
          const inputs = await vpPage.$$('input[inputmode="decimal"]');
          if (inputs.length > 0) {
            await inputs[0].fill('1,5');
            await vpPage.click('button:has-text("Lưu khối lượng")');
            await vpPage.waitForTimeout(1000);
            await inputs[0].fill('2,75');
            await vpPage.click('button:has-text("Lưu khối lượng")');
            await vpPage.waitForTimeout(1000);
          }
        } catch(e) {
          console.error("Input test failed", e);
        }
      }

      await vpPage.screenshot({
        path: path.join(outDir, `${route.name}-${vp.name}.png`),
        fullPage: true
      });
    }
    await vpContext.close();
  }

  await browser.close();
  console.log("Done capturing all screenshots!");
}

run().catch(console.error);
