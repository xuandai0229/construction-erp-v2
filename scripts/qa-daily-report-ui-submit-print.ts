import "dotenv/config";

import fs from "fs";
import path from "path";
import { chromium, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const BASE_URL = process.env.QA_BASE_URL || "http://localhost:3000";
const PROJECT_CODE = "CT-TAYHO-2026-001";
const QA_TAG = "QA_DAILY_REPORT_FULL_CLEAN_SUBMIT_PRINT_VERIFY_2026_07_04";
const PASSWORD = process.env.QA_REPORT_PASSWORD || "xuandai0229";
const EMAIL = process.env.QA_REPORT_USER || "daicongtu2910@gmail.com";
const DOC_PATH = path.join(process.cwd(), "docs", "qa", "DAILY_REPORT_UI_SUBMIT_PRINT_VERIFY_2026_07_04.md");

function requireEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

const pool = new Pool({ connectionString: requireEnv("DATABASE_URL") });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

function vietnamTime(date: Date) {
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function vietnamDate(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

async function latestQaReport(projectId: string) {
  return prisma.siteReport.findFirst({
    where: {
      projectId,
      deletedAt: null,
      OR: [
        { labor: { contains: QA_TAG } },
        { materials: { contains: QA_TAG } },
        { quality: { contains: QA_TAG } },
        { issues: { contains: QA_TAG } },
        { recommendations: { contains: QA_TAG } },
        { lines: { some: { note: { contains: QA_TAG } } } },
      ],
    },
    include: {
      project: true,
      createdBy: true,
      lines: { orderBy: { sortOrder: "asc" } },
      attachments: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

async function main() {
  console.log("QA UI: start");
  const project = await prisma.project.findUnique({
    where: { code: PROJECT_CODE },
    include: { fieldProgressItems: { where: { deletedAt: null, itemType: "WORK" }, orderBy: { sortOrder: "asc" } } },
  });
  if (!project || project.deletedAt) throw new Error(`Missing project ${PROJECT_CODE}`);
  if (project.fieldProgressItems.length < 2) throw new Error("Need at least two work items.");

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));

  const loginResponse = await page.request.post(`${BASE_URL}/api/auth/login`, {
    data: { email: EMAIL, password: PASSWORD },
  });
  if (!loginResponse.ok()) {
    throw new Error(`Login API failed: ${loginResponse.status()} ${await loginResponse.text()}`);
  }
  console.log("QA UI: logged in");

  await page.goto(`${BASE_URL}/reports?projectId=${project.id}`, { waitUntil: "domcontentloaded" });
  console.log("QA UI: opened reports");
  await expect(page.getByRole("button", { name: "Tạo báo cáo mới" })).toBeVisible();
  await page.getByRole("button", { name: "Tạo báo cáo mới" }).click();
  await expect(page.getByText("Tạo báo cáo mới").last()).toBeVisible();
  console.log("QA UI: opened create dialog");

  await page.locator("select").first().selectOption(project.id);
  await page.locator('input[type="date"]').fill("2026-07-04");
  await page.locator('input[type="time"]').fill("08:30");
  await page.locator('input[placeholder="VD: 32"]').fill("32");
  await page.locator('input[placeholder="VD: 21.0285, 105.8542"]').fill("21.0285, 105.8542");

  await page.locator('textarea[placeholder="VD: 12 công nhân, 1 chỉ huy, 2 máy trộn, 1 cẩu tháp..."]').fill(
    `18 công nhân, 02 kỹ sư hiện trường, 01 chỉ huy trưởng, 01 máy trộn, 01 máy đầm. ${QA_TAG}`,
  );
  await page.locator('textarea[placeholder="VD: Thép D16 1.2 tấn, xi măng PCB40 40 bao..."]').fill(
    `Thép D16, xi măng PCB40, cát vàng, đá 1x2. ${QA_TAG}`,
  );
  await page.locator('textarea[placeholder="Đánh giá chất lượng công việc hôm nay..."]').fill(
    `Thi công đạt yêu cầu kỹ thuật, kiểm tra cao độ và kích thước theo bản vẽ. ${QA_TAG}`,
  );
  await page.locator('textarea[placeholder="Các vấn đề phát sinh, sự cố..."]').fill(
    `Khu vực tập kết vật tư còn hẹp, cần điều phối xe giao hàng theo khung giờ. ${QA_TAG}`,
  );
  await page.locator('textarea[placeholder="Đề xuất xử lý, yêu cầu hỗ trợ..."]').fill(
    `Đề nghị bổ sung vật tư trước 17h và cập nhật ảnh hiện trường cuối ngày. ${QA_TAG}`,
  );
  console.log("QA UI: filled general fields");

  await page.getByRole("button", { name: "Thêm khối lượng" }).first().click();
  await expect(page.getByText("Chọn khối lượng công việc")).toBeVisible();
  await page.locator("tr", { hasText: "FP-CB-001" }).locator('input[type="checkbox"]').check();
  await page.locator("tr", { hasText: "FP-CB-002" }).locator('input[type="checkbox"]').check();
  await page.getByRole("button", { name: "Thêm vào báo cáo" }).click();
  await expect(page.getByText("Chọn khối lượng công việc")).toBeHidden();
  console.log("QA UI: selected work items");

  const selectedWorkRowCount = await page.locator("#work-lines-section tbody tr").count();
  if (selectedWorkRowCount !== 2) {
    throw new Error(`Expected exactly 2 selected work rows, got ${selectedWorkRowCount}`);
  }

  await page.locator("tr", { hasText: "FP-CB-001" }).locator('input[type="number"]').fill("44");
  await page.locator("tr", { hasText: "FP-CB-001" }).locator('input[placeholder="Vị trí..."]').fill(
    `${QA_TAG} - kiểm tra khối lượng 44`,
  );
  await page.locator("tr", { hasText: "FP-CB-002" }).locator('input[type="number"]').fill("12.5");
  await page.locator("tr", { hasText: "FP-CB-002" }).locator('input[placeholder="Vị trí..."]').fill(
    `${QA_TAG} - kiểm tra khối lượng 12.5`,
  );
  console.log("QA UI: filled work lines");

  await page.getByRole("button", { name: "Lưu nháp" }).click();
  await expect(page.getByText("Đã lưu nháp báo cáo")).toBeVisible({ timeout: 10000 });
  console.log("QA UI: saved draft");

  let report = await latestQaReport(project.id);
  if (!report) throw new Error("Draft report was not created.");
  if (report.status !== "DRAFT") throw new Error(`Expected draft before submit, got ${report.status}`);
  if (vietnamTime(report.reportDate) !== "08:30") {
    throw new Error(`Draft time mismatch. Expected 08:30, got ${vietnamTime(report.reportDate)}`);
  }
  console.log(`QA UI: draft DB ok ${report.id}`);

  await page.goto(`${BASE_URL}/reports?projectId=${project.id}&reportId=${report.id}`, { waitUntil: "domcontentloaded" });
  await expect(page.locator("body")).toContainText(report.reportNo.slice(0, 8).toUpperCase(), { timeout: 10000 });
  await page.getByRole("button", { name: "Gửi báo cáo" }).last().click();
  await expect(page.getByText("Đã gửi báo cáo thành công")).toBeVisible({ timeout: 10000 });
  console.log("QA UI: submitted report");

  report = await latestQaReport(project.id);
  if (!report) throw new Error("Submitted report missing.");
  if (report.status !== "SUBMITTED") throw new Error(`Expected SUBMITTED, got ${report.status}`);

  const entries = await prisma.fieldProgressEntry.findMany({
    where: { projectId: project.id, deletedAt: null, note: { contains: `[SOURCE:SITE_REPORT:${report.id}]` } },
    include: { item: true },
    orderBy: { createdAt: "asc" },
  });
  if (entries.length !== 2) throw new Error(`Expected 2 synced entries, got ${entries.length}`);
  console.log("QA UI: DB sync ok");

  await page.goto(`${BASE_URL}/print/reports/${report.id}`, { waitUntil: "domcontentloaded" });
  await expect(page.locator(".print-area")).toBeVisible({ timeout: 10000 });
  console.log("QA UI: opened print page");
  const printText = await page.locator(".print-area").innerText();
  const printChecks = [
    ["Tiêu đề báo cáo", "BÁO CÁO THI CÔNG NGÀY", printText.includes("BÁO CÁO THI CÔNG NGÀY")],
    ["Công ty", "CÔNG TY CỔ PHẦN XÂY DỰNG", printText.includes("CÔNG TY CỔ PHẦN XÂY DỰNG")],
    ["Quốc hiệu / tiêu ngữ", "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM", printText.includes("CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM")],
    ["Công trình", project.name, printText.includes(project.name)],
    ["Thời gian báo cáo", "04/07/2026", printText.includes("04/07/2026")],
    ["Thời tiết", "Nắng (32°C)", printText.includes("Nắng") && printText.includes("32")],
    ["GPS", "21.0285, 105.8542", printText.includes("21.0285, 105.8542")],
    ["Công việc 1", "Lắp dựng hàng rào tôn", printText.includes("Lắp dựng hàng rào tôn")],
    ["Quantity 44", "44", printText.includes("44")],
    ["Công việc 2", "Lắp đặt nhà tạm", printText.includes("Lắp đặt nhà tạm")],
    ["Quantity 12.5", "12,5", printText.includes("12,5") || printText.includes("12.5")],
    ["Nhân công / Máy móc", "18 công nhân", printText.includes("18 công nhân")],
    ["Vật tư sử dụng", "Thép D16", printText.includes("Thép D16")],
    ["Chất lượng", "Thi công đạt yêu cầu kỹ thuật", printText.includes("Thi công đạt yêu cầu kỹ thuật")],
    ["Vướng mắc", "Khu vực tập kết vật tư", printText.includes("Khu vực tập kết vật tư")],
    ["Kiến nghị", "Đề nghị bổ sung vật tư", printText.includes("Đề nghị bổ sung vật tư")],
    ["Chữ ký", "Người lập báo cáo", printText.includes("Người lập báo cáo")],
    ["Không lộ QA tag", QA_TAG, !printText.includes(QA_TAG)],
    ["Không lộ SOURCE marker", "[SOURCE:SITE_REPORT:", !printText.includes("[SOURCE:SITE_REPORT:")],
    ["Không lộ enum role", "ADMIN", !printText.includes("ADMIN")],
  ] as const;

  const failedPrintChecks = printChecks.filter(([, , pass]) => !pass);
  if (failedPrintChecks.length > 0) {
    throw new Error(`Print checks failed: ${failedPrintChecks.map(([field]) => field).join(", ")}`);
  }

  const duplicateSameDay = await prisma.fieldProgressEntry.groupBy({
    by: ["itemId", "entryDate"],
    where: { projectId: project.id, deletedAt: null, status: { not: "CANCELLED" } },
    _count: { id: true },
    having: { id: { _count: { gt: 1 } } },
  });

  const doc = [
    "# Daily Report UI Submit Print Verify 2026-07-04",
    "",
    `- Report id: ${report.id}`,
    `- Report no: ${report.reportNo}`,
    `- Status: ${report.status}`,
    `- Date/time: ${vietnamDate(report.reportDate)} ${vietnamTime(report.reportDate)}`,
    `- Synced entries: ${entries.length}`,
    `- Duplicate active same day/item: ${duplicateSameDay.length}`,
    `- Console errors: ${consoleErrors.length}`,
    "- Attachment upload: SKIP - Playwright script intentionally did not upload a dummy file; upload API is already covered separately and this run focused on submit/print/progress.",
    "",
    "| Field | Dữ liệu nhập | Bản in | Kết quả |",
    "|---|---|---|---|",
    ...printChecks.map(([field, expected, pass]) => `| ${field} | ${expected} | ${pass ? "Khớp" : "Sai"} | ${pass ? "PASS" : "FAIL"} |`),
    "",
    "## DB work lines",
    "",
    "| Work content | Quantity | Unit | Note |",
    "|---|---:|---|---|",
    ...report.lines.map((line) => `| ${line.workContent} | ${line.quantityToday} | ${line.unit || ""} | ${line.note || ""} |`),
    "",
    "## Synced entries",
    "",
    "| Item code | Quantity | Status | Note |",
    "|---|---:|---|---|",
    ...entries.map((entry) => `| ${entry.item.code} | ${entry.quantity} | ${entry.status} | ${entry.note || ""} |`),
    "",
  ].join("\n");
  fs.mkdirSync(path.dirname(DOC_PATH), { recursive: true });
  fs.writeFileSync(DOC_PATH, doc, "utf8");

  await browser.close();

  console.log(JSON.stringify({
    reportId: report.id,
    reportNo: report.reportNo,
    status: report.status,
    vietnamDate: vietnamDate(report.reportDate),
    vietnamTime: vietnamTime(report.reportDate),
    workLineCount: report.lines.length,
    entryCount: entries.length,
    duplicateSameDayCount: duplicateSameDay.length,
    printChecks: printChecks.length,
    consoleErrors,
    docPath: DOC_PATH,
  }, null, 2));
}

main()
  .catch(async (error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
