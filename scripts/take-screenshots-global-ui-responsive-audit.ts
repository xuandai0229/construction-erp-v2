import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import fs from 'fs';
import path from 'path';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
  const outDir = path.join(process.cwd(), 'docs/qa/screenshots/global-ui-responsive-audit');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  
  const a11yLog = path.join(process.cwd(), 'docs/qa/GLOBAL_UI_RESPONSIVE_A11Y_AUDIT.txt');
  fs.writeFileSync(a11yLog, '--- GLOBAL UI RESPONSIVE A11Y AUDIT ---\n\n');

  try {
    // 1. Đăng nhập Admin
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"]', 'admin@construction.local');
    await page.fill('input[name="password"]', '123456');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');

    // Mở một công trình
    await page.goto(`${BASE_URL}/projects`);
    await page.waitForSelector('table');
    const firstProjectLink = await page.$('td a');
    const projectUrl = await firstProjectLink?.getAttribute('href');
    if (!projectUrl) throw new Error('Không có project nào để test');

    const projectId = projectUrl.split('/')[2];
    const projectFullUrl = `${BASE_URL}/projects/${projectId}`;

    // Test Mobile Viewport 430x932
    await page.setViewportSize({ width: 430, height: 932 });

    // 1. Project Detail
    await page.goto(projectFullUrl);
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: path.join(outDir, 'project-detail-mobile-actions-fixed-430.png') });
    // Scroll down to modules
    await page.evaluate(() => window.scrollBy(0, 500));
    await page.screenshot({ path: path.join(outDir, 'project-detail-mobile-modules-fixed-430.png') });

    let a11yResults = await new AxeBuilder({ page }).analyze();
    fs.appendFileSync(a11yLog, `[${projectFullUrl}]\nViolations: ${a11yResults.violations.length}\n`);
    a11yResults.violations.forEach(v => fs.appendFileSync(a11yLog, `- ${v.id}: ${v.description} (${v.nodes.length} nodes)\n`));

    // 2. Master Table Tabs
    await page.goto(`${projectFullUrl}/field-progress`);
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: path.join(outDir, 'master-mobile-tabs-fixed-430.png') });
    a11yResults = await new AxeBuilder({ page }).analyze();
    fs.appendFileSync(a11yLog, `\n[${projectFullUrl}/field-progress]\nViolations: ${a11yResults.violations.length}\n`);
    a11yResults.violations.forEach(v => fs.appendFileSync(a11yLog, `- ${v.id}: ${v.description} (${v.nodes.length} nodes)\n`));

    // 3. Daily Tabs
    await page.goto(`${projectFullUrl}/field-progress/daily`);
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: path.join(outDir, 'daily-mobile-tabs-fixed-430.png') });
    a11yResults = await new AxeBuilder({ page }).analyze();
    fs.appendFileSync(a11yLog, `\n[${projectFullUrl}/field-progress/daily]\nViolations: ${a11yResults.violations.length}\n`);
    a11yResults.violations.forEach(v => fs.appendFileSync(a11yLog, `- ${v.id}: ${v.description} (${v.nodes.length} nodes)\n`));

    // 4. Summary Tabs
    await page.goto(`${projectFullUrl}/field-progress/summary`);
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: path.join(outDir, 'summary-mobile-tabs-fixed-430.png') });
    a11yResults = await new AxeBuilder({ page }).analyze();
    fs.appendFileSync(a11yLog, `\n[${projectFullUrl}/field-progress/summary]\nViolations: ${a11yResults.violations.length}\n`);
    a11yResults.violations.forEach(v => fs.appendFileSync(a11yLog, `- ${v.id}: ${v.description} (${v.nodes.length} nodes)\n`));

    // 5. Material Requests Tabs
    await page.goto(`${projectFullUrl}/material-requests`);
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: path.join(outDir, 'material-mobile-tabs-fixed-430.png') });
    a11yResults = await new AxeBuilder({ page }).analyze();
    fs.appendFileSync(a11yLog, `\n[${projectFullUrl}/material-requests]\nViolations: ${a11yResults.violations.length}\n`);
    a11yResults.violations.forEach(v => fs.appendFileSync(a11yLog, `- ${v.id}: ${v.description} (${v.nodes.length} nodes)\n`));

    // Test Desktop Users
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.goto(`${BASE_URL}/users`);
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: path.join(outDir, 'users-desktop-1366.png') });
    a11yResults = await new AxeBuilder({ page }).analyze();
    fs.appendFileSync(a11yLog, `\n[${BASE_URL}/users]\nViolations: ${a11yResults.violations.length}\n`);
    a11yResults.violations.forEach(v => fs.appendFileSync(a11yLog, `- ${v.id}: ${v.description} (${v.nodes.length} nodes)\n`));

    // Log out admin
    await context.clearCookies();
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');

    // Login Commander
    console.log('Logging in as Commander...');
    await page.fill('input[name="email"]', 'commander1@construction.local');
    await page.fill('input[name="password"]', 'Test@123456');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');

    await page.setViewportSize({ width: 430, height: 932 });
    await page.goto(`${BASE_URL}/projects`);
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: path.join(outDir, 'commander-project-list-mobile-430.png') });

  } catch (e) {
    console.error(e);
  } finally {
    await browser.close();
  }
}
main();
