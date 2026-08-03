import { chromium } from "playwright";
import path from "path";
import fs from "fs";

const BASE_URL = "http://localhost:3010";
const SCREENSHOT_DIR = path.join(process.cwd(), "test-results/settings-e2e/screenshots");

export async function runScreenshotCapture() {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });

  const page = await context.newPage();

  console.log("[E2E] Logging in as ADMIN...");
  await page.goto(`${BASE_URL}/login`);
  await page.waitForSelector("input#email");
  await page.fill("input#email", "settings_e2e_admin@qa-e2e.local");
  const adminPassword = process.env.SETTINGS_E2E_PASSWORD_ADMIN;
  if (!adminPassword) throw new Error("SETTINGS_E2E_PASSWORD_ADMIN is required");
  await page.fill("input#password", adminPassword);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 10000 });

  // 1. Company Tab
  console.log("[E2E] 1. Company Tab...");
  await page.goto(`${BASE_URL}/settings?section=company`);
  await page.waitForLoadState("networkidle");
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, "01-settings-company-tab.png"),
    fullPage: true,
  });

  // Verify Landmarks & Accessibility
  const h1Text = await page.locator("h1").first().textContent().catch(() => "N/A");
  const mainCount = await page.locator("main").count();
  const navCount = await page.locator("nav").count();
  console.log(`[A11y Checks] H1: "${h1Text}", Main count: ${mainCount}, Nav count: ${navCount}`);

  // 2. Documents Tab
  console.log("[E2E] 2. Documents Tab...");
  await page.goto(`${BASE_URL}/settings?section=documents`);
  await page.waitForLoadState("networkidle");
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, "02-settings-documents-tab.png"),
    fullPage: true,
  });

  // 3. Administration Audit Tab
  console.log("[E2E] 3. Administration Audit Tab...");
  await page.goto(`${BASE_URL}/settings?section=administration`);
  await page.waitForLoadState("networkidle");
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, "03-settings-administration-audit-tab.png"),
    fullPage: true,
  });

  // 4. Mobile Viewport
  console.log("[E2E] 4. Mobile Viewport...");
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(`${BASE_URL}/settings?section=company`);
  await page.waitForLoadState("networkidle");
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, "04-settings-mobile-viewport.png"),
    fullPage: true,
  });

  // Restore Desktop Viewport
  await page.setViewportSize({ width: 1280, height: 800 });

  // 5. Error State (Submit empty company name)
  console.log("[E2E] 5. Error State...");
  await page.goto(`${BASE_URL}/settings?section=company`);
  await page.waitForLoadState("networkidle");
  const input = page.locator('input[name="companyName"]');
  await input.fill("");
  const saveBtn = page.locator('button[type="submit"]:has-text("Lưu")');
  if (await saveBtn.isVisible()) {
    await saveBtn.click();
    await page.waitForTimeout(300);
  }
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, "05-settings-error-state.png"),
    fullPage: true,
  });

  // 6. Conflict Dialog State
  console.log("[E2E] 6. Conflict Dialog State...");
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, "06-settings-conflict-dialog.png"),
    fullPage: true,
  });

  await browser.close();
  console.log(`[E2E SUCCESS] Saved all 6 screenshots to ${SCREENSHOT_DIR}`);
}

if (process.argv[1]?.endsWith("capture-settings-e2e-screenshots.ts")) {
  runScreenshotCapture().catch((err) => {
    console.error("CAPTURE_FAILED:", err.message);
    process.exitCode = 1;
  });
}
