const { chromium } = require('playwright');
const fs = require('fs');

const VIEWPORTS = [
  { name: 'mobile-320', width: 320, height: 568 },
  { name: 'mobile-375', width: 375, height: 667 },
  { name: 'mobile-390', width: 390, height: 844 },
  { name: 'mobile-412', width: 412, height: 915 },
  { name: 'mobile-430', width: 430, height: 932 },
  { name: 'tablet-768', width: 768, height: 1024 },
  { name: 'tablet-1024', width: 1024, height: 768 },
  { name: 'desktop-1280', width: 1280, height: 720 },
  { name: 'desktop-1366', width: 1366, height: 768 },
  { name: 'desktop-1440', width: 1440, height: 900 },
  { name: 'desktop-1920', width: 1920, height: 1080 },
  { name: 'desktop-2560', width: 2560, height: 1440 }
];

const BASE_URL = 'http://localhost:3000';

(async () => {
  if (!fs.existsSync('docs/qa/screenshots/responsive-fix')) {
    fs.mkdirSync('docs/qa/screenshots/responsive-fix', { recursive: true });
  }

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('Logging in...');
  await page.goto(`${BASE_URL}/login`);
  await page.fill('input[type="email"]', 'admin@construction.local');
  await page.fill('input[type="password"]', '123456');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard');

  const routes = [
    { name: 'dashboard', path: '/dashboard' },
    { name: 'projects', path: '/projects' },
    { name: 'project-form', path: '/projects/new' },
    { name: 'documents', path: '/documents' }
  ];

  // We need to dynamically get a project ID for detail and edit pages
  await page.goto(`${BASE_URL}/projects`);
  await page.waitForSelector('a[href^="/projects/"]');
  const projectLink = await page.getAttribute('a[href^="/projects/"]', 'href');
  const projectId = projectLink.split('/').pop();
  
  routes.push({ name: 'project-detail', path: `/projects/${projectId}` });
  routes.push({ name: 'project-edit', path: `/projects/${projectId}/edit` });
  routes.push({ name: 'document-manager', path: `/documents/${projectId}` });

  for (const route of routes) {
    console.log(`Navigating to ${route.name}...`);
    await page.goto(`${BASE_URL}${route.path}`);
    await page.waitForTimeout(1000); // Wait for animations/data
    
    // For document-manager, make sure to click a folder to see files if possible
    if (route.name === 'document-manager') {
      try {
        await page.click('text=01_Hợp đồng', { timeout: 2000 });
        await page.waitForTimeout(500);
      } catch (e) {}
    }

    for (const vp of VIEWPORTS) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.waitForTimeout(200); // let layout adjust
      const screenshotPath = `docs/qa/screenshots/responsive-fix/${route.name}-${vp.name}.png`;
      await page.screenshot({ path: screenshotPath, fullPage: false });
      console.log(`Saved ${screenshotPath}`);
    }
  }

  // Also take login screenshot for 375
  await page.goto(`${BASE_URL}/login`);
  await page.setViewportSize({ width: 375, height: 667 });
  await page.screenshot({ path: `docs/qa/screenshots/responsive-fix/login-mobile-375.png` });

  await browser.close();
  console.log('Done!');
})();
