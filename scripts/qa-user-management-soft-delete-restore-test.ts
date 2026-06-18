
import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import prisma from "../src/lib/prisma";
import fs from "fs";
import path from "path";

const baseUrl = process.env.QA_BASE_URL || "http://localhost:3000";
const screenshotDir = path.join(process.cwd(), "docs", "qa", "screenshots", "user-management-soft-delete");

async function waitForSettledPage(page: Page) {
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(1000);
}

async function takeScreenshot(page: Page, filename: string) {
  const filepath = path.join(screenshotDir, filename);
  await page.screenshot({ path: filepath, fullPage: true });
  console.log(`Captured ${filename}`);
}

async function main() {
  fs.mkdirSync(screenshotDir, { recursive: true });
  
  // Clean up any previously created test user
  await prisma.projectMember.deleteMany({
    where: { user: { email: 'qa-soft-delete@construction.local' } }
  });
  await prisma.user.deleteMany({
    where: { email: 'qa-soft-delete@construction.local' }
  });
  
  // Create a user to delete
  const testUser = await prisma.user.create({
    data: {
      email: "qa-soft-delete@construction.local",
      username: "qa_soft_delete",
      password: "hashed_password",
      name: "QA Soft Delete User",
      role: "CHIEF_COMMANDER",
      isActive: true,
      deletedAt: null
    }
  });

  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
    const page = await context.newPage();
    
    // Login as Admin
    console.log("1. Logging in as ADMIN...");
    await page.goto(`${baseUrl}/login`, { waitUntil: "networkidle" });
    await page.locator('input[name="email"]').fill("admin@construction.local");
    await page.locator('input[name="password"]').fill("123456");
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/\/dashboard|\/projects/);
    console.log("✅ Login successful.");

    // Go to users
    await page.goto(`${baseUrl}/users`, { waitUntil: "networkidle" });
    await waitForSettledPage(page);
    
    // Test 1: Soft Delete
    console.log("2. Testing Soft Delete...");
    await takeScreenshot(page, "users-list-active-1366.png");

    const row = page.locator('tr').filter({ hasText: 'qa-soft-delete@construction.local' });
    await row.waitFor({ state: "visible" });

    await row.locator('button[title="Xóa mềm tài khoản"]').click();
    await page.waitForTimeout(500);
    await page.locator('div[role="dialog"] button:has-text("Xóa mềm tài khoản")').click();
    await waitForSettledPage(page);
    
    // Verify soft delete worked
    const deletedUser = await prisma.user.findUnique({ where: { email: 'qa-soft-delete@construction.local' } });
    if (!deletedUser || !deletedUser.deletedAt || deletedUser.isActive) {
      throw new Error("User was not properly soft-deleted in DB!");
    }
    console.log("✅ Soft delete successful in DB.");
    
    // Test 2: Filter Deleted
    console.log("3. Testing Deleted Filter...");
    await page.locator('select[id="user-status-filter"]').selectOption('deleted');
    await waitForSettledPage(page);
    await takeScreenshot(page, "users-filter-deleted-1366.png");
    
    const deletedRow = page.locator('tr').filter({ hasText: 'qa-soft-delete@construction.local' });
    await deletedRow.waitFor({ state: "visible" });
    console.log("✅ Filter deleted works.");

    // Detail deleted
    await deletedRow.locator('button[title="Xem chi tiết"]').click();
    await page.waitForTimeout(500);
    await takeScreenshot(page, "users-detail-deleted-status-1366.png");
    await page.locator('button[aria-label="Đóng chi tiết"]').click();
    await page.waitForTimeout(500);
    
    // Test 3: Restore
    await deletedRow.locator('button[title="Khôi phục tài khoản"]').click();
    await page.waitForTimeout(500);
    await page.locator('div[role="dialog"] button:has-text("Khôi phục")').click();
    await waitForSettledPage(page);
    
    const restoredUser = await prisma.user.findUnique({ where: { email: 'qa-soft-delete@construction.local' } });
    if (!restoredUser || restoredUser.deletedAt !== null || !restoredUser.isActive) {
      throw new Error("User was not properly restored in DB!");
    }
    console.log("✅ Restore successful in DB.");
    
    // Mobile screenshot
    console.log("5. Testing Mobile View...");
    const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const mPage = await mobileContext.newPage();
    
    await mPage.goto(`${baseUrl}/login`, { waitUntil: "networkidle" });
    await mPage.locator('input[name="email"]').fill("admin@construction.local");
    await mPage.locator('input[name="password"]').fill("123456");
    await mPage.locator('button[type="submit"]').click();
    await mPage.waitForURL(/\/dashboard|\/projects/);
    
    await mPage.goto(`${baseUrl}/users`, { waitUntil: "networkidle" });
    await waitForSettledPage(mPage);
    
    // Search for user
    await mPage.locator('input[id="user-search"]').fill('qa-soft-delete');
    await waitForSettledPage(mPage);
    await takeScreenshot(mPage, "users-mobile-soft-delete-action-390.png");
    
    await mobileContext.close();

    console.log("🎉 All user management soft-delete/restore tests passed successfully!");
  } catch (error) {
    console.error("❌ Test failed:", error);
    process.exit(1);
  } finally {
    await browser.close();
    
    // Cleanup
    await prisma.projectMember.deleteMany({
      where: { user: { email: 'qa-soft-delete@construction.local' } }
    });
    await prisma.user.deleteMany({
      where: { email: 'qa-soft-delete@construction.local' }
    });
  }
}

main();
