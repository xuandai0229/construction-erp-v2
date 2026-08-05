import { chromium } from "playwright";
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { Client } from "pg";

require("dotenv").config();

const SCREENSHOT_DIR = join(process.cwd(), "docs/qa/screenshots");
if (!existsSync(SCREENSHOT_DIR)) {
  mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

interface TestResult {
  module: "Supervision" | "Safety";
  routeName: string;
  url: string;
  role: string;
  httpStatus: number;
  consoleErrors: string[];
  networkErrors: string[];
  screenshotPath: string;
  readWriteResult: "READ_SUCCESS" | "WRITE_SUCCESS_E2E" | "FAIL";
}

async function main() {
  console.log("=== RUNTIME REGRESSION TESTING: SUPERVISION & SAFETY MODULES ===");

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const userRes = await client.query(`SELECT id, email, role FROM "User" WHERE role = 'ADMIN' LIMIT 1;`);
  const adminUser = userRes.rows[0];

  const supDossier = (await client.query(`SELECT id FROM "SupervisionWeeklyDossier" LIMIT 1;`)).rows[0];
  const safetyPlan = (await client.query(`SELECT id FROM "SafetyReportPlan" LIMIT 1;`)).rows[0];
  const selfAssessment = (await client.query(`SELECT id FROM "SafetySelfAssessmentReport" LIMIT 1;`)).rows[0];
  const weeklyFile = (await client.query(`SELECT id FROM "SafetyWeeklyFile" LIMIT 1;`)).rows[0];

  await client.end();

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const consoleErrors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });

  const networkErrors: string[] = [];
  page.on("response", (res) => {
    if (res.status() >= 400) {
      networkErrors.push(`${res.status()} ${res.url()}`);
    }
  });

  // 1. Authenticate
  await page.goto("http://localhost:3000/login");
  await page.fill("input[name='email']", adminUser.email);
  await page.fill("input[name='password']", "123456");
  await page.click("button[type='submit']");
  await page.waitForURL((url) => !url.toString().includes("/login"), { timeout: 10000 });
  console.log(`[Login Successful] Logged in as ${adminUser.email}`);

  const results: TestResult[] = [];

  // Helper function to test route
  async function testRoute(
    module: "Supervision" | "Safety",
    routeName: string,
    targetUrl: string,
    screenshotName: string
  ) {
    console.log(`\nTesting ${module} -> ${routeName} (${targetUrl})...`);
    consoleErrors.length = 0;
    networkErrors.length = 0;

    let httpStatus = 200;
    try {
      const response = await page.goto(targetUrl, { waitUntil: "commit", timeout: 10000 });
      await page.waitForTimeout(1000);
      httpStatus = response?.status() || 200;
    } catch (err: any) {
      if (err.message.includes("ERR_ABORTED") || err.message.includes("download")) {
        console.log(`[File Download / Stream triggered for ${routeName}]`);
        httpStatus = 200;
      } else {
        httpStatus = 500;
      }
    }
    const screenshotPath = join(SCREENSHOT_DIR, screenshotName);
    try {
      await page.screenshot({ path: screenshotPath, timeout: 5000 });
    } catch {
      // Ignore screenshot timeout if page is heavy or streaming
    }

    const isSuccess = httpStatus >= 200 && httpStatus < 400;

    results.push({
      module,
      routeName,
      url: targetUrl,
      role: adminUser.role,
      httpStatus,
      consoleErrors: [...consoleErrors],
      networkErrors: [...networkErrors],
      screenshotPath,
      readWriteResult: isSuccess ? "READ_SUCCESS" : "FAIL",
    });

    console.log(`[${module}] ${routeName} -> Status: ${httpStatus} | Errors: ${consoleErrors.length}`);
  }

  // --- SUPERVISION TESTS ---
  await testRoute("Supervision", "Danh sách hồ sơ giám sát", "http://localhost:3000/supervision/weekly", "regression-supervision-list.png");
  if (supDossier) {
    await testRoute("Supervision", "Chi tiết hồ sơ giám sát", `http://localhost:3000/supervision/weekly/${supDossier.id}`, "regression-supervision-detail.png");
    await testRoute("Supervision", "Xem trước (Preview) hồ sơ giám sát", `http://localhost:3000/supervision/weekly/${supDossier.id}/preview`, "regression-supervision-preview.png");
  }

  // --- SAFETY TESTS ---
  await testRoute("Safety", "Trang quản lý báo cáo An toàn", "http://localhost:3000/reports/safety", "regression-safety-hub.png");
  await testRoute("Safety", "Danh sách kế hoạch an toàn", "http://localhost:3000/reports/safety/plans", "regression-safety-plans.png");
  if (safetyPlan) {
    await testRoute("Safety", "Chi tiết kế hoạch an toàn", `http://localhost:3000/reports/safety/plans/${safetyPlan.id}`, "regression-safety-plan-detail.png");
    await testRoute("Safety", "Xem trước kế hoạch an toàn", `http://localhost:3000/reports/safety/plans/${safetyPlan.id}/preview`, "regression-safety-plan-preview.png");
  }

  await testRoute("Safety", "Danh sách báo cáo tự đánh giá an toàn", "http://localhost:3000/reports/safety/self-assessments", "regression-safety-self-assessments.png");
  if (selfAssessment) {
    await testRoute("Safety", "Chi tiết báo cáo tự đánh giá", `http://localhost:3000/reports/safety/self-assessments/${selfAssessment.id}`, "regression-safety-self-detail.png");
    await testRoute("Safety", "Xem trước báo cáo tự đánh giá", `http://localhost:3000/reports/safety/self-assessments/${selfAssessment.id}/preview`, "regression-safety-self-preview.png");
  }

  if (weeklyFile) {
    await testRoute("Safety", "Chi tiết hồ sơ tuần an toàn", `http://localhost:3000/reports/safety/weekly-files/${weeklyFile.id}`, "regression-safety-weekly-file.png");
  }

  await browser.close();

  const reportPath = join(process.cwd(), "docs/qa/backups/phase07/supervision-safety-regression-results.json");
  writeFileSync(reportPath, JSON.stringify(results, null, 2), "utf-8");

  console.log("\n=== REGRESSION RESULTS SUMMARY ===");
  console.table(
    results.map((r) => ({
      module: r.module,
      routeName: r.routeName,
      status: r.httpStatus,
      readWrite: r.readWriteResult,
      consoleErrors: r.consoleErrors.length,
    }))
  );
}

main().catch(console.error);
