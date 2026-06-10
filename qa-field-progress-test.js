const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3001';
const SCREENSHOTS_DIR = 'docs/qa/screenshots/field-progress-test-before-fix';

// Test credentials
const TEST_EMAIL = 'admin@construction.local';
const TEST_PASSWORD = '123456';

async function ensureScreenshotDir() {
  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  }
}

async function takeScreenshot(page, name) {
  const filePath = path.join(SCREENSHOTS_DIR, `${name}.png`);
  await page.screenshot({ path: filePath, fullPage: true });
  console.log(`✓ Screenshot saved: ${name}.png`);
  return filePath;
}

async function login(page) {
  console.log('\n📝 Logging in...');
  
  // Navigate to login
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  
  // Check if already logged in
  const currentUrl = page.url();
  if (!currentUrl.includes('login')) {
    console.log('✓ Already logged in');
    return true;
  }

  // Fill in login form
  try {
    await page.fill('input[type="email"], input[name="email"], input[placeholder*="email"]', TEST_EMAIL);
    await page.fill('input[type="password"], input[name="password"], input[placeholder*="password"]', TEST_PASSWORD);
    
    // Submit form
    const submitBtn = await page.$('button[type="submit"], button:has-text("Login"), button:has-text("Sign in")');
    if (submitBtn) {
      await submitBtn.click();
    } else {
      console.log('⚠️  Could not find submit button');
      return false;
    }

    // Wait for navigation
    await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(1000);

    const postLoginUrl = page.url();
    if (postLoginUrl.includes('login')) {
      console.log('❌ Login failed - still on login page');
      return false;
    }

    console.log('✓ Login successful');
    return true;
  } catch (error) {
    console.log(`❌ Login error: ${error.message}`);
    return false;
  }
}

