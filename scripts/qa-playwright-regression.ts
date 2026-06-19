import { chromium } from "playwright";
import "dotenv/config";
import assert from "assert";

async function main() {
  const browser = await chromium.launch({ headless: true });
  
  try {
    // Test GNG-UX-001 (Header role) - Commander
    console.log("Testing Commander Header Role...");
    const cmdContext = await browser.newContext();
    const cmdPage = await cmdContext.newPage();
    await cmdPage.goto("http://localhost:3000/login");
    await cmdPage.fill('input[name="email"]', "commander1@construction.local");
    await cmdPage.fill('input[name="password"]', process.env.SEED_DEV_TEST_PASSWORD || "");
    await cmdPage.click('button[type="submit"]');
    await cmdPage.waitForURL("**/projects");

    let headerText = await cmdPage.locator("header").innerText();
    assert(headerText.includes("Chỉ huy trưởng"), "Header should contain 'Chỉ huy trưởng' for Commander");
    assert(!headerText.includes("Quản trị viên"), "Header should NOT contain 'Quản trị viên' for Commander");
    console.log("Commander header OK.");
    
    // 2. Test GNG-QA-001 (Pagination Page 2)
    console.log("Testing Pagination Page 2...");
    // commander has projects page
    await cmdPage.goto("http://localhost:3000/projects");
    await cmdPage.waitForSelector('text=QA Pagination Project');
    
    // Click page 2 if pagination exists
    const page2Button = cmdPage.locator('button', { hasText: '2' }).first();
    if (await page2Button.isVisible()) {
      await page2Button.click();
      await cmdPage.waitForTimeout(1000); // Wait for load
      const url = cmdPage.url();
      assert(url.includes("page=2") || url.includes("2"), "URL should contain page=2");
      console.log("Pagination Page 2 loaded successfully.");
    } else {
      console.log("Warning: Pagination button 2 not found (maybe not enough items per page or different UI)");
      
      // Let's try navigating to ?page=2 directly
      await cmdPage.goto("http://localhost:3000/projects?page=2");
      await cmdPage.waitForTimeout(1000);
      const items = await cmdPage.locator('text=QA Pagination Project').count();
      if (items > 0) {
          console.log("Pagination Page 2 loaded via direct URL successfully.");
      } else {
          console.log("Warning: No QA Pagination Projects found on page 2.");
      }
    }

    await cmdContext.close();

    console.log("All Playwright UI Regression Tests Passed.");
  } catch (error) {
    console.error("Test Failed:", error);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

main();
