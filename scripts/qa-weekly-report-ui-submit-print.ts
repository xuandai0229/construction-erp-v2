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
const EMAIL = process.env.QA_REPORT_USER || "daicongtu2910@gmail.com";
const PASSWORD = process.env.QA_REPORT_PASSWORD || "xuandai0229";
const DOC_PATH = path.join(process.cwd(), "docs", "qa", "WEEKLY_REPORT_UI_SUBMIT_PRINT_VERIFY_2026_07_04.md");

function requireEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

const pool = new Pool({ connectionString: requireEnv("DATABASE_URL") });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function startOfVietnamWeek(date: Date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() - day + 1);
  return d;
}

function endOfVietnamWeek(start: Date) {
  const d = new Date(start);
  d.setUTCDate(d.getUTCDate() + 6);
  return d;
}

async function findCandidateWeek(projectId: string) {
  const approvedDaily = await prisma.siteReport.findMany({
    where: { projectId, type: "DAILY", status: "APPROVED", deletedAt: null },
    orderBy: { reportDate: "asc" },
    select: { reportDate: true },
  });
  for (const daily of approvedDaily) {
    const start = startOfVietnamWeek(daily.reportDate);
    const end = endOfVietnamWeek(start);
    const existingWeekly = await prisma.siteReport.findFirst({
      where: { projectId, type: "WEEKLY", weekStartDate: start, weekEndDate: end, deletedAt: null },
      select: { id: true },
    });
    if (!existingWeekly) return { start: toIsoDate(start), end: toIsoDate(end) };
  }
  throw new Error("No approved daily report week without existing weekly report.");
}

async function latestQaWeekly(projectId: string) {
  return prisma.siteReport.findFirst({
    where: {
      projectId,
      type: "WEEKLY",
      deletedAt: null,
      OR: [
        { summary: { contains: QA_TAG } },
        { labor: { contains: QA_TAG } },
        { materials: { contains: QA_TAG } },
        { quality: { contains: QA_TAG } },
        { issues: { contains: QA_TAG } },
        { recommendations: { contains: QA_TAG } },
      ],
    },
    include: { lines: { orderBy: { sortOrder: "asc" } } },
    orderBy: { createdAt: "desc" },
  });
}

