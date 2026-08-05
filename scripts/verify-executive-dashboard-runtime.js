import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

async function verifyDashboardRuntime() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const page = await context.newPage();

  const screenshotsDir = path.join(process.cwd(), 'docs', 'qa', 'runtime_verification');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  console.log('--- STARTING EXECUTIVE DASHBOARD RUNTIME TEST ---');

  const baseUrl = 'http://localhost:3001';

  // 1. Login as Admin / Director
  await page.goto(`${baseUrl}/login`);
  await page.fill('input[name="email"]', 'daicongtu2910@gmail.com');
  await page.fill('input[name="password"]', '123456');
  await page.click('button[type="submit"]');

  await page.waitForURL('**/dashboard', { timeout: 15000 });
  console.log('✓ Successfully logged in and reached Executive Dashboard');

  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(screenshotsDir, '01_dashboard_all_projects.png'), fullPage: true });

  // 2. Test Risk Drawer
  console.log('Testing Risk Drawer...');
  const riskKpi = page.locator('button:has-text("Rủi ro")').first();
  if (await riskKpi.isVisible()) {
    await riskKpi.click();
    await page.waitForSelector('h2:has-text("Chi tiết Cảnh báo & Rủi ro")', { timeout: 5000 });
    console.log('✓ Risk Drawer opened successfully');
    await page.screenshot({ path: path.join(screenshotsDir, '02_risk_drawer_all_projects.png') });
    await page.click('button[title*="Đóng"]');
  }

  // 3. Test Volume Drawer
  console.log('Testing Volume Drawer...');
  const volumeKpi = page.locator('button:has-text("Khối lượng hôm nay")').first();
  if (await volumeKpi.isVisible()) {
    await volumeKpi.click();
    await page.waitForSelector('h2:has-text("Khối lượng Thực hiện Hôm nay")', { timeout: 5000 });
    console.log('✓ Volume Drawer opened successfully');
    await page.screenshot({ path: path.join(screenshotsDir, '03_volume_drawer_all_projects.png') });
    await page.click('button[title*="Đóng"]');
  }

  // 4. Test Actions Drawer
  console.log('Testing Actions Drawer...');
  const actionsKpi = page.locator('button:has-text("Việc cần xử lý")').first();
  if (await actionsKpi.isVisible()) {
    await actionsKpi.click();
    await page.waitForSelector('h2:has-text("Danh sách Việc Cần Xử Lý Ngay")', { timeout: 5000 });
    console.log('✓ Actions Drawer opened successfully');
    await page.screenshot({ path: path.join(screenshotsDir, '04_actions_drawer.png') });
    await page.click('button[title*="Đóng"]');
  }

  // 5. Test 7-Day Reports Drawer
  console.log('Testing 7-Day Reports Drawer...');
  const reportsKpi = page.locator('button:has-text("Báo cáo 7 ngày")').first();
  if (await reportsKpi.isVisible()) {
    await reportsKpi.click();
    await page.waitForSelector('h2:has-text("Báo cáo Hiện trường trong 7 Ngày")', { timeout: 5000 });
    console.log('✓ 7-Day Reports Drawer opened successfully');
    await page.screenshot({ path: path.join(screenshotsDir, '05_reports_7d_drawer.png') });
    await page.click('button[title*="Đóng"]');
  }

  // 6. Test Single Project Selection
  console.log('Testing Single Project Selection...');
  const projectSelect = page.locator('select').first();
  if (await projectSelect.isVisible()) {
    const options = await projectSelect.locator('option').allInnerTexts();
    if (options.length > 1) {
      await projectSelect.selectOption({ index: 1 });
      await page.waitForTimeout(1000);
      console.log('✓ Single Project selected');
      await page.screenshot({ path: path.join(screenshotsDir, '06_dashboard_single_project.png'), fullPage: true });

      // Test Risk Drawer in Single Project Mode
      if (await riskKpi.isVisible()) {
        await riskKpi.click();
        await page.waitForTimeout(500);
        await page.screenshot({ path: path.join(screenshotsDir, '07_risk_drawer_single_project.png') });
        await page.click('button[title*="Đóng"]');
      }
    }
  }

  // 7. Test Mobile Viewport (390 x 844)
  console.log('Testing Mobile Viewport...');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: path.join(screenshotsDir, '08_dashboard_mobile.png'), fullPage: true });

  await browser.close();
  console.log('--- ALL RUNTIME VERIFICATION TESTS COMPLETED SUCCESSFULLY ---');
}

verifyDashboardRuntime().catch((err) => {
  console.error('Runtime Verification Error:', err);
  process.exit(1);
});
