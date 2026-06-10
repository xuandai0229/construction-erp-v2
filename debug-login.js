const { chromium } = require('playwright');

const BASE_URL = 'http://localhost:3001';

async function debugLogin() {
  const browser = await chromium.launch();

  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(10000);

    console.log('\n🔍 Debugging login page...\n');

    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    const currentUrl = page.url();
    console.log(`Current URL: ${currentUrl}`);

    // Get all form elements
    console.log('\n📋 Form elements:');
    const inputs = await page.$$eval('input', inps => 
      inps.map(inp => ({
        type: inp.type,
        name: inp.name,
        id: inp.id,
        placeholder: inp.placeholder,
        value: inp.value
      }))
    );
    inputs.forEach((inp, i) => {
      console.log(`  ${i + 1}. ${inp.type} | name="${inp.name}" | id="${inp.id}" | placeholder="${inp.placeholder}"`);
    });

    // Get all buttons
    console.log('\n🔘 Buttons:');
    const buttons = await page.$$eval('button', btns => 
      btns.map(btn => ({
        type: btn.type,
        text: btn.textContent.trim().substring(0, 50),
        name: btn.name,
        id: btn.id
      }))
    );
    buttons.forEach((btn, i) => {
      console.log(`  ${i + 1}. [${btn.type}] "${btn.text}" | name="${btn.name}" | id="${btn.id}"`);
    });

    // Get form structure
    console.log('\n📄 Form structure:');
    const forms = await page.$$eval('form', frms => 
      frms.map(frm => ({
        id: frm.id,
        name: frm.name,
        action: frm.action,
        method: frm.method
      }))
    );
    forms.forEach((frm, i) => {
      console.log(`  ${i + 1}. Form: id="${frm.id}" | name="${frm.name}" | action="${frm.action}" | method="${frm.method}"`);
    });

    // Get page content
    console.log('\n📝 Page content (first 500 chars):');
    const content = await page.evaluate(() => document.body.innerText);
    console.log(content.substring(0, 500).replace(/\n/g, '\n   '));

    // Try to find email/password fields by various selectors
    console.log('\n🔎 Searching for input fields...');
    const emailField = await page.$('input[name="email"]') || 
                       await page.$('input[type="email"]') ||
                       await page.$('input[id="email"]');
    console.log(`  Email field found: ${emailField ? 'YES' : 'NO'}`);

    const passwordField = await page.$('input[name="password"]') || 
                          await page.$('input[type="password"]') ||
                          await page.$('input[id="password"]');
    console.log(`  Password field found: ${passwordField ? 'YES' : 'NO'}`);

    const submitBtn = await page.$('button[type="submit"]') || 
                      await page.$('button');
    console.log(`  Submit button found: ${submitBtn ? 'YES' : 'NO'}`);

    // Try to take a screenshot
    await page.screenshot({ path: 'docs/qa/screenshots/field-progress-test-before-fix/debug-login-page.png' });
    console.log('\n✓ Screenshot saved: debug-login-page.png');

    await page.close();

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

debugLogin().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
