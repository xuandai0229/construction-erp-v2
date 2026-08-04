import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { chromium } from "playwright";
import { validateCandidateDatabaseUrl } from "./qa-db-guard-utils";

async function main() {
  console.log("=== PHASE 0.7 MUTATION REGRESSION TEST ON ISOLATED E2E DB ===");

  const mainDbUrl = process.env.DATABASE_URL;
  const e2eDbUrl = process.env.QA_DATABASE_URL;

  if (!mainDbUrl || !e2eDbUrl) {
    throw new Error("DATABASE_URL and QA_DATABASE_URL must be defined");
  }

  // 1. Guard check
  const guard = validateCandidateDatabaseUrl(e2eDbUrl);
  console.log(`[Guard Verification] E2E DB: ${guard.dbName} | Valid: ${guard.valid} | Reason: ${guard.reason || "OK"}`);
  if (!guard.valid) {
    throw new Error(`Safety guard violated: ${guard.reason}`);
  }

  const pool = new Pool({ connectionString: e2eDbUrl });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  const results: Array<{
    flow: string;
    create: string;
    read: string;
    update: string;
    preview: string;
    cleanup: string;
    console: string;
    network: string;
  }> = [];

  // Launch browser for preview verification
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Login
  await page.goto("http://localhost:3000/login");
  await page.fill("input[name='email']", "daicongtu2910@gmail.com");
  await page.fill("input[name='password']", "123456");
  await page.click("button[type='submit']");
  await page.waitForURL((url) => !url.toString().includes("/login"), { timeout: 10000 });

  // Find a valid project in E2E DB (or seed one if empty)
  let project = await prisma.project.findFirst();
  if (!project) {
    project = await prisma.project.create({
      data: {
        code: "MUTATION_TEST_PROJ",
        name: "Dự Án Test Mutation",
        status: "ACTIVE",
        updatedAt: new Date(),
      },
    });
  }

  let adminUser = await prisma.user.findFirst({ where: { email: "daicongtu2910@gmail.com" } });
  if (!adminUser) {
    adminUser = await prisma.user.create({
      data: {
        email: "daicongtu2910@gmail.com",
        name: "Admin Test E2E",
        password: "$2b$10$epA.eWzJ3B5F6/NfF/a.2eH1w/ZJ1l4K7/o3aW2d.z8S0g/0.5o7y",
        role: "ADMIN",
        updatedAt: new Date(),
      },
    });
  }

  // -------------------------------------------------------------
  // FLOW A: An toàn lao động — Kế hoạch an toàn (Safety Report Plan)
  // -------------------------------------------------------------
  console.log("\n--- Testing Flow A: Kế hoạch An Toàn Lao Động ---");
  const planData = {
    title: "Kế hoạch an toàn lao động E2E",
    documentYear: 2026,
    createdDate: new Date(),
    periodStart: new Date(),
    periodEnd: new Date(),
    note: "Ghi chú kế hoạch an toàn E2E",
    documentNumber: "123/2026/KH-ATLĐ-E2E",
    status: "DRAFT" as const,
    createdById: adminUser.id,
    updatedAt: new Date(),
  };

  // CREATE
  const createdPlan = await prisma.safetyReportPlan.create({ data: planData });
  console.log(`[Safety Plan] Created ID: ${createdPlan.id}`);

  // READ
  const readPlan = await prisma.safetyReportPlan.findUnique({ where: { id: createdPlan.id } });
  const readOk = readPlan?.note === "Ghi chú kế hoạch an toàn E2E";
  console.log(`[Safety Plan] Read Check: ${readOk ? "PASS" : "FAIL"}`);

  // UPDATE
  const updatedPlan = await prisma.safetyReportPlan.update({
    where: { id: createdPlan.id },
    data: {
      note: "Ghi chú kế hoạch an toàn E2E Đã Cập Nhật",
    },
  });
  const updateOk = updatedPlan.note === "Ghi chú kế hoạch an toàn E2E Đã Cập Nhật";
  console.log(`[Safety Plan] Update Check: ${updateOk ? "PASS" : "FAIL"}`);

  // PREVIEW
  let previewOk = false;
  let consoleErrCount = 0;
  let networkErrCount = 0;
  page.on("console", (msg) => { if (msg.type() === "error") consoleErrCount++; });
  page.on("requestfailed", () => { networkErrCount++; });

  const resPlan = await page.goto(`http://localhost:3000/reports/safety/plans/${createdPlan.id}/preview`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);
  previewOk = (resPlan?.status() === 200);
  console.log(`[Safety Plan] Preview Check: Status ${resPlan?.status()}`);

  // CLEANUP
  await prisma.safetyReportPlan.delete({ where: { id: createdPlan.id } });
  const deletedPlan = await prisma.safetyReportPlan.findUnique({ where: { id: createdPlan.id } });
  const cleanupOk = !deletedPlan;
  console.log(`[Safety Plan] Cleanup Check: ${cleanupOk ? "PASS" : "FAIL"}`);

  results.push({
    flow: "An toàn - Kế hoạch an toàn",
    create: createdPlan ? "PASS" : "FAIL",
    read: readOk ? "PASS" : "FAIL",
    update: updateOk ? "PASS" : "FAIL",
    preview: previewOk ? "PASS" : "FAIL",
    cleanup: cleanupOk ? "PASS" : "FAIL",
    console: consoleErrCount.toString(),
    network: networkErrCount.toString(),
  });

  // -------------------------------------------------------------
  // FLOW B: Báo cáo Tự đánh giá An toàn (Safety Self Assessment)
  // -------------------------------------------------------------
  console.log("\n--- Testing Flow B: Báo cáo Tự Đánh Giá An Toàn ---");
  const selfData = {
    title: "Báo cáo tự đánh giá an toàn E2E",
    documentYear: 2026,
    createdDate: new Date(),
    periodStart: new Date(),
    periodEnd: new Date(),
    documentPlace: "Công trường Tự Đánh Giá E2E",
    reporterName: "Trần Văn Inspection",
    documentNumber: "05/2026/BC-TĐG-E2E",
    status: "DRAFT" as const,
    createdById: adminUser.id,
    updatedAt: new Date(),
  };

  // CREATE
  const createdSelf = await prisma.safetySelfAssessmentReport.create({ data: selfData });
  console.log(`[Safety Self Assessment] Created ID: ${createdSelf.id}`);

  // READ
  const readSelf = await prisma.safetySelfAssessmentReport.findUnique({ where: { id: createdSelf.id } });
  const readSelfOk = readSelf?.documentPlace === "Công trường Tự Đánh Giá E2E";
  console.log(`[Safety Self Assessment] Read Check: ${readSelfOk ? "PASS" : "FAIL"}`);

  // UPDATE
  const updatedSelf = await prisma.safetySelfAssessmentReport.update({
    where: { id: createdSelf.id },
    data: { reporterName: "Trần Văn Inspection Updated" },
  });
  const updateSelfOk = updatedSelf.reporterName === "Trần Văn Inspection Updated";
  console.log(`[Safety Self Assessment] Update Check: ${updateSelfOk ? "PASS" : "FAIL"}`);

  // PREVIEW
  consoleErrCount = 0;
  networkErrCount = 0;
  const resSelf = await page.goto(`http://localhost:3000/reports/safety/self-assessments/${createdSelf.id}/preview`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);
  const previewSelfOk = (resSelf?.status() === 200);
  console.log(`[Safety Self Assessment] Preview Check: Status ${resSelf?.status()}`);

  // CLEANUP
  await prisma.safetySelfAssessmentReport.delete({ where: { id: createdSelf.id } });
  const deletedSelf = await prisma.safetySelfAssessmentReport.findUnique({ where: { id: createdSelf.id } });
  const cleanupSelfOk = !deletedSelf;
  console.log(`[Safety Self Assessment] Cleanup Check: ${cleanupSelfOk ? "PASS" : "FAIL"}`);

  results.push({
    flow: "An toàn - Tự đánh giá an toàn",
    create: createdSelf ? "PASS" : "FAIL",
    read: readSelfOk ? "PASS" : "FAIL",
    update: updateSelfOk ? "PASS" : "FAIL",
    preview: previewSelfOk ? "PASS" : "FAIL",
    cleanup: cleanupSelfOk ? "PASS" : "FAIL",
    console: consoleErrCount.toString(),
    network: networkErrCount.toString(),
  });

  // -------------------------------------------------------------
  // FLOW C: Giám sát — Hồ sơ giám sát tuần (Supervision Weekly Dossier)
  // -------------------------------------------------------------
  console.log("\n--- Testing Flow C: Hồ Sơ Giám Sát Tuần ---");
  const supData = {
    createdById: adminUser.id,
    reportNumber: "GST-E2E-TEST-001",
    weekStart: new Date(),
    weekEnd: new Date(),
    nextWeekStart: new Date(),
    nextWeekEnd: new Date(),
    status: "DRAFT" as const,
    place: "Hà Nội E2E",
    updatedAt: new Date(),
  };

  // CREATE
  const createdSup = await prisma.supervisionWeeklyDossier.create({ data: supData });
  console.log(`[Supervision Weekly] Created ID: ${createdSup.id}`);

  // READ
  const readSup = await prisma.supervisionWeeklyDossier.findUnique({ where: { id: createdSup.id } });
  const readSupOk = readSup?.reportNumber === "GST-E2E-TEST-001";
  console.log(`[Supervision Weekly] Read Check: ${readSupOk ? "PASS" : "FAIL"}`);

  // UPDATE
  const updatedSup = await prisma.supervisionWeeklyDossier.update({
    where: { id: createdSup.id },
    data: { place: "Hà Nội E2E Đã Cập Nhật" },
  });
  const updateSupOk = updatedSup.place === "Hà Nội E2E Đã Cập Nhật";
  console.log(`[Supervision Weekly] Update Check: ${updateSupOk ? "PASS" : "FAIL"}`);

  // PREVIEW
  consoleErrCount = 0;
  networkErrCount = 0;
  const resSup = await page.goto(`http://localhost:3000/reports/weekly-inspection/${createdSup.id}/preview`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);
  const previewSupOk = (resSup?.status() === 200);
  console.log(`[Supervision Weekly] Preview Check: Status ${resSup?.status()}`);

  // CLEANUP
  await prisma.supervisionWeeklyDossier.delete({ where: { id: createdSup.id } });
  const deletedSup = await prisma.supervisionWeeklyDossier.findUnique({ where: { id: createdSup.id } });
  const cleanupSupOk = !deletedSup;
  console.log(`[Supervision Weekly] Cleanup Check: ${cleanupSupOk ? "PASS" : "FAIL"}`);

  results.push({
    flow: "Giám sát - Hồ sơ giám sát tuần",
    create: createdSup ? "PASS" : "FAIL",
    read: readSupOk ? "PASS" : "FAIL",
    update: updateSupOk ? "PASS" : "FAIL",
    preview: previewSupOk ? "PASS" : "FAIL",
    cleanup: cleanupSupOk ? "PASS" : "FAIL",
    console: consoleErrCount.toString(),
    network: networkErrCount.toString(),
  });

  await browser.close();
  await prisma.$disconnect();
  await pool.end();

  console.log("\n=== MUTATION REGRESSION RESULTS TABLE ===");
  console.table(results);
}

main().catch((err) => {
  console.error("Mutation regression failed:", err);
  process.exit(1);
});
