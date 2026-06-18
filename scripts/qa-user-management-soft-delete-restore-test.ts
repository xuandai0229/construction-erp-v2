import { chromium, type Browser } from "playwright";
import prisma from "../src/lib/prisma";

const baseUrl = process.env.BASE_URL || process.env.QA_BASE_URL || "http://localhost:3000";
const testEmail = "qa-soft-delete@construction.local";

async function cleanup() {
  await prisma.projectMember.deleteMany({
    where: { user: { email: testEmail } },
  });
  await prisma.user.deleteMany({ where: { email: testEmail } });
}

async function waitForDbState(
  predicate: () => Promise<boolean>,
  description: string,
  timeoutMs = 10000
) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Timed out waiting for DB state: ${description}`);
}

async function main() {
  console.log("=== QA USER SOFT DELETE / RESTORE TEST ===");
  let browser: Browser | null = null;

  try {
    await cleanup();
    await prisma.user.create({
      data: {
        email: testEmail,
        username: "qa_soft_delete",
        password: "not-used-for-login",
        name: "QA Soft Delete User",
        role: "CHIEF_COMMANDER",
        isActive: true,
      },
    });

    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
    const page = await context.newPage();
    await page.goto(`${baseUrl}/login`);
    await page.fill('input[name="email"]', "admin@construction.local");
    await page.fill('input[name="password"]', "123456");
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard|\/projects/);
    await page.goto(`${baseUrl}/users`);
    await page.waitForLoadState("networkidle");

    const row = page.locator("tr").filter({ hasText: testEmail });
    await row.waitFor({ state: "visible" });
    await row.locator('button[title="Xóa mềm tài khoản"]').click();
    await page.locator('div[role="dialog"] button:has-text("Xóa mềm tài khoản")').click();
    await waitForDbState(async () => {
      const deletedUser = await prisma.user.findUnique({ where: { email: testEmail } });
      return !!deletedUser?.deletedAt && !deletedUser.isActive;
    }, "user soft-deleted");
    console.log("PASS: Soft delete cập nhật DB đúng.");

    await page.locator('select[id="user-status-filter"]').selectOption("deleted");
    const deletedRow = page.locator("tr").filter({ hasText: testEmail });
    await deletedRow.waitFor({ state: "visible" });
    await deletedRow.locator('button[title="Khôi phục tài khoản"]').click();
    await page.locator('div[role="dialog"] button:has-text("Khôi phục")').click();
    await waitForDbState(async () => {
      const restoredUser = await prisma.user.findUnique({ where: { email: testEmail } });
      return !!restoredUser && restoredUser.deletedAt === null && restoredUser.isActive;
    }, "user restored");
    console.log("PASS: Restore cập nhật DB đúng.");

    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    });
    const mobilePage = await mobileContext.newPage();
    await mobilePage.goto(`${baseUrl}/login`);
    await mobilePage.fill('input[name="email"]', "admin@construction.local");
    await mobilePage.fill('input[name="password"]', "123456");
    await mobilePage.click('button[type="submit"]');
    await mobilePage.waitForURL(/\/dashboard|\/projects/);
    await mobilePage.goto(`${baseUrl}/users`);
    await mobilePage.waitForLoadState("networkidle");
    const hasHorizontalOverflow = await mobilePage.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1
    );
    if (hasHorizontalOverflow) throw new Error("Mobile /users bị overflow ngang toàn trang.");
    await mobileContext.close();
    console.log("PASS: Mobile 390 không có overflow ngang toàn trang.");
  } finally {
    if (browser) await browser.close();
    await cleanup();
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("FAIL:", error);
  process.exitCode = 1;
});
