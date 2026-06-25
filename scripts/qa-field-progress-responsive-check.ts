import { chromium } from "playwright";
import fs from "fs";
import path from "path";

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  const baseUrl = "http://localhost:3000";
  console.log("Navigating to login...");
  
  await page.goto(`${baseUrl}/login`);
  await page.fill('input[type="email"]', 'admin@example.com');
  await page.fill('input[type="password"]', 'password'); // generic guess
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2000);
  
  console.log("Current URL after login:", page.url());
  
  // Go to projects list
  await page.goto(`${baseUrl}/projects`);
  await page.waitForTimeout(1000);
  
  // Find first project link
  const projectLink = await page.getAttribute('a[href^="/projects/"]', 'href');
  if (!projectLink) {
    console.log("No project link found!");
    await browser.close();
    return;
  }
  
  console.log("Found project link:", projectLink);
  const projectId = projectLink.split('/')[2];
  console.log("Project ID:", projectId);
  
  const viewports = [
    { width: 768, height: 1024, name: 'Tablet' },
    { width: 1366, height: 768, name: 'Laptop' }
  ];
  
  const routes = [
    { url: `${baseUrl}/projects/${projectId}/field-progress`, name: 'master' },
    { url: `${baseUrl}/projects/${projectId}/field-progress/daily`, name: 'daily' },
    { url: `${baseUrl}/projects/${projectId}/field-progress/summary`, name: 'summary' }
  ];

  const results: any[] = [];

  for (const route of routes) {
    for (const vp of viewports) {
      const vContext = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
      // inject cookies from main context
      const cookies = await context.cookies();
      await vContext.addCookies(cookies);
      
      const vPage = await vContext.newPage();
      await vPage.goto(route.url, { waitUntil: 'networkidle' });
      await vPage.waitForTimeout(1000);
      
      const docWidth = await vPage.evaluate(() => document.documentElement.scrollWidth);
      const winWidth = await vPage.evaluate(() => window.innerWidth);
      const hasOverflow = docWidth > winWidth + 5;
      
      results.push({
        route: route.name,
        viewport: vp.name,
        docWidth,
        winWidth,
        hasOverflow
      });
      
      const safeName = `${route.name}_${vp.name}`;
      await vPage.screenshot({ path: `docs/qa/screenshot_${safeName}.png` });
      await vContext.close();
    }
  }
  
  console.log("Results:", results);
  fs.writeFileSync('docs/qa/ui-audit-browser-results.json', JSON.stringify(results, null, 2));
  
  await browser.close();
}

main().catch(console.error);
