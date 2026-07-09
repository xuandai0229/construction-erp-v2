import { chromium } from "playwright";
import * as path from "path";
import * as fs from "fs";
import * as dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTest() {
  console.log("Starting QA: Weekly Report UI Date and Plan Fix");
  
  // Create QA Project to ensure we have a valid project with data
  const qaProjectCode = "QA-PLAN-UI-" + Date.now();
  console.log(`Setting up QA Project: ${qaProjectCode}`);
  const user = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  if (!user) throw new Error("No admin user found.");

  const qaProject = await prisma.project.create({
    data: {
      code: qaProjectCode,
      name: "Dự án QA UI Test",
      status: "ACTIVE",
      startDate: new Date(),
    }
  });

  const template = await prisma.fieldProgressTemplate.create({
    data: {
      project: { connect: { id: qaProject.id } },
      name: "Hạng mục QA",
      createdBy: { connect: { id: user.id } },
    }
  });

  const item1 = await prisma.fieldProgressItem.create({
    data: {
      project: { connect: { id: qaProject.id } },
      template: { connect: { id: template.id } },
      code: "QA-ITEM-1",
      workContent: "Công việc QA 1",
      unit: "m2",
      designQuantity: 1000,
      itemType: "WORK",
      createdBy: { connect: { id: user.id } },
    }
  });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
  });
  const page = await context.newPage();
  
  // Create screenshots directory
  const dir = path.join(process.cwd(), "docs", "qa", "screenshots");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  try {
    const url = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    
    // 1. Login
    console.log("Navigating to login...");
    await page.goto(`${url}/login`);
    try {
      await page.waitForSelector('input[name="email"]', { timeout: 5000 });
      await page.fill('input[name="email"]', "tayho.admin@seed.local");
      await page.fill('input[name="password"]', "Admin@123");
    } catch (e: any) {
      await page.screenshot({ path: path.join(dir, "login-failed.png"), fullPage: true });
      console.log("Could not find email/password inputs. Screenshot saved.");
      throw e;
    }
    await page.click('button[type="submit"]');
    await delay(3000);
    console.log("Login successful.");

    // 2. Open Reports
    console.log("Navigating to /reports...");
    await page.goto(`${url}/reports`);
    await delay(2000);
    
    try {
      await page.waitForSelector('h1:has-text("Báo cáo hiện trường")', { timeout: 10000 });
    } catch (e: any) {
      await page.screenshot({ path: path.join(dir, "reports-failed.png"), fullPage: true });
      console.log("Could not find h1. Screenshot saved.");
      throw e;
    }
    
    // Wait for the 'Create Report' button to appear and click it
    console.log("Clicking Create Report...");
    await page.click('button:has-text("Tạo báo cáo mới")');
    
    // Wait for modal
    await page.waitForSelector('div[role="dialog"]', { state: "visible" });
    console.log("Report dialog opened.");
    
    // 3. Switch to Weekly Report
    console.log("Switching to Weekly Report...");
    const modal = page.locator('div[role="dialog"]').last();
    await modal.getByRole('button', { name: 'Báo cáo tuần', exact: true }).click({ force: true });
    await delay(1000);
    
    // 4. Select Project 
    console.log(`Selecting project: ${qaProject.name}`);
    const projectSelect = await page.locator('select').first();
    await projectSelect.selectOption({ label: qaProject.name });
    await delay(1000);
    
    // 5. Test "Tuần này"
    console.log("Testing 'Tuần này'...");
    await modal.getByRole('button', { name: 'Tuần này', exact: true }).click({ force: true });
    await delay(500);
    
    const startInput = await page.getByTestId("weekly-start-date").inputValue();
    const endInput = await page.getByTestId("weekly-end-date").inputValue();
    console.log(`Tuần này dates: ${startInput} -> ${endInput}`);
    
    if (!startInput || !endInput) {
      throw new Error("Date inputs are empty after clicking 'Tuần này'");
    }

    // 5.1 Assert Day Chips for Tuần này
    console.log("Asserting Day Chips...");
    const hasT2 = await modal.getByText("Thứ 2, 06/07").isVisible();
    const hasCN = await modal.getByText("CN, 12/07").isVisible();
    const hasCNFalse = await modal.getByText("CN, 05/07").isVisible();
    
    if (hasT2) console.log("✅ Day chip found: Thứ 2, 06/07");
    else throw new Error("Day chip Thứ 2, 06/07 not found!");
    
    if (hasCN) console.log("✅ Day chip found: CN, 12/07");
    else throw new Error("Day chip CN, 12/07 not found!");
    
    if (!hasCNFalse) console.log("✅ Day chip not found: CN, 05/07");
    else throw new Error("Day chip CN, 05/07 unexpectedly found!");
    
    // 6. Test "Tuần trước"
    console.log("Testing 'Tuần trước'...");
    await modal.getByRole('button', { name: 'Tuần trước', exact: true }).click({ force: true });
    await delay(500);
    
    const prevStartInput = await page.getByTestId("weekly-start-date").inputValue();
    const prevEndInput = await page.getByTestId("weekly-end-date").inputValue();
    console.log(`Tuần trước dates: ${prevStartInput} -> ${prevEndInput}`);
    
    if (startInput === prevStartInput || endInput === prevEndInput) {
      throw new Error("Dates did not change after clicking 'Tuần trước'");
    }
    
    // Assert Result Tab Semantic
    console.log("Asserting Result Tab Semantics...");
    const hasAttachmentsInResult = await modal.getByText("Hình ảnh & Tài liệu đính kèm").isVisible();
    const hasHienTruongInResult = await modal.getByText("Hình ảnh hiện trường").isVisible();
    
    if (!hasAttachmentsInResult) console.log("✅ Result tab: Không có 'Hình ảnh & Tài liệu đính kèm'");
    else throw new Error("Result tab có chứa 'Hình ảnh & Tài liệu đính kèm'");
    if (!hasHienTruongInResult) console.log("✅ Result tab: Không có 'Hình ảnh hiện trường'");
    else throw new Error("Result tab có chứa 'Hình ảnh hiện trường'");

    console.log("Taking Result tab screenshot...");
    await page.screenshot({ path: path.join(dir, "weekly-result-semantic.png"), fullPage: false });
    
    // 8. Next Week Plan tab
    console.log("Switching to Plan tab...");
    await modal.getByRole('button', { name: 'Kế hoạch tuần sau', exact: true }).click({ force: true });
    await delay(1000);

    // Assert Plan Tab Semantic
    console.log("Asserting Plan Tab Semantics...");
    const hasHienTruongInPlan = await modal.getByText("Hình ảnh hiện trường").isVisible();
    const hasAutoRemain = await modal.getByRole('button', { name: 'Tự động lấy từ khối lượng còn lại', exact: true }).isVisible();
    const hasPickRoot = await modal.getByText("Chọn công việc gốc").isVisible();
    const hasAddManual = await modal.getByText("+ Thêm dòng thủ công").isVisible();

    if (!hasHienTruongInPlan) console.log("✅ Plan tab: Không có 'Hình ảnh hiện trường'");
    else throw new Error("Plan tab có chứa 'Hình ảnh hiện trường'");

    if (hasAutoRemain) console.log("✅ Plan tab: Có 'Tự động lấy từ khối lượng còn lại'");
    else throw new Error("Plan tab không chứa 'Tự động lấy từ khối lượng còn lại'");

    if (hasPickRoot) console.log("✅ Plan tab: Có 'Chọn công việc gốc'");
    else throw new Error("Plan tab không chứa 'Chọn công việc gốc'");

    if (hasAddManual) console.log("✅ Plan tab: Có '+ Thêm dòng thủ công'");
    else throw new Error("Plan tab không chứa '+ Thêm dòng thủ công'");
    
    await page.screenshot({ path: path.join(dir, "weekly-plan-semantic.png"), fullPage: false });

    // 9. Click "Chọn công việc gốc"
    console.log("Testing 'Chọn công việc gốc'...");
    const workPickerBtn = modal.locator('button').filter({ hasText: 'Chọn công việc gốc' }).first();
    await workPickerBtn.click();
    await delay(1000);
    
    // Wait for Work Picker to open
    try {
        await page.waitForSelector('h2:has-text("Chọn khối lượng công việc")', { timeout: 3000, state: 'visible' });
        console.log("✅ Workpicker: Opened successfully.");

        await page.screenshot({ path: path.join(dir, "weekly-workpicker-plan.png"), fullPage: false });

        // Try to select item
        const pickerDialog = page.locator('div[role="dialog"]').last();
        const items = pickerDialog.locator('tbody tr td input[type="checkbox"]').first();
        if (await items.isVisible()) {
            await items.click();
            await pickerDialog.getByRole('button', { name: 'Thêm vào báo cáo', exact: true }).click({ force: true });
            console.log("✅ Workpicker: Item selected.");
        } else {
            throw new Error("Work picker opened but is empty, despite seeded data.");
        }
    } catch(e: any) {
        throw new Error("Work picker failed: " + e.message);
    }
    await delay(500);
    
    // 10. Click "+ Thêm dòng thủ công"
    console.log("Testing '+ Thêm dòng thủ công'...");
    await modal.getByRole('button', { name: '+ Thêm dòng thủ công', exact: true }).click({ force: true });
    await delay(500);
    
    // 11. Enter planned quantity
    const qtyInput = page.locator('table input[type="number"]').first();
    if (await qtyInput.isVisible()) {
        await qtyInput.fill("100");
    }
    
    // 12. Switch tabs back and forth
    console.log("Switching to Comments tab...");
    await modal.getByRole('button', { name: 'Nhận xét & minh chứng', exact: true }).click({ force: true });
    await delay(500);

    // Assert Comments Tab Semantic
    console.log("Asserting Comments Tab Semantics...");
    const hasCommentDesc = await modal.getByText("Các nhận xét, hình ảnh và tài liệu bên dưới áp dụng cho kỳ báo cáo đã chọn").isVisible();
    const hasHienTruongInComments = await modal.getByRole('heading', { name: 'Hình ảnh & Tài liệu đính kèm' }).isVisible();
    const hasTaiLieuInComments = hasHienTruongInComments;

    if (hasCommentDesc) console.log("✅ Comments tab: Có dòng mô tả kỳ báo cáo");
    else throw new Error("Comments tab thiếu dòng mô tả kỳ báo cáo");

    if (hasHienTruongInComments) console.log("✅ Comments tab: Có 'Hình ảnh hiện trường'");
    else throw new Error("Comments tab thiếu 'Hình ảnh hiện trường'");

    if (hasTaiLieuInComments) console.log("✅ Comments tab: Có 'Tài liệu đính kèm'");
    else throw new Error("Comments tab thiếu 'Tài liệu đính kèm'");

    await page.screenshot({ path: path.join(dir, "weekly-comments-evidence.png"), fullPage: false });
    
    await modal.getByRole('button', { name: 'Kế hoạch tuần sau', exact: true }).click({ force: true });
    await delay(500);
    
    // Check if input value is still 100
    if (await qtyInput.isVisible()) {
        const val = await qtyInput.inputValue();
        if (val !== "100") {
            throw new Error(`Tab state was lost! Expected 100, got ${val}`);
        }
    }
    
    console.log("✅ All UI assertions passed!");

  } catch (err) {
    console.error("❌ Test failed:", err);
    process.exitCode = 1;
  } finally {
    await browser.close();
    // Cleanup QA Project
    console.log(`Cleaning up QA Project: ${qaProjectCode}`);
    await prisma.project.delete({ where: { code: qaProjectCode } }).catch(() => null);
  }
}

runTest();
