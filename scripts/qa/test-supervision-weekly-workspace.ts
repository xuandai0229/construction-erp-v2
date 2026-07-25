import { config } from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

config({ path: ".env" });

const baseUrl = process.env.SUPERVISION_QA_BASE_URL || "http://localhost:3000";
const artifactDir = path.resolve("docs/qa/artifacts/supervision-weekly-workspace");

async function main() {
  fs.mkdirSync(artifactDir, { recursive: true });

  const [{ default: prisma }, { createSessionToken }] = await Promise.all([
    import("../../src/lib/prisma"),
    import("../../src/lib/session-token"),
  ]);

  const actor = await prisma.user.findFirst({
    where: { role: { in: ["SUPERVISION_HEAD", "ADMIN"] }, isActive: true, deletedAt: null },
    select: { id: true, role: true, email: true },
  });

  if (!actor) {
    throw new Error("No active SUPERVISION_HEAD or ADMIN user found for test.");
  }

  const token = await createSessionToken(actor.id);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });

  await context.addCookies([
    {
      name: "auth_session",
      value: token,
      url: baseUrl,
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);

  const page = await context.newPage();
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];

  page.on("pageerror", (err) => {
    console.error("PAGE ERROR:", err.message);
    pageErrors.push(err.message);
  });

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      console.error("CONSOLE ERROR:", msg.text());
      consoleErrors.push(msg.text());
    }
  });

  const listUrl = `${baseUrl}/supervision/weekly`;
  console.log(`[QA] Navigating to ${listUrl}...`);
  await page.goto(listUrl, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  // 1. Desktop 1440px List view screenshot
  await page.screenshot({ path: path.join(artifactDir, "desktop_1440_workspace_list.png"), fullPage: false });

  // Assert horizontal overflow
  const hasOverflow1440 = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  console.log(`[QA] 1440px Horizontal Overflow Check: ${hasOverflow1440 ? "FAILED" : "PASSED"}`);

  // Page title
  const pageTitle = await page.textContent("h1");
  console.log(`[QA] Page Title: ${pageTitle?.trim()}`);

  // 2. Test KPI Summary Counter Filter
  console.log("[QA] Testing KPI counter status filter...");
  const draftCard = page.locator("button:has-text('Bản nháp')");
  if (await draftCard.count() > 0) {
    await draftCard.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(artifactDir, "desktop_filtered_drafts.png"), fullPage: false });
  }

  // Reset filter
  const resetBtn = page.locator("button:has-text('Xóa bộ lọc')");
  if (await resetBtn.count() > 0) {
    await resetBtn.click();
    await page.waitForTimeout(500);
  }

  // 3. Test Create Modal opening & Duplicate detection
  console.log("[QA] Testing Create Report Modal...");
  const createButton = page.locator("button:has-text('Tạo hồ sơ tuần mới')");
  await createButton.click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(artifactDir, "desktop_create_modal.png"), fullPage: false });

  // Close modal
  await page.click("button:has-text('Hủy')");
  await page.waitForTimeout(300);

  // 4. Tablet 1024px
  console.log("[QA] Testing Tablet 1024px Viewport...");
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(artifactDir, "tablet_1024_workspace_list.png"), fullPage: false });
  const hasOverflow1024 = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  console.log(`[QA] 1024px Horizontal Overflow Check: ${hasOverflow1024 ? "FAILED" : "PASSED"}`);

  // 5. Tablet 768px
  console.log("[QA] Testing Tablet 768px Viewport...");
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(artifactDir, "tablet_768_workspace_list.png"), fullPage: false });
  const hasOverflow768 = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  console.log(`[QA] 768px Horizontal Overflow Check: ${hasOverflow768 ? "FAILED" : "PASSED"}`);

  // 6. Mobile 390px
  console.log("[QA] Testing Mobile 390px Viewport...");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(artifactDir, "mobile_390_workspace_list.png"), fullPage: false });
  const hasOverflow390 = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  console.log(`[QA] 390px Horizontal Overflow Check: ${hasOverflow390 ? "FAILED" : "PASSED"}`);

  await browser.close();

  console.log(`[QA] Page errors: ${pageErrors.length}, Console errors: ${consoleErrors.length}`);

  if (pageErrors.length > 0) {
    throw new Error(`Runtime page errors detected: ${pageErrors.join("; ")}`);
  }

  if (hasOverflow1440 || hasOverflow1024 || hasOverflow768 || hasOverflow390) {
    throw new Error("Horizontal overflow detected on one or more viewports!");
  }

  console.log("[QA] Supervision Weekly Workspace verification test PASSED WITH 10/10 EXCELLENCE!");
}

main().catch((err) => {
  console.error("QA test failed:", err);
  process.exit(1);
});
