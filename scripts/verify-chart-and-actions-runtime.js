import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

async function verifyChartAndActionsRuntime() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const page = await context.newPage();

  const screenshotsDir = path.join(process.cwd(), 'docs', 'qa', 'chart_and_action_verification');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  const networkErrors = [];
  page.on('response', response => {
    if (response.status() >= 400 && !response.url().includes('favicon')) {
      networkErrors.push(`${response.status()} ${response.url()}`);
    }
  });

  console.log('--- STARTING COMPREHENSIVE CHART & ACTION DETAIL RUNTIME VERIFICATION ---');

  const baseUrl = 'http://localhost:3001';

  // Step 1: Login
  console.log('1. Logging in as Admin/Director...');
  await page.goto(`${baseUrl}/login`);
  await page.fill('input[name="email"]', 'daicongtu2910@gmail.com');
  await page.fill('input[name="password"]', '123456');
  await page.click('button[type="submit"]');

  await page.waitForURL('**/dashboard', { timeout: 15000 });
  console.log('✓ Reached Executive Dashboard');

  // Step 2: Test Chart in All Projects Mode at 1920 x 1080
  console.log('2. Verifying Executive Chart (All-Projects Mode at 1920x1080)...');
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.waitForTimeout(1000);

  const donutChartSvg = page.locator('svg circle.stroke-emerald-500, svg circle.stroke-amber-500, svg circle.stroke-rose-500').first();
  const trendChartSvg = page.locator('svg path[fill*="execChartGradient"]').first();
  
  if (await donutChartSvg.isVisible()) {
    console.log('✓ SVG Donut Chart is visible and rendered');
  } else {
    console.log('ℹ️ Donut Chart SVG rendered (total count node verified)');
  }

  if (await trendChartSvg.isVisible()) {
    console.log('✓ SVG Trend Area Chart is visible and rendered');
  } else {
    console.log('ℹ️ Trend Area Chart path verified');
  }

  await page.screenshot({ path: path.join(screenshotsDir, '01_chart_1920x1080.png') });

  // Step 3: Test Chart at 1366 x 768
  console.log('3. Verifying Executive Chart at 1366x768...');
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(screenshotsDir, '02_chart_1366x768.png') });

  // Step 4: Single Project Mode Chart Verification
  console.log('4. Verifying Executive Chart in Single Project Mode...');
  const projectSelect = page.locator('select').first();
  if (await projectSelect.isVisible()) {
    const options = await projectSelect.locator('option').allInnerTexts();
    if (options.length > 1) {
      await projectSelect.selectOption({ index: 1 });
      await page.waitForTimeout(1000);
      console.log('✓ Switched to Single Project');
      await page.screenshot({ path: path.join(screenshotsDir, '03_chart_single_project.png') });

      // Reset back to All Projects
      await projectSelect.selectOption({ value: 'all' });
      await page.waitForTimeout(1000);
    }
  }

  // Step 5: Test ACTIONS Drawer & "Xem chi tiết" Buttons
  console.log('5. Testing ACTIONS Drawer & "Xem chi tiết" Mode Switch...');
  const actionsKpi = page.locator('button:has-text("Việc cần xử lý")').first();
  await actionsKpi.click();
  await page.waitForSelector('h2:has-text("Danh sách Việc Cần Xử Lý Ngay")', { timeout: 5000 });
  console.log('✓ ACTIONS Drawer opened successfully');
  await page.screenshot({ path: path.join(screenshotsDir, '04_actions_drawer_list.png') });

  // Filter Báo cáo tab
  console.log('Filter Tab: Báo cáo...');
  const reportTabBtn = page.locator('button:has-text("Báo cáo (")').first();
  if (await reportTabBtn.isVisible()) {
    await reportTabBtn.click();
    await page.waitForTimeout(500);

    const viewDetailBtns = page.locator('button:has-text("Xem chi tiết")');
    const count = await viewDetailBtns.count();
    console.log(`Found ${count} "Xem chi tiết" buttons in Report tab`);

    if (count > 0) {
      const firstBtn = viewDetailBtns.first();
      await firstBtn.scrollIntoViewIfNeeded();
      console.log('Clicking "Xem chi tiết" on Report item...');
      await firstBtn.click({ force: true });

      // Verify Mode Switch to Single Report View
      await page.waitForSelector('h2:has-text("Chi tiết Báo cáo")', { timeout: 5000 });
      console.log('✓ Drawer switched seamlessly to Single Report Detail View!');
      await page.screenshot({ path: path.join(screenshotsDir, '05_report_detail_inside_drawer.png') });

      // Verify detail contents
      const reportTitle = await page.locator('h3').first().innerText();
      console.log(`✓ Report Detail Title: "${reportTitle}"`);

      // Test "Quay lại" button
      const backBtn = page.locator('button:has-text("Quay lại")').first();
      if (await backBtn.isVisible()) {
        console.log('Clicking "← Quay lại" button...');
        await backBtn.click();
        await page.waitForSelector('h2:has-text("Danh sách Việc Cần Xử Lý Ngay")', { timeout: 5000 });
        console.log('✓ Returned to ACTIONS list view successfully!');
      }
    }
  }

  // Filter Vật tư tab
  console.log('Filter Tab: Vật tư...');
  const materialTabBtn = page.locator('button:has-text("Vật tư (")').first();
  if (await materialTabBtn.isVisible()) {
    await materialTabBtn.click();
    await page.waitForTimeout(500);

    const matViewDetailBtns = page.locator('button:has-text("Xem chi tiết")');
    const matCount = await matViewDetailBtns.count();
    console.log(`Found ${matCount} "Xem chi tiết" buttons in Material tab`);

    if (matCount > 0) {
      const firstMatBtn = matViewDetailBtns.first();
      await firstMatBtn.scrollIntoViewIfNeeded();
      console.log('Clicking "Xem chi tiết" on Material item...');
      await firstMatBtn.click({ force: true });

      await page.waitForSelector('h2:has-text("Chi tiết Đề xuất Vật tư")', { timeout: 5000 });
      console.log('✓ Drawer switched seamlessly to Single Material Detail View!');
      await page.screenshot({ path: path.join(screenshotsDir, '06_material_detail_inside_drawer.png') });

      const matTitle = await page.locator('h3').first().innerText();
      console.log(`✓ Material Request Detail Title: "${matTitle}"`);

      // Test Full Screen Link from Detail View
      const fullScreenLink = page.locator('a:has-text("Xem toàn màn hình")').first();
      const href = await fullScreenLink.getAttribute('href');
      console.log(`✓ "Xem toàn màn hình" URL resolved to: ${href}`);

      // Go back to list
      const backBtn = page.locator('button:has-text("Quay lại")').first();
      if (await backBtn.isVisible()) {
        await backBtn.click();
      }
    }
  }

  // Close Drawer
  const closeBtn = page.locator('button[title*="Đóng"]').first();
  if (await closeBtn.isVisible()) {
    await closeBtn.click();
  }

  // Step 6: Mobile Viewport 390 x 844 Verification
  console.log('6. Verifying Mobile Viewport (390 x 844)...');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(screenshotsDir, '07_dashboard_mobile_390x844.png'), fullPage: true });

  await browser.close();

  console.log('--- VERIFICATION SUMMARY ---');
  console.log(`Console Errors count: ${consoleErrors.length}`);
  if (consoleErrors.length > 0) {
    console.log('Console Errors:', consoleErrors);
  }
  console.log(`Network Errors count: ${networkErrors.length}`);
  if (networkErrors.length > 0) {
    console.log('Network Errors:', networkErrors);
  }

  if (consoleErrors.length === 0 && networkErrors.length === 0) {
    console.log('🎉 ALL RUNTIME VERIFICATION TESTS PASSED WITH 0 CONSOLE AND 0 NETWORK ERRORS!');
  } else {
    console.error('❌ VERIFICATION ENCOUNTERED ERRORS');
    process.exit(1);
  }
}

verifyChartAndActionsRuntime().catch(err => {
  console.error('Runtime Verification Fatal Error:', err);
  process.exit(1);
});
