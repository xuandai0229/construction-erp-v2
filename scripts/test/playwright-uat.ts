import { chromium, devices } from "playwright";

async function run() {
  const browser = await chromium.launch({ headless: true });
  const pixel7 = devices['Pixel 7'];
  const context = await browser.newContext({
    ...pixel7,
  });
  
  const page = await context.newPage();
  
  console.log("Navigating to login...");
  await page.goto("http://localhost:3000/login");
  
  // Fill login
  await page.fill('input[type="email"], input[name="email"]', "hanoi.pm@construction.local");
  await page.fill('input[type="password"], input[name="password"]', "HanoiSeed@2026!");
  await page.screenshot({ path: 'before-login.png' });
  await page.click('button[type="submit"]');
  
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'after-login.png' });
  console.log("Logged in! URL:", page.url());
  
  if (page.url().includes('login')) {
    const text = await page.evaluate(() => document.body.innerText);
    console.log("PAGE TEXT:", text);
    // Print network requests during login
    console.log("Wait, we should have caught the login API response.");
  }

  const urls = [
    "/materials",
    "/documents",
    "/reports",
    "/accounting",
    `/projects/cmqvpchlg000918wkf2arrago/field-progress/summary`
  ];

  const results: Record<string, any> = {};

  for (const url of urls) {
    console.log(`\nTesting ${url}...`);
    results[url] = {
      console: [],
      networkFailed: []
    };

    const consoleHandler = (msg: any) => {
      const type = msg.type();
      const text = msg.text();
      // Ignore Fast Refresh logs
      if (text.includes('[Fast Refresh]')) return;
      if (text.includes('HMR')) return;
      
      if (type === 'error' || type === 'warning') {
        results[url].console.push({ type, text });
      }
    };

    const responseHandler = (response: any) => {
      const status = response.status();
      const requestUrl = response.url();
      if (status >= 400 && !requestUrl.includes('webpack')) {
        results[url].networkFailed.push({ status, url: requestUrl });
      }
    };

    page.on('console', consoleHandler);
    page.on('response', responseHandler);

    await page.goto(`http://localhost:3000${url}`, { waitUntil: 'networkidle' });
    console.log(`Current URL after goto: ${page.url()}`);
    // wait a bit for any delayed hydration errors
    await page.waitForTimeout(2000);

    page.off('console', consoleHandler);
    page.off('response', responseHandler);
  }

  await browser.close();

  console.log("\n=== RESULTS ===");
  console.log(JSON.stringify(results, null, 2));
}

run().catch(console.error);
