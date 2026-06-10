const { chromium } = require('playwright');
const fs = require('fs');

const BASE_URL = 'http://localhost:3001';

async function investigateApp() {
  const browser = await chromium.launch();
  let projectId = null;

  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(10000);

    // Step 1: Check home page
    console.log('\n🔍 Investigating app structure...\n');
    console.log('📍 Navigating to home page...');
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Get the current URL (may have redirected)
    const currentUrl = page.url();
    console.log(`📍 Current URL: ${currentUrl}`);

    // Get all links on the page
    console.log('\n🔗 All links on current page:');
    const links = await page.$$eval('a', anchors => 
      anchors.map(a => ({ text: a.textContent.trim(), href: a.getAttribute('href') }))
    );
    links.forEach((link, i) => {
      if (link.href && link.href.length > 0) {
        console.log(`  ${i + 1}. [${link.text}] → ${link.href}`);
      }
    });

    // Check for navigation
    console.log('\n🧭 Navigation structure:');
    const navItems = await page.$$eval('nav a, [role="navigation"] a, header a, .nav a, .navbar a', anchors => 
      anchors.map(a => ({ text: a.textContent.trim(), href: a.getAttribute('href') }))
    ).catch(() => []);
    navItems.forEach((item, i) => {
      console.log(`  ${i + 1}. [${item.text}] → ${item.href}`);
    });

    // Check page content
    console.log('\n📄 Page content structure:');
    const headings = await page.$$eval('h1, h2, h3', hs => 
      hs.map(h => ({ tag: h.tagName, text: h.textContent.trim() }))
    );
    headings.forEach((h, i) => {
      console.log(`  ${h.tag}: ${h.text}`);
    });

    // Check for tables or lists
    console.log('\n📊 Data elements on page:');
    const tables = await page.$$('table');
    console.log(`  Tables: ${tables.length}`);
    
    const lists = await page.$$('ul, ol, [role="list"]');
    console.log(`  Lists: ${lists.length}`);

    // Try different project paths
    console.log('\n🔄 Testing different navigation paths...');

    // Path 1: /projects
    console.log('\n  Trying /projects...');
    await page.goto(`${BASE_URL}/projects`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    const projectsUrl = page.url();
    console.log(`    Current URL: ${projectsUrl}`);
    
    // Look for project items/links
    const projectItems = await page.$$eval('[href*="/projects/"], tr, .project-item, .card', els => 
      els.map(el => {
        const href = el.getAttribute('href') || el.closest('[href*="/projects/"]')?.getAttribute('href');
        const text = el.textContent.trim().substring(0, 50);
        return { href, text: text.replace(/\s+/g, ' ') };
      })
    ).catch(() => []);
    
    console.log(`    Found ${projectItems.length} potential project links`);
    projectItems.slice(0, 5).forEach((item, i) => {
      console.log(`      ${i + 1}. ${item.text} → ${item.href}`);
    });

    // Try to extract a project ID from any found links
    for (const item of projectItems) {
      if (item.href) {
        const match = item.href.match(/\/projects\/([^/]+)/);
        if (match) {
          projectId = match[1];
          console.log(`\n  ✓ Found project ID: ${projectId}`);
          break;
        }
      }
    }

    // Path 2: Try creating or finding via API
    if (!projectId) {
      console.log('\n  No project found via navigation. Trying to list projects via potential API...');
      try {
        const apiResponse = await page.goto(`${BASE_URL}/api/projects`, { waitUntil: 'networkidle' });
        const text = await page.content();
        console.log('    API response received');
        if (text.includes('id')) {
          console.log('    Response contains ID field - API exists');
        }
      } catch (e) {
        console.log(`    API check failed: ${e.message}`);
      }
    }

    // Path 3: Try hardcoded project ID 1
    console.log('\n  Trying with hardcoded project ID = 1...');
    await page.goto(`${BASE_URL}/projects/1`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    const projectPage = page.url();
    console.log(`    URL after navigation: ${projectPage}`);
    
    if (!projectPage.includes('404') && !projectPage.includes('error')) {
      projectId = '1';
      console.log(`    ✓ Project 1 seems to exist`);
    }

    // If we found a project, test field-progress screens
    if (projectId) {
      console.log(`\n✅ Testing with project ID: ${projectId}`);

      const screens = [
        'field-progress',
        'field-progress/daily', 
        'field-progress/summary'
      ];

      for (const screen of screens) {
        const url = `${BASE_URL}/projects/${projectId}/${screen}`;
        console.log(`\n  📍 Testing: ${screen}`);
        try {
          await page.goto(url, { waitUntil: 'networkidle' });
          await page.waitForTimeout(300);
          const screenUrl = page.url();
          const content = await page.content();
          
          if (content.includes('404') || content.includes('not found') || screenUrl.includes('error')) {
            console.log(`    ❌ Not found (404)`);
          } else {
            console.log(`    ✅ Page exists and loads`);
            
            // Check for content
            const text = await page.evaluate(() => document.body.innerText);
            if (text.length > 100) {
              console.log(`    📄 Content: ${text.substring(0, 80).replace(/\n/g, ' ')}...`);
            } else {
              console.log(`    ⚠️  Limited content on page`);
            }
          }
        } catch (e) {
          console.log(`    ❌ Error: ${e.message}`);
        }
      }
    } else {
      console.log('\n❌ Could not find any project ID');
    }

    await page.close();

  } catch (error) {
    console.error('❌ Investigation error:', error.message);
  } finally {
    await browser.close();
  }
}

investigateApp().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
