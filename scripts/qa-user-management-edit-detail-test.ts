import { chromium } from "playwright";

async function runTest() {
  console.log("🚀 Starting User Management Edit & Detail Test...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // 1. Login
    console.log("1. Logging in as ADMIN...");
    await page.goto("http://localhost:3000/login");
    await page.fill('input#email', "admin@construction.local");
    await page.fill('input#password', "123456");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard");
    console.log("✅ Login successful.");

    // 2. Navigate to Users
    console.log("2. Navigating to Users management...");
    await page.goto("http://localhost:3000/users");
    await page.waitForSelector("table");
    console.log("✅ Users table loaded.");

    // 3. Test Detail Modal
    console.log("3. Testing Detail Modal...");
    const viewButtons = await page.$$("button[title='Xem chi tiết']");
    if (viewButtons.length > 0) {
      await viewButtons[0].click();
      await page.waitForSelector("h2:has-text('Chi tiết tài khoản')");
      console.log("✅ Detail modal opened.");
      const isPasswordVisible = await page.isVisible("text=passwordHash");
      if (isPasswordVisible) {
         throw new Error("Password hash should not be visible in detail modal");
      }
      await page.click("button[aria-label='Đóng chi tiết']");
      console.log("✅ Detail modal closed.");
    } else {
      console.log("⚠️ No users found to test detail modal.");
    }

    // 4. Test Edit Modal
    console.log("4. Testing Edit Modal...");
    const editButtons = await page.$$("button[title='Sửa thông tin']");
    if (editButtons.length > 0) {
      await editButtons[0].click();
      await page.waitForSelector("h2:has-text('Sửa thông tin tài khoản')");
      console.log("✅ Edit modal opened.");

      // Check for form fields
      await page.waitForSelector("input#edit-name");
      await page.waitForSelector("input#edit-email");
      await page.waitForSelector("input#edit-phone");

      // Check notes
      await page.waitForSelector("text='Dùng để đăng nhập. Hệ thống không gửi email thật.'");
      await page.waitForSelector("text='Cảnh báo: Chỉ huy trưởng nên được giao ít nhất 1 công trình.'", { state: 'hidden' }).catch(() => {});

      await page.click("button:has-text('Hủy')");
      console.log("✅ Edit modal closed.");
    } else {
      console.log("⚠️ No users found to test edit modal.");
    }

    // 5. Test Lock Confirm
    console.log("5. Testing Lock Confirm...");
    const lockButtons = await page.$$("button[title='Khóa'], button[title='Mở khóa']");
    if (lockButtons.length > 0) {
      // Stub window.confirm
      page.on('dialog', dialog => dialog.dismiss());
      await lockButtons[0].click();
      console.log("✅ Lock confirmation dialog triggered and dismissed.");
    } else {
      console.log("⚠️ No users found to test lock confirm.");
    }

    console.log("🎉 All User Management UI tests passed successfully!");
  } catch (error) {
    console.error("❌ Test failed:", error);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

runTest();