async function runTests() {
  const browser = await chromium.launch();
  let projectId = null;
  const issues = [];

  try {
    console.log('\n🚀 Starting QA Field Progress Testing');
    console.log(`📍 Target: ${BASE_URL}`);
    console.log('━'.repeat(60));

    const page = await browser.newPage();
    page.setDefaultTimeout(10000);
    
    // Login
    const loggedIn = await login(page);
    if (!loggedIn) {
      console.log('❌ Could not proceed without login');
      await browser.close();
      return { success: false, issues: ['Authentication failed'] };
    }

    await takeScreenshot(page, '01-home-after-login');

    // Step 2: Find projects
    console.log('\n📝 Looking for projects...');
    await page.goto(`${BASE_URL}/projects`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    await takeScreenshot(page, '02-projects-list');

    // Try to find first project link
    const projectLinks = await page.$$('a[href*="/projects/"]');
    console.log(`Found ${projectLinks.length} project links`);

    if (projectLinks.length === 0) {
      issues.push('No projects found on projects list page');
      console.log('❌ No projects found');
    } else {
      // Get the first project ID from href
      const firstProjectHref = await projectLinks[0].getAttribute('href');
      projectId = firstProjectHref.match(/\/projects\/([^/]+)/)?.[1];
      console.log(`✓ Found project ID: ${projectId}`);
    }

    if (!projectId) {
      await browser.close();
      return { success: false, issues };
    }

    // Step 3: Master Screen - Field Progress
    console.log('\n📝 Testing Master Screen (Field Progress)...');
    const masterUrl = `${BASE_URL}/projects/${projectId}/field-progress`;
    await page.goto(masterUrl, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    
    const masterContent = await page.content();
    if (masterContent.includes('404') || masterContent.includes('not found')) {
      issues.push('Master screen (field-progress) returns 404');
      console.log('⚠️  Page not found');
    } else {
      await takeScreenshot(page, '03-master-screen-desktop');
      console.log('✓ Master screen captured (desktop)');
    }

    // Check UI elements
    const headings = await page.$$('h1, h2, h3');
    console.log(`✓ Found ${headings.length} heading elements`);
    if (headings.length === 0) {
      issues.push('No headings found on master screen - possible layout issue');
    }

    // Step 4: Mobile view of Master Screen
    console.log('\n📝 Testing Master Screen (Mobile 390px)...');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await takeScreenshot(page, '04-master-screen-mobile');
    console.log('✓ Master screen mobile view captured');

    // Step 5: Daily Screen
    console.log('\n📝 Testing Daily Screen...');
    await page.setViewportSize({ width: 1920, height: 1080 });
    const dailyUrl = `${BASE_URL}/projects/${projectId}/field-progress/daily`;
    await page.goto(dailyUrl, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    
    const dailyContent = await page.content();
    if (dailyContent.includes('404') || dailyContent.includes('not found')) {
      issues.push('Daily screen returns 404');
      console.log('⚠️  Daily page not found');
    } else {
      await takeScreenshot(page, '05-daily-screen-desktop');
      console.log('✓ Daily screen captured (desktop)');

      // Look for date picker/calendar
      const calendarElements = await page.$$('[role="grid"], [role="calendar"], .calendar, [class*="calendar"]');
      if (calendarElements.length > 0) {
        console.log(`✓ Found ${calendarElements.length} calendar/grid elements`);
      } else {
        console.log('⚠️  No calendar elements found on daily screen');
      }

      // Check for date inputs
      const dateInputs = await page.$$('input[type="date"], input[placeholder*="date"], input[placeholder*="Date"]');
      console.log(`✓ Found ${dateInputs.length} date input elements`);
    }

    // Step 6: Daily Screen Mobile
    console.log('\n📝 Testing Daily Screen (Mobile 390px)...');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await takeScreenshot(page, '06-daily-screen-mobile');
    console.log('✓ Daily screen mobile view captured');

    // Step 7: Summary Screen
    console.log('\n📝 Testing Summary Screen...');
    await page.setViewportSize({ width: 1920, height: 1080 });
    const summaryUrl = `${BASE_URL}/projects/${projectId}/field-progress/summary`;
    await page.goto(summaryUrl, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    
    const summaryContent = await page.content();
    if (summaryContent.includes('404') || summaryContent.includes('not found')) {
      issues.push('Summary screen returns 404');
      console.log('⚠️  Summary page not found');
    } else {
      await takeScreenshot(page, '07-summary-screen-desktop');
      console.log('✓ Summary screen captured (desktop)');

      // Look for filters
      const filterButtons = await page.$$('button:has-text("Filter"), [class*="filter"]');
      console.log(`✓ Found ${filterButtons.length} filter-related elements`);

      // Try to interact with filters if available
      if (filterButtons.length > 0) {
        console.log('📝 Attempting to show filters...');
        try {
          await filterButtons[0].click();
          await page.waitForTimeout(500);
          await takeScreenshot(page, '08-summary-with-filters');
          console.log('✓ Summary screen with filters captured');
        } catch (e) {
          console.log('⚠️  Could not click filter button');
        }
      }
    }

    // Step 8: Summary Screen Mobile
    console.log('\n📝 Testing Summary Screen (Mobile 390px)...');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(summaryUrl, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await takeScreenshot(page, '09-summary-screen-mobile');
    console.log('✓ Summary screen mobile view captured');

    // Step 9: UI Quality Checks
    console.log('\n📝 Performing UI Quality Checks...');
    
    // Check for common text truncation issues
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto(masterUrl, { waitUntil: 'networkidle' });
    
    const textElements = await page.$$('span, p, div, button');
    let truncatedCount = 0;
    for (const elem of textElements.slice(0, 50)) { // Sample first 50 elements
      try {
        const scrollWidth = await elem.evaluate(el => el.scrollWidth);
        const clientWidth = await elem.evaluate(el => el.clientWidth);
        if (scrollWidth > clientWidth) {
          truncatedCount++;
        }
      } catch (e) {
        // Ignore errors
      }
    }
    if (truncatedCount > 10) {
      issues.push(`Text truncation detected: ${truncatedCount} elements overflow their containers`);
    }
    console.log(`✓ Text truncation check: ${truncatedCount} elements with overflow`);

    // Check button visibility
    const buttons = await page.$$('button');
    console.log(`✓ Found ${buttons.length} button elements`);
    if (buttons.length === 0) {
      issues.push('No interactive buttons found - possible UI rendering issue');
    }

    // Check for accessibility
    const labels = await page.$$('label');
    console.log(`✓ Found ${labels.length} label elements`);

    // Check for tables
    const tables = await page.$$('table, [role="table"], [role="grid"]');
    console.log(`✓ Found ${tables.length} table elements`);

    // Check input fields
    const inputs = await page.$$('input, textarea, select');
    console.log(`✓ Found ${inputs.length} input elements`);

    // Verify responsive design for mobile
    console.log('\n📝 Verifying Responsive Design...');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(masterUrl, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    // Check for horizontal overflow on mobile
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = 390;
    if (bodyWidth > viewportWidth) {
      issues.push(`Mobile horizontal overflow detected: ${bodyWidth}px > ${viewportWidth}px`);
      console.log('⚠️  Horizontal scrolling needed on mobile');
    } else {
      console.log('✓ No horizontal overflow on mobile view');
    }

    await page.close();

  } catch (error) {
    console.error('❌ Error during testing:', error.message);
    issues.push(`Test error: ${error.message}`);
  } finally {
    await browser.close();
  }

  return { success: issues.length === 0, issues, projectId };
}

async function main() {
  await ensureScreenshotDir();
  const result = await runTests();
  
  console.log('\n' + '━'.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('━'.repeat(60));
  console.log(`✓ Screenshots saved to: ${SCREENSHOTS_DIR}`);
  console.log(`Project ID tested: ${result.projectId || 'N/A'}`);
  
  if (result.issues.length === 0) {
    console.log('\n✅ All tests passed! No issues detected.');
  } else {
    console.log(`\n⚠️  ${result.issues.length} issues detected:\n`);
    result.issues.forEach((issue, i) => {
      console.log(`${i + 1}. ${issue}`);
    });
  }

  console.log('\n' + '━'.repeat(60));
  console.log('✅ QA Testing Complete!');
  process.exit(result.success ? 0 : 1);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
