import "dotenv/config";

import { chromium, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const BASE_URL = process.env.QA_BASE_URL || "http://localhost:3000";
const PROJECT_CODE = "CT-TAYHO-2026-001";
const EMAIL = process.env.QA_REPORT_USER || "daicongtu2910@gmail.com";
const PASSWORD = process.env.QA_REPORT_PASSWORD || "xuandai0229";

function requireEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

const pool = new Pool({ connectionString: requireEnv("DATABASE_URL") });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const project = await prisma.project.findUnique({ where: { code: PROJECT_CODE } });
  if (!project || project.deletedAt) throw new Error(`Missing project ${PROJECT_CODE}`);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });

  const loginResponse = await page.request.post(`${BASE_URL}/api/auth/login`, {
    data: { email: EMAIL, password: PASSWORD },
  });
  if (!loginResponse.ok()) throw new Error(`Login API failed: ${loginResponse.status()}`);

  await page.goto(`${BASE_URL}/reports?projectId=${project.id}`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Tạo báo cáo mới" }).click();
  await expect(page.getByText("Tạo báo cáo mới").last()).toBeVisible();

  await page.locator("select").first().selectOption(project.id);
  await page.locator('input[type="date"]').fill("2026-07-04");
  await page.locator('input[type="time"]').fill("09:00");
  await page.getByRole("button", { name: "Thêm khối lượng" }).first().click();
  await page.locator("tr", { hasText: "FP-CB-001" }).locator('input[type="checkbox"]').check();
  await page.getByRole("button", { name: "Thêm vào báo cáo" }).click();
  await expect(page.getByText("Chọn khối lượng công việc")).toBeHidden();

  await page.locator("tr", { hasText: "FP-CB-001" }).locator('input[type="number"]').fill("1");
  await page.locator("tr", { hasText: "FP-CB-001" }).locator('input[placeholder="Vị trí..."]').fill(
    "QA duplicate guard same item same date",
  );
  await page.getByRole("button", { name: "Lưu nháp" }).click();
  await expect(page.getByText("Công việc này đã có khối lượng từ báo cáo khác trong ngày.")).toBeVisible({
    timeout: 10000,
  });

  await browser.close();
  console.log(JSON.stringify({
    duplicateSameItemSameDate: "PASS",
    expectedMessage: "Công việc này đã có khối lượng từ báo cáo khác trong ngày.",
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
