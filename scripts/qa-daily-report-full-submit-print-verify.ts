import "dotenv/config";

import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const QA_TAG = "QA_DAILY_REPORT_FULL_CLEAN_SUBMIT_PRINT_VERIFY_2026_07_04";
const PROJECT_CODE = "CT-TAYHO-2026-001";
const DOC_PATH = path.join(process.cwd(), "docs", "qa", "DAILY_REPORT_DB_VERIFY_2026_07_04.md");

function requireEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

const pool = new Pool({ connectionString: requireEnv("DATABASE_URL") });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

function md(value: unknown) {
  return String(value ?? "").replace(/\r?\n/g, "<br>").replace(/\|/g, "\\|");
}

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

async function main() {
  const reports = await prisma.siteReport.findMany({
    where: {
      deletedAt: null,
      project: { code: PROJECT_CODE },
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

  const report = reports[0];
  if (!report) throw new Error("No QA report found.");

  const entries = await prisma.fieldProgressEntry.findMany({
    where: {
      projectId: report.projectId,
      deletedAt: null,
      note: { contains: `[SOURCE:SITE_REPORT:${report.id}]` },
    },
    include: { item: true },
    orderBy: { createdAt: "asc" },
  });

  const duplicateSameDay = await prisma.fieldProgressEntry.groupBy({
    by: ["itemId", "entryDate"],
    where: {
      projectId: report.projectId,
      deletedAt: null,
      status: { not: "CANCELLED" },
    },
    _count: { id: true },
    having: { id: { _count: { gt: 1 } } },
  });

  const rows = [
    ["Project", PROJECT_CODE, report.project.code, report.project.code === PROJECT_CODE ? "PASS" : "FAIL"],
    ["Report type", "DAILY", report.type, report.type === "DAILY" ? "PASS" : "FAIL"],
    ["Status", "SUBMITTED", report.status, report.status === "SUBMITTED" ? "PASS" : "FAIL"],
    ["Report date", "2026-07-04", vietnamDate(report.reportDate), vietnamDate(report.reportDate) === "2026-07-04" ? "PASS" : "FAIL"],
    ["Report time", "08:30", vietnamTime(report.reportDate), vietnamTime(report.reportDate) === "08:30" ? "PASS" : "FAIL"],
    ["Weather", "SUNNY/Nắng", report.weatherCondition, report.weatherCondition === "SUNNY" ? "PASS" : "FAIL"],
    ["Temperature", "32", report.weatherTemperature, Number(report.weatherTemperature) === 32 ? "PASS" : "FAIL"],
    ["GPS lat", "21.0285", report.gpsLat, Number(report.gpsLat) === 21.0285 ? "PASS" : "FAIL"],
    ["GPS lng", "105.8542", report.gpsLng, Number(report.gpsLng) === 105.8542 ? "PASS" : "FAIL"],
    ["Work line count", "2", report.lines.length, report.lines.length === 2 ? "PASS" : "FAIL"],
    ["Quantity 44", "44", report.lines.find((line) => Number(line.quantityToday) === 44)?.quantityToday, report.lines.some((line) => Number(line.quantityToday) === 44) ? "PASS" : "FAIL"],
    ["Quantity 12.5", "12.5", report.lines.find((line) => Number(line.quantityToday) === 12.5)?.quantityToday, report.lines.some((line) => Number(line.quantityToday) === 12.5) ? "PASS" : "FAIL"],
    ["Labor", "contains QA labor", report.labor, report.labor?.includes("18 công nhân") ? "PASS" : "FAIL"],
    ["Materials", "contains QA materials", report.materials, report.materials?.includes("Thép D16") ? "PASS" : "FAIL"],
    ["Quality", "contains QA quality", report.quality, report.quality?.includes("Thi công đạt yêu cầu") ? "PASS" : "FAIL"],
    ["Issues", "contains QA issue", report.issues, report.issues?.includes("Khu vực tập kết") ? "PASS" : "FAIL"],
    ["Recommendations", "contains QA recommendation", report.recommendations, report.recommendations?.includes("Đề nghị bổ sung") ? "PASS" : "FAIL"],
    ["Synced progress entries", "2", entries.length, entries.length === 2 ? "PASS" : "FAIL"],
    ["Duplicate active entry same day/item", "0", duplicateSameDay.length, duplicateSameDay.length === 0 ? "PASS" : "FAIL"],
  ];

  const doc = [
    "# Daily Report DB Verify 2026-07-04",
    "",
    `- Report id: ${report.id}`,
    `- Report no: ${report.reportNo}`,
    `- Created by: ${report.createdBy.name} / ${report.createdBy.role}`,
    `- Attachments: ${report.attachments.length}`,
    "",
    "| Field | Dữ liệu đã nhập | DB lưu | Kết quả |",
    "|---|---|---|---|",
    ...rows.map((row) => `| ${row.map(md).join(" | ")} |`),
    "",
    "## Work lines",
    "",
    "| Item | Work content | Quantity | Unit | Note |",
    "|---|---|---:|---|---|",
    ...report.lines.map((line) => `| ${md(line.fieldProgressItemId)} | ${md(line.workContent)} | ${md(line.quantityToday)} | ${md(line.unit)} | ${md(line.note)} |`),
    "",
    "## Synced FieldProgressEntry",
    "",
    "| Entry | Item code | Quantity | Status | Date | Note |",
    "|---|---|---:|---|---|---|",
    ...entries.map((entry) => `| ${entry.id} | ${md(entry.item.code)} | ${md(entry.quantity)} | ${entry.status} | ${entry.entryDate.toISOString()} | ${md(entry.note)} |`),
    "",
  ].join("\n");

  fs.mkdirSync(path.dirname(DOC_PATH), { recursive: true });
  fs.writeFileSync(DOC_PATH, doc, "utf8");
  console.log(JSON.stringify({
    reportId: report.id,
    reportNo: report.reportNo,
    status: report.status,
    vietnamDate: vietnamDate(report.reportDate),
    vietnamTime: vietnamTime(report.reportDate),
    lineCount: report.lines.length,
    entryCount: entries.length,
    duplicateSameDayCount: duplicateSameDay.length,
    failedFields: rows.filter((row) => row[3] !== "PASS").map((row) => row[0]),
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
