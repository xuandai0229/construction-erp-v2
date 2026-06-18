import { chromium } from "playwright";

const baseUrl = process.env.BASE_URL || "http://localhost:3000";

async function main() {
  console.log("=== QA USER MANAGEMENT EDIT / DETAIL TEST ===");
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
    await page.goto(`${baseUrl}/login`);
    await page.fill("input#email", "admin@construction.local");
    await page.fill("input#password", "123456");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard");

    await page.goto(`${baseUrl}/users`);
    await page.waitForSelector("table");

    const viewButton = page.locator('button[title="Xem chi tiết"]').first();
    if ((await viewButton.count()) === 0) throw new Error("Không có user để test detail.");
    await viewButton.click();
    await page.waitForSelector('h2:has-text("Chi tiết tài khoản")');
    if (await page.isVisible("text=passwordHash")) {
      throw new Error("Password hash bị lộ trong detail modal.");
    }
    await page.click('button[aria-label="Đóng chi tiết"]');
    console.log("PASS: Detail modal không lộ password hash.");

    const editButton = page.locator('button[title="Sửa thông tin"]').first();
    if ((await editButton.count()) === 0) throw new Error("Không có user để test edit.");
    await editButton.click();
    await page.waitForSelector('h2:has-text("Sửa thông tin tài khoản")');
    await page.waitForSelector("input#edit-name");
    await page.waitForSelector("input#edit-email");
    await page.waitForSelector("input#edit-phone");
    await page.locator('button:has-text("Hủy")').last().click();
    console.log("PASS: Edit modal có đủ trường chính.");

    const lockButton = page.locator('button[title="Khóa"], button[title="Mở khóa"]').first();
    if ((await lockButton.count()) === 0) throw new Error("Không có user để test lock confirm.");
    await lockButton.click();
    await page.waitForSelector('div[role="dialog"]');
    await page.locator('div[role="dialog"] button:has-text("Hủy")').click();
    console.log("PASS: Lock/unlock dùng ConfirmDialog, không dùng popup native.");
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error("FAIL:", error);
  process.exitCode = 1;
});
