import { chromium } from "playwright";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";
import assert from "assert";
import fs from "fs";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function setupQAData() {
  const user = await prisma.user.findFirst({ where: { email: "daicongtu2910@gmail.com" } });
  if (!user) throw new Error("daicongtu2910@gmail.com not found");

  const project = await prisma.project.create({
    data: {
      code: "QA-WEEKLY-UI-" + Date.now(),
      name: "QA Weekly UI Test Project",
      status: "ACTIVE",
    }
  });

  const template = await prisma.fieldProgressTemplate.create({
    data: {
      projectId: project.id,
      name: "QA Template",
      createdById: user.id,
    }
  });

  const item = await prisma.fieldProgressItem.create({
    data: {
      projectId: project.id,
      templateId: template.id,
      workContent: "Test Design UI 180",
      designQuantity: 180,
      unit: "m3",
      createdById: user.id,
    }
  });

  // Today is the test date. So we'll use today as the "Week day 3"
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  
  // Create an approved daily report for today
  await prisma.siteReport.create({
    data: {
      projectId: project.id,
      type: "DAILY",
      reportDate: now,
      status: "APPROVED",
      createdById: user.id,
      lines: {
        create: [{
          projectId: project.id,
          fieldProgressItemId: item.id,
          workContent: item.workContent!,
          quantityToday: 50,
          designQuantity: 180,
          quantityBefore: 44,
          quantityCumulative: 94,
        }]
      }
    }
  });

  return { project, user };
}

async function main() {
  console.log("Setting up DB for UI test...");
  const { project, user } = await setupQAData();

  if (!fs.existsSync("docs/qa/screenshots")) {
    fs.mkdirSync("docs/qa/screenshots", { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });

  try {
    console.log("Logging in...");
    await page.goto("http://localhost:3000/login", { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);
    await page.fill('input[name="email"]', user.email);
    await page.fill('input[name="password"]', "123456");
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000); // Wait for redirect to happen
    if (page.url().includes("/login")) {
      const errorText = await page.locator(".text-red-500, .bg-red-50").innerText().catch(() => "No error text found");
      await page.screenshot({ path: "docs/qa/screenshots/login-failed.png" });
      throw new Error(`Login failed. URL: ${page.url()}. UI Error: ${errorText}. See docs/qa/screenshots/login-failed.png`);
    }

    console.log("Navigating to reports...");
    await page.goto("http://localhost:3000/reports", { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: "docs/qa/screenshots/reports-page.png" });

    // Click on anything containing "Tạo báo cáo"
    const createBtn = page.locator('button:has-text("Tạo báo cáo")').first();
    await createBtn.click();
    
    // Wait for modal
    const dialog = page.locator('[role="dialog"], .dialog, .modal').first();
    await dialog.waitFor({ state: "visible", timeout: 10000 });
    
    // Select Weekly Tab
    await page.locator('button:has-text("Báo cáo tuần")').click();

    // Select Project
    await page.locator('select').first().selectOption({ label: "QA Weekly UI Test Project" });
    await page.waitForTimeout(1000); // Wait for summary to load

    // Click "Tuần này" or "Trong tuần"
    const inWeekBtn = page.locator('button:has-text("Tuần này"), button:has-text("Trong tuần")').first();
    await inWeekBtn.click();
    await page.waitForTimeout(2000);

    // Verify UI Elements
    await page.screenshot({ path: "docs/qa/screenshots/weekly-form.png" });
    console.log("Weekly form screenshot saved.");

    const textContent = await dialog.innerText();
    assert(textContent.includes("Tuần báo cáo"), "Missing Tuần báo cáo section");
    assert(textContent.includes("Dữ liệu báo cáo ngày trong tuần"), "Missing Day summary section");
    assert(textContent.includes("Tổng hợp khối lượng tuần"), "Missing Volume table");
    
    // Check Columns
    assert(textContent.includes("Thiết kế"), "Missing Design column");
    assert(textContent.includes("Trước tuần"), "Missing Before week column");
    assert(textContent.includes("Tuần này"), "Missing In week column");
    assert(textContent.includes("Lũy kế"), "Missing Cumulative column");
    assert(textContent.includes("Còn lại"), "Missing Remaining column");
    assert(textContent.includes("% HT"), "Missing Percent column");
    assert(textContent.includes("Ngày phát sinh"), "Missing Dates column");
    assert(textContent.includes("Nhận xét tổng hợp tuần"), "Missing General summary");

    // Click Lưu nháp to create weekly report
    await page.getByRole("button", { name: /Lưu nháp/i }).click();
    await page.waitForTimeout(2000);

    // Wait for drawer / redirect
    // Find the newly created report in the list and click it
    console.log("Finding the created report...");
    await page.goto("http://localhost:3000/reports?tab=weekly", { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);
    const reportRow = page.locator('table tbody tr').first();
    await reportRow.click();
    
    // Wait for drawer
    await page.waitForSelector('.drawer-content', { timeout: 10000 });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: "docs/qa/screenshots/weekly-preview.png" });
    console.log("Weekly preview screenshot saved.");

    // Check Drawer Content
    const drawerContent = await page.locator('.drawer-content').innerText();
    assert(drawerContent.includes("Thiết kế"), "Drawer Missing Design column");
    assert(drawerContent.includes("Lũy kế trước"), "Drawer Missing Before week column");
    assert(drawerContent.includes("Tuần này"), "Drawer Missing In week column");
    
    console.log("Checking print preview...");
    await page.getByRole("button", { name: /Bản in/i }).click();
    await page.waitForTimeout(2000);
    
    // We might be in a new tab or modal
    await page.screenshot({ path: "docs/qa/screenshots/weekly-print.png" });
    console.log("Weekly print screenshot saved.");

    console.log("✅ Playwright UAT Weekly Passed!");
  } catch (error) {
    console.error("❌ Playwright UAT Failed:", error);
    process.exit(1);
  } finally {
    await browser.close();
    
    console.log("Cleaning up DB...");
    await prisma.project.delete({ where: { id: project.id } });
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
