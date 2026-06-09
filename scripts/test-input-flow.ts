import { chromium } from "playwright";
import path from "path";
import fs from "fs";

async function main() {
  console.log("--- BẮT ĐẦU CHẠY PLAYWRIGHT TEST ---");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  });
  const page = await context.newPage();

  const artifactDir = "C:\\Users\\admin\\.gemini\\antigravity\\brain\\6759c7dd-406b-4a17-b679-4c47976d1b5e";
  if (!fs.existsSync(artifactDir)) {
    fs.mkdirSync(artifactDir, { recursive: true });
  }

  // 1. Đăng nhập
  console.log("1. Điều hướng đến trang login...");
  await page.goto("http://localhost:3000/login");
  await page.waitForTimeout(1000);

  console.log("Điền thông tin đăng nhập...");
  await page.fill('input[name="email"]', "admin@construction.local");
  await page.fill('input[name="password"]', "123456");
  
  await page.screenshot({ path: path.join(artifactDir, "step1_login_filled.png") });
  
  console.log("Nhấn đăng nhập...");
  await page.click('button[type="submit"]');
  await page.waitForNavigation();
  console.log("Đăng nhập thành công, URL hiện tại:", page.url());

  // 2. Vào trang daily ngày 2026-05-16 để test warning vượt KL
  console.log("2. Vào trang nhập liệu ngày 2026-05-16...");
  await page.goto("http://localhost:3000/projects/cmq52crh500030swk5u8cc1vd/field-progress/daily?date=2026-05-16");
  await page.waitForTimeout(2000);

  console.log("Nhập 1 vào ô KL hôm nay của 'Cống hộp 2,5x2,5m Nguyễn Trãi'...");
  // Tìm input của Cống hộp 2,5x2,5m
  // Dựa vào HTML: input nằm trong dòng có tên công việc đó
  const rowLocator = page.locator('tr:has-text("Cống hộp 2,5x2,5m Nguyễn Trãi")');
  const qtyInput = rowLocator.locator('input[type="number"]');
  await qtyInput.click();
  await qtyInput.fill("1");
  await page.waitForTimeout(1000);

  // Chụp ảnh hiển thị cảnh báo Vượt KL
  await page.screenshot({ path: path.join(artifactDir, "step2_exceed_warning.png") });
  console.log("Đã chụp ảnh cảnh báo Vượt KL!");

  // 3. Test nút "Thêm công việc nhanh"
  console.log("3. Bấm nút Thêm công việc nhanh...");
  await page.click('button:has-text("Thêm công việc nhanh")');
  await page.waitForTimeout(1000);

  await page.screenshot({ path: path.join(artifactDir, "step3_quick_add_modal.png") });
  console.log("Đã chụp ảnh modal Thêm công việc nhanh!");

  console.log("Điền thông tin trong modal...");
  // Tìm các trường trong modal
  await page.fill('input[placeholder*="Ví dụ: Đắp đất"]', "Đào móng cống Nguyễn Trãi");
  // Select parent group
  await page.selectOption('select:has-text("Không có")', { label: "Xây dựng hệ thống thoát nước khu vực đường Nguyễn Trãi" });
  await page.fill('input[placeholder*="Mũi 1"]', "Mũi 1");
  await page.fill('input[placeholder*="m, m3"]', "m3");
  await page.fill('input[placeholder="0.00"]', "150");

  await page.screenshot({ path: path.join(artifactDir, "step4_quick_add_filled.png") });

  console.log("Bấm Lưu công việc...");
  await page.click('button:has-text("Lưu công việc")');
  await page.waitForTimeout(2000);

  await page.screenshot({ path: path.join(artifactDir, "step5_quick_add_success.png") });
  console.log("Đã chụp ảnh sau khi thêm thành công!");

  // 4. Vào trang summary xem kết quả
  console.log("4. Vào trang Bảng tổng hợp (Summary)...");
  await page.goto("http://localhost:3000/projects/cmq52crh500030swk5u8cc1vd/field-progress/summary");
  await page.waitForTimeout(2000);

  await page.screenshot({ path: path.join(artifactDir, "step6_summary_view.png") });
  console.log("Đã chụp ảnh trang Summary!");

  await browser.close();
  console.log("--- HOÀN THÀNH CHẠY PLAYWRIGHT TEST ---");
}

main().catch(console.error);
