const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { requireQaEnv } = require('./qa-env');

const adminEmail = process.env.QA_ADMIN_EMAIL || 'admin@construction.local';
const adminPassword = requireQaEnv('QA_ADMIN_PASSWORD');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const outDir = path.join(__dirname, '../docs/qa/screenshots/field-progress-ui-ux-final-v2');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  page.on('dialog', dialog => dialog.accept());

  // 1. Login
  await page.goto('http://localhost:3000/login');
  await page.fill('input[name="email"]', adminEmail);
  await page.fill('input[name="password"]', adminPassword);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard**');

  // 2. Go to projects
  await page.goto('http://localhost:3000/projects');
  await page.waitForSelector('a[href^="/projects/"]');
  
  const projectLink = await page.$('a[href^="/projects/"]');
  const href = await projectLink.getAttribute('href');
  const projectId = href.split('/').pop();

  // 3. Project Detail Cards
  await page.goto(`http://localhost:3000/projects/${projectId}`);
  await page.waitForSelector('text=Các phân hệ quản lý');
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(outDir, 'project-detail-cards.png') });

  // 4. Master Table
  await page.goto(`http://localhost:3000/projects/${projectId}/field-progress`);
  await page.waitForSelector('text=Bảng thiết lập');
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(outDir, 'master-table-desktop.png') });

  // 5. Daily Table Setup (create item)
  await page.goto(`http://localhost:3000/projects/${projectId}/field-progress/daily?date=2026-06-09`);
  await page.waitForSelector('text=Nhập khối lượng theo ngày');
  
  // click Quick Add to add the 218.6 item
  await page.click('button:has-text("Thêm công việc nhanh")');
  await page.waitForSelector('text=Thêm công việc nhanh');
  await page.fill('input[placeholder="Ví dụ: Đào móng..."]', 'Cống hộp 2.5x2.5 Nguyễn Trãi');
  await page.fill('input[placeholder="0.00"]', '218.6');
  await page.screenshot({ path: path.join(outDir, 'daily-quick-add-modal.png') });
  await page.click('button:has-text("Lưu công việc")');
  await page.waitForTimeout(1000); // wait to save

  // Test C: Math
  // 10/05
  await page.goto(`http://localhost:3000/projects/${projectId}/field-progress/daily?date=2026-05-10`);
  await page.waitForSelector('text=Cống hộp 2.5x2.5 Nguyễn Trãi');
  await page.fill('input[type="number"]:not([placeholder="0.00"])', '100');
  await page.click('button:has-text("Lưu tạm")');
  await page.waitForTimeout(1000);

  // 13/05
  await page.goto(`http://localhost:3000/projects/${projectId}/field-progress/daily?date=2026-05-13`);
  await page.waitForSelector('text=Cống hộp 2.5x2.5 Nguyễn Trãi');
  await page.fill('input[type="number"]:not([placeholder="0.00"])', '50');
  await page.click('button:has-text("Lưu tạm")');
  await page.waitForTimeout(1000);

  // 15/05
  await page.goto(`http://localhost:3000/projects/${projectId}/field-progress/daily?date=2026-05-15`);
  await page.waitForSelector('text=Cống hộp 2.5x2.5 Nguyễn Trãi');
  await page.fill('input[type="number"]:not([placeholder="0.00"])', '68.4');
  await page.click('button:has-text("Lưu tạm")');
  await page.waitForTimeout(1000);

  // 16/05
  await page.goto(`http://localhost:3000/projects/${projectId}/field-progress/daily?date=2026-05-16`);
  await page.waitForSelector('text=Cống hộp 2.5x2.5 Nguyễn Trãi');
  
  // Before save screenshot
  await page.fill('input[type="number"]:not([placeholder="0.00"])', '1');
  await page.keyboard.press('Tab'); // Trigger blur/math
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(outDir, 'daily-table-desktop-before-save.png') });
  
  await page.click('button:has-text("Lưu tạm")');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(outDir, 'daily-table-desktop-after-save.png') });

  // 6. Daily Detail Modal
  const detailBtns = await page.$$('button[title="Chi tiết"]');
  if (detailBtns.length > 0) {
    await detailBtns[0].click();
    await page.waitForSelector('text=Chi tiết công việc trong ngày');
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(outDir, 'daily-detail-modal.png') });
    await page.mouse.click(10, 10);
    await page.waitForTimeout(500);
  }

  // 8. Summary Table
  await page.goto(`http://localhost:3000/projects/${projectId}/field-progress/summary?from=2026-05-10&to=2026-05-16&status=ALL`);
  await page.waitForSelector('text=Tổng hợp khối lượng thi công');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(outDir, 'summary-table-desktop.png') });

  // 9. Mobile View
  const mobileContext = await browser.newContext({ viewport: { width: 375, height: 812 }, hasTouch: true });
  const mobilePage = await mobileContext.newPage();
  
  await mobilePage.goto('http://localhost:3000/login');
  await mobilePage.fill('input[name="email"]', adminEmail);
  await mobilePage.fill('input[name="password"]', adminPassword);
  await mobilePage.click('button[type="submit"]');
  await mobilePage.waitForURL('**/dashboard**');

  await mobilePage.goto(`http://localhost:3000/projects/${projectId}/field-progress/daily?date=2026-05-16`);
  await mobilePage.waitForSelector('text=Nhập khối lượng theo ngày');
  await mobilePage.waitForTimeout(500);
  await mobilePage.screenshot({ path: path.join(outDir, 'daily-mobile.png') });

  await mobilePage.goto(`http://localhost:3000/projects/${projectId}/field-progress/summary?from=2026-05-10&to=2026-05-16&status=ALL`);
  await mobilePage.waitForSelector('text=Tổng hợp khối lượng thi công');
  await mobilePage.waitForTimeout(500);
  await mobilePage.screenshot({ path: path.join(outDir, 'summary-mobile.png') });

  await browser.close();
  console.log('Screenshots captured successfully.');
})();
