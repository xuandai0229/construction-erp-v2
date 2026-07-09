import { chromium } from "playwright";
import "dotenv/config";
import assert from "assert";
import fs from "fs";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });

  // Ensure artifacts dir exists for screenshots
  if (!fs.existsSync("docs/qa/screenshots")) {
    fs.mkdirSync("docs/qa/screenshots", { recursive: true });
  }

  try {
    console.log("Navigating to login...");
    await page.goto("http://localhost:3000/login", { waitUntil: "networkidle" });
    await page.fill('input[name="email"]', "tayho.admin@seed.local");
    await page.fill('input[name="password"]', "admin1234567890");
    await page.click('button[type="submit"]');
    await page.waitForLoadState("networkidle");
    assert(!page.url().includes("/login"), "Login failed");

    console.log("Navigating to reports...");
    await page.goto("http://localhost:3000/reports", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: /Tạo báo cáo mới/i }).first().click();
    
    // Wait for modal
    await page.getByRole("dialog").waitFor({ state: "visible", timeout: 10000 });
    
    // Wait for project select to be available
    const projectSelect = page.locator('select').first();
    await projectSelect.waitFor({ state: "visible" });
    
    // Select first valid project (index 1)
    await projectSelect.selectOption({ index: 1 });
    await page.waitForTimeout(1000); // Wait for items to load in background

    // Open WorkPicker
    console.log("Opening WorkPicker...");
    await page.getByRole("button", { name: /Thêm khối lượng/i }).click();
    await page.waitForTimeout(2000); // Give time for popup and loading

    // Take WorkPicker screenshot
    await page.screenshot({ path: "docs/qa/screenshots/workpicker.png" });
    console.log("WorkPicker screenshot saved.");
    
    // Check if we can find FP-CB-001 or any item and select it
    const checkboxes = page.locator('input[type="checkbox"]');
    const count = await checkboxes.count();
    if (count > 2) {
      await checkboxes.nth(1).check(); // select first item
      await checkboxes.nth(2).check(); // select second item
      await page.getByRole("button", { name: /Thêm vào báo cáo/i }).click();
    } else {
      console.log("No items found in WorkPicker.");
      await page.getByRole("button", { name: /Hủy bỏ/i }).click();
    }

    await page.waitForTimeout(1000);

    // Save report form screenshot
    await page.screenshot({ path: "docs/qa/screenshots/report-creation.png" });
    console.log("Report creation screenshot saved.");
    
    // Navigate to Daily Field Progress
    console.log("Navigating to Daily Field Progress...");
    // Find a link to project field progress
    await page.goto("http://localhost:3000/projects", { waitUntil: "networkidle" });
    await page.locator('table tr').nth(1).click();
    await page.waitForLoadState("networkidle");
    await page.getByRole("link", { name: /Theo dõi khối lượng theo ngày/i }).click();
    await page.waitForLoadState("networkidle");

    // Take screenshot
    await page.screenshot({ path: "docs/qa/screenshots/field-progress-daily.png" });
    console.log("Field progress screenshot saved.");

    console.log("UAT script completed.");
  } catch (error) {
    console.error("UAT failed", error);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

main();
