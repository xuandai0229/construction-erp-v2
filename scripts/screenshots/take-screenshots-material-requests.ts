// @ts-nocheck
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
require('dotenv').config();
const { requireQaEnv } = require('./qa-env');

const adminEmail = process.env.QA_ADMIN_EMAIL || 'admin@construction.local';
const adminPassword = requireQaEnv('QA_ADMIN_PASSWORD');

async function loginAndGetState() {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  await page.goto('http://localhost:3000/login');
  await page.fill('input[name="email"]', adminEmail);
  await page.fill('input[name="password"]', adminPassword);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard**', { timeout: 10000 }).catch(() => {});
  await page.goto('http://localhost:3000/projects');
  await page.waitForURL('http://localhost:3000/projects');
  
  const projectId = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a[href^="/projects/"]'));
    const link = links.find(l => {
      const id = l.getAttribute('href')?.split('/')[2];
      return id && id !== 'new';
    });
    return link ? link.getAttribute('href')?.split('/')[2] : null;
  });

  await context.storageState({ path: 'storageState.json' });
  await browser.close();
  return projectId;
}

async function checkA11y(page, env) {
  const issues = await page.evaluate(() => {
    const errors = [];
    const elements = document.querySelectorAll('input:not([type="hidden"]), select, textarea');
    elements.forEach((el, index) => {
      const tag = el.tagName.toLowerCase();
      if (!el.id) errors.push(`${tag} (index ${index}) thiêu id`);
      if (!el.name) errors.push(`${tag} (index ${index}) thiêu name`);
      
      if (el.id) {
        const label = document.querySelector(`label[for="${el.id}"]`);
        if (!label) errors.push(`${tag}#${el.id} thiêu label htmlFor`);
      }
    });

    const buttons = document.querySelectorAll('button');
    buttons.forEach((el, index) => {
      if (!el.textContent.trim() && !el.getAttribute('aria-label') && !el.getAttribute('title')) {
        errors.push(`button (index ${index}) thiêu aria-label hoặc text`);
      }
    });
    return errors;
  });

  const txtPath = path.join(__dirname, `../docs/qa/screenshots/material-requests-final-alignment/material-requests-a11y-${env}.txt`);
  fs.writeFileSync(txtPath, `A11y Report cho ${env}:\n` + (issues.length ? issues.join('\n') : 'Tuyệt vời, không có lỗi A11y form/label!'));
}

async function takeScreenshots() {
  const projectId = await loginAndGetState();
  if (!projectId) {
    console.error("Không tìm thấy projectId để test");
    return;
  }

  const browser = await chromium.launch();
  
  const dir = path.join(__dirname, '../docs/qa/screenshots/material-requests-final-alignment');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const materialUrl = `http://localhost:3000/projects/${projectId}/material-requests`;
  const fieldProgressUrl = `http://localhost:3000/projects/${projectId}/field-progress`;

  // 1. Clear data for empty state
  console.log("Clearing data cho empty state...");
  execSync('npx tsx scripts/clear-material-requests.ts', { stdio: 'ignore' });

  const viewportsEmpty = [
    { name: 'desktop-list-empty-1366', width: 1366, height: 768 },
    { name: 'mobile-list-empty-360', width: 360, height: 740 },
  ];

  for (const vp of viewportsEmpty) {
    const context = await browser.newContext({ storageState: 'storageState.json', viewport: { width: vp.width, height: vp.height } });
    const page = await context.newPage();
    await page.goto(materialUrl);
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(dir, `material-requests-${vp.name}.png`) });
    await context.close();
  }

  // 2. Seed data
  console.log("Seeding data...");
  execSync('npx tsx scripts/qa-material-requests-crud-test.ts', { stdio: 'ignore' });

  // 3. Screenshots with data
  const viewports = [
    { name: 'desktop-list-with-data-1366', width: 1366, height: 768 },
    { name: 'desktop-1440', width: 1440, height: 900 },
    { name: 'desktop-1536', width: 1536, height: 864 },
    { name: 'desktop-1920', width: 1920, height: 1080 },
    { name: 'mobile-list-with-data-360', width: 360, height: 740 },
    { name: 'mobile-list-with-data-390', width: 390, height: 844 },
    { name: 'mobile-430', width: 430, height: 932 },
  ];

  for (const vp of viewports) {
    const context = await browser.newContext({ storageState: 'storageState.json', viewport: { width: vp.width, height: vp.height } });
    const page = await context.newPage();

    await page.goto(materialUrl);
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(dir, `material-requests-${vp.name}.png`) });

    if (vp.width === 1366) {
      await page.click('button:has-text("Tạo đề xuất")');
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(dir, `material-requests-desktop-form-1366.png`) });
      
      await checkA11y(page, 'desktop');

      // Dropdown open
      const select = await page.$('select[name="fieldProgressItemId-0"]');
      if (select) {
         await select.focus();
         await page.waitForTimeout(200);
         await page.screenshot({ path: path.join(dir, `material-requests-desktop-form-dropdown-open-1366.png`) });
      }

      await page.click('button[aria-label="Đóng form tạo đề xuất vật tư"]');
      await page.waitForTimeout(500);

      // Detail
      const detailBtn = await page.$('button[title="Chi tiết"]');
      if (detailBtn) {
        await detailBtn.click();
        await page.waitForTimeout(500);
        await page.screenshot({ path: path.join(dir, `material-requests-desktop-detail-1366.png`) });
      }
    }

    if (vp.width === 390) {
      await page.click('button:has-text("Tạo đề xuất")');
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(dir, `material-requests-mobile-form-390.png`) });
      
      await checkA11y(page, 'mobile');

      // Validation
      await page.click('button:has-text("Lưu nháp")');
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(dir, `material-requests-mobile-form-validation-390.png`) });

      await page.click('button[aria-label="Đóng form tạo đề xuất vật tư"]');
      await page.waitForTimeout(500);

      // Detail
      await page.evaluate(() => {
         const btn = Array.from(document.querySelectorAll('button')).find(el => el.textContent.includes('Chi tiết'));
         if (btn) btn.click();
      });
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(dir, `material-requests-mobile-detail-390.png`) });
    }

    if (vp.width === 360) {
      await page.click('button:has-text("Tạo đề xuất")');
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(dir, `material-requests-mobile-form-360.png`) });
    }

    // Regression for 390
    if (vp.width === 390) {
      await page.goto(fieldProgressUrl);
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(dir, `field-progress-master-regression-390.png`) });

      await page.goto(`${fieldProgressUrl}/daily`);
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(dir, `field-progress-daily-regression-390.png`) });

      await page.goto(`${fieldProgressUrl}/summary`);
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(dir, `field-progress-summary-regression-390.png`) });
    }

    // Regression for 1366
    if (vp.width === 1366) {
      await page.goto(`${fieldProgressUrl}/summary`);
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(dir, `field-progress-summary-desktop-regression-1366.png`) });
    }

    await context.close();
  }

  await browser.close();
  console.log("Đã chụp ảnh và test A11y xong.");
}

takeScreenshots().catch(console.error);