async function main() {
  console.log("QA weekly: start");
  const project = await prisma.project.findUnique({ where: { code: PROJECT_CODE } });
  if (!project || project.deletedAt) throw new Error(`Missing project ${PROJECT_CODE}`);
  const week = await findCandidateWeek(project.id);
  console.log(`QA weekly: candidate ${week.start}_${week.end}`);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });

  const loginResponse = await page.request.post(`${BASE_URL}/api/auth/login`, {
    data: { email: EMAIL, password: PASSWORD },
  });
  if (!loginResponse.ok()) throw new Error(`Login API failed: ${loginResponse.status()}`);

  await page.goto(`${BASE_URL}/reports?projectId=${project.id}`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Tạo báo cáo mới" }).click();
  await expect(page.getByText("Tạo báo cáo mới").last()).toBeVisible();
  await page.getByRole("button", { name: "Báo cáo tuần" }).last().click();

  await page.locator("select").first().selectOption(project.id);
  await page.locator('input[type="date"]').first().fill(week.end);
  await page.locator('input[type="date"]').nth(1).fill(week.start);
  await page.locator('input[type="date"]').nth(2).fill(week.end);
  await page.locator('textarea[placeholder="Tổng hợp tiến độ, chất lượng và các nội dung nổi bật trong tuần..."]').fill(
    `Tổng hợp tuần: các hạng mục đã duyệt được thực hiện đúng kế hoạch. ${QA_TAG}`,
  );
  await page.locator('textarea[placeholder="VD: 12 công nhân, 1 chỉ huy, 2 máy trộn, 1 cẩu tháp..."]').fill(
    `Nguồn lực tuần ổn định, tăng cường kiểm soát hiện trường. ${QA_TAG}`,
  );
  await page.locator('textarea[placeholder="VD: Thép D16 1.2 tấn, xi măng PCB40 40 bao..."]').fill(
    `Vật tư tuần được cấp đủ theo kế hoạch. ${QA_TAG}`,
  );
  await page.locator('textarea[placeholder="Đánh giá chất lượng công việc hôm nay..."]').fill(
    `Chất lượng tuần đạt yêu cầu nghiệm thu nội bộ. ${QA_TAG}`,
  );
  await page.locator('textarea[placeholder="Các vấn đề phát sinh, sự cố..."]').fill(
    `Không có sự cố nghiêm trọng, tiếp tục theo dõi điều phối vật tư. ${QA_TAG}`,
  );
  await page.locator('textarea[placeholder="Đề xuất xử lý, yêu cầu hỗ trợ..."]').fill(
    `Đề nghị duy trì nhịp nghiệm thu và cập nhật ảnh hiện trường cuối tuần. ${QA_TAG}`,
  );

  await page.getByRole("button", { name: "Lưu nháp" }).click();
  await expect(page.getByText("Đã lưu nháp báo cáo")).toBeVisible({ timeout: 10000 });
  let report = await latestQaWeekly(project.id);
  if (!report) throw new Error("Weekly draft was not created.");
  if (report.status !== "DRAFT") throw new Error(`Expected weekly draft, got ${report.status}`);
  console.log(`QA weekly: draft ${report.id}`);

  await page.goto(`${BASE_URL}/reports?projectId=${project.id}&reportId=${report.id}`, { waitUntil: "domcontentloaded" });
  await expect(page.locator("body")).toContainText(report.reportNo.slice(0, 8).toUpperCase(), { timeout: 10000 });
  await page.getByRole("button", { name: "Gửi báo cáo" }).last().click();
  await expect(page.getByText("Đã gửi báo cáo thành công")).toBeVisible({ timeout: 10000 });
  report = await latestQaWeekly(project.id);
  if (!report || report.status !== "SUBMITTED") throw new Error(`Expected weekly SUBMITTED, got ${report?.status}`);
  console.log("QA weekly: submitted");

  await page.goto(`${BASE_URL}/print/reports/${report.id}`, { waitUntil: "domcontentloaded" });
  await expect(page.locator(".print-area")).toBeVisible({ timeout: 10000 });
  const printText = await page.locator(".print-area").innerText();
  const checks = [
    ["Tiêu đề", "BÁO CÁO KẾT QUẢ TUẦN", printText.includes("BÁO CÁO KẾT QUẢ TUẦN")],
    ["Khoảng ngày", `${week.start} - ${week.end}`, printText.includes(week.start.split("-").reverse().join("/")) && printText.includes(week.end.split("-").reverse().join("/"))],
    ["Tổng hợp tuần", "Tổng hợp tuần", printText.includes("Tổng hợp tuần")],
    ["Nguồn lực tuần", "Nguồn lực tuần ổn định", printText.includes("Nguồn lực tuần ổn định")],
    ["Vật tư tuần", "Vật tư tuần được cấp đủ", printText.includes("Vật tư tuần được cấp đủ")],
    ["Chất lượng tuần", "Chất lượng tuần đạt yêu cầu", printText.includes("Chất lượng tuần đạt yêu cầu")],
    ["Kiến nghị tuần", "Đề nghị duy trì", printText.includes("Đề nghị duy trì")],
    ["Chữ ký", "Người lập báo cáo", printText.includes("Người lập báo cáo")],
    ["Không lộ QA tag", QA_TAG, !printText.includes(QA_TAG)],
    ["Không lộ enum role", "ADMIN", !printText.includes("ADMIN")],
  ] as const;
  const failed = checks.filter(([, , pass]) => !pass);
  if (failed.length) throw new Error(`Weekly print checks failed: ${failed.map(([field]) => field).join(", ")}`);

  const doc = [
    "# Weekly Report UI Submit Print Verify 2026-07-04",
    "",
    `- Report id: ${report.id}`,
    `- Report no: ${report.reportNo}`,
    `- Status: ${report.status}`,
    `- Week: ${week.start} - ${week.end}`,
    `- Lines aggregated: ${report.lines.length}`,
    "",
    "| Field | Expected | Print | Result |",
    "|---|---|---|---|",
    ...checks.map(([field, expected, pass]) => `| ${field} | ${expected} | ${pass ? "Khớp" : "Sai"} | ${pass ? "PASS" : "FAIL"} |`),
    "",
  ].join("\n");
  fs.mkdirSync(path.dirname(DOC_PATH), { recursive: true });
  fs.writeFileSync(DOC_PATH, doc, "utf8");

  await browser.close();
  console.log(JSON.stringify({
    reportId: report.id,
    reportNo: report.reportNo,
    status: report.status,
    week,
    lineCount: report.lines.length,
    printChecks: checks.length,
    docPath: DOC_PATH,
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
