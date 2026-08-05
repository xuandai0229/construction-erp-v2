import "dotenv/config";
import prisma from "../../src/lib/prisma";
import { chromium } from "playwright";
import { buildWeeklyDocumentModel } from "../../src/lib/supervision-weekly/document-model";
import { buildSupervisionExportFilename } from "../../src/lib/supervision-weekly/export-filename";
import type { SupervisionWeeklyPrintDto } from "../../src/lib/supervision-weekly/print-types";

async function runWeeklyDocumentTypeAndPrintTest() {
  console.log("=== STARTING WEEKLY DOCUMENT TYPE & GLOBAL PRINT AUDIT ===");

  // 1. Database Seeding & Mock Dto Construction
  const mockDossier: SupervisionWeeklyPrintDto = {
    id: "test-dossier-id-123",
    status: "APPROVED",
    reportNumber: "BCGS-2026-W32",
    weekStart: "2026-08-03",
    weekEnd: "2026-08-09",
    nextWeekStart: "2026-08-10",
    nextWeekEnd: "2026-08-16",
    place: "Hà Nội",
    recipientName: "Ban Giám Đốc",
    recipientTitle: "Giám Đốc Dự Án",
    createdAt: "2026-08-03T00:00:00.000Z",
    issueDate: "2026-08-03T00:00:00.000Z",
    creator: { id: "user-admin-1", name: "Nguyễn Văn Admin" },
    entries: [
      {
        id: "e1",
        documentType: "RESULT",
        entryDate: "2026-08-03",
        shift: "MORNING",
        sortOrder: 1,
        inspectionContent: "Kiểm tra công tác đổ bê tông dầm sàn tầng 5",
        result: "Đạt yêu cầu thiết kế",
        commanderProposal: null,
        projectNameSnapshot: "Dự án Chung cư Cao cấp A1",
        locationNameSnapshot: "Tầng 5",
        workItemNameSnapshot: "Đổ bê tông",
        manualText: null,
        manualLocation: null,
        manualProjectName: null,
        manualWorkItemName: null,
        categoryNameSnapshot: "Thi công kết cấu",
        manualCategoryName: null,
      },
      {
        id: "e2",
        documentType: "NEXT_WEEK_PLAN",
        entryDate: "2026-08-10",
        shift: "MORNING",
        sortOrder: 1,
        inspectionContent: "Kiểm tra nghiệm thu cốt thép dầm sàn tầng 6",
        result: "Theo kế hoạch thi công",
        commanderProposal: "Bổ sung thêm 2 cán bộ giám sát",
        projectNameSnapshot: "Dự án Chung cư Cao cấp A1",
        locationNameSnapshot: "Tầng 6",
        workItemNameSnapshot: "Nghiệm thu cốt thép",
        manualText: null,
        manualLocation: null,
        manualProjectName: null,
        manualWorkItemName: null,
        categoryNameSnapshot: "Thi công kết cấu",
        manualCategoryName: null,
      },
    ],
    observations: [
      {
        id: "obs-1",
        documentType: "NEXT_WEEK_PLAN",
        category: "Theo dõi khắc phục các yêu cầu của tuần trước còn tồn đọng",
        sortOrder: 1,
        content: "Đã khắc phục xong lỗi nứt cục bộ dầm D3 trục A-B.",
        projectId: null,
        projectNameSnapshot: null,
        locationId: null,
        locationNameSnapshot: null,
        workItemId: null,
        workItemNameSnapshot: null,
        manualText: null,
        manualLocation: null,
        manualProjectName: null,
        manualWorkItemName: null,
        categoryItemId: null,
        categoryNameSnapshot: null,
        manualCategoryName: null,
      },
      {
        id: "obs-2",
        documentType: "NEXT_WEEK_PLAN",
        category: "Bổ sung nhân lực, thiết bị; thay thế đội ngũ yếu kém, không đạt yêu cầu về kỹ thuật, mỹ thuật",
        sortOrder: 2,
        content: "Đề nghị thay thế đội thợ sắt số 2 do thi công chậm tiến độ.",
        projectId: null,
        projectNameSnapshot: null,
        locationId: null,
        locationNameSnapshot: null,
        workItemId: null,
        workItemNameSnapshot: null,
        manualText: null,
        manualLocation: null,
        manualProjectName: null,
        manualWorkItemName: null,
        categoryItemId: null,
        categoryNameSnapshot: null,
        manualCategoryName: null,
      },
    ],
    transitions: [],
    quantities: [],
    progressRows: [],
  };

  // 2. Unit Testing Document Models for RESULT vs NEXT_WEEK_PLAN
  console.log("\n--- STEP 1: DOCUMENT MODEL SEPARATION TEST ---");
  const resultModel = buildWeeklyDocumentModel(mockDossier, "RESULT");
  const nextPlanModel = buildWeeklyDocumentModel(mockDossier, "NEXT_WEEK_PLAN");

  console.log("RESULT Title:", resultModel.metadata.title);
  console.log("RESULT Period:", `${resultModel.metadata.weekStart} – ${resultModel.metadata.weekEnd}`);

  console.log("NEXT_WEEK_PLAN Title:", nextPlanModel.metadata.title);
  console.log("NEXT_WEEK_PLAN Period:", `${nextPlanModel.metadata.weekStart} – ${nextPlanModel.metadata.weekEnd}`);

  if (resultModel.metadata.title !== "BÁO CÁO KẾT QUẢ TUẦN") {
    throw new Error(`FAIL: RESULT title mismatch: ${resultModel.metadata.title}`);
  }

  if (nextPlanModel.metadata.title !== "KẾ HOẠCH KIỂM TRA TUẦN SAU") {
    throw new Error(`FAIL: NEXT_WEEK_PLAN title mismatch: ${nextPlanModel.metadata.title}`);
  }

  if (resultModel.metadata.weekStart.includes("10/08/2026")) {
    throw new Error(`FAIL: RESULT period should be 03/08–09/08, got ${resultModel.metadata.weekStart}`);
  }

  if (!nextPlanModel.metadata.weekStart.includes("10/08/2026")) {
    throw new Error(`FAIL: NEXT_WEEK_PLAN period should be 10/08–16/08, got ${nextPlanModel.metadata.weekStart}`);
  }

  // Content Fingerprint Difference Assertion
  const resultStr = JSON.stringify(resultModel);
  const nextPlanStr = JSON.stringify(nextPlanModel);
  if (resultStr === nextPlanStr) {
    throw new Error("FAIL: RESULT and NEXT_WEEK_PLAN document models are identical!");
  }
  console.log("ASSERTION PASSED: RESULT and NEXT_WEEK_PLAN document models are distinct!");

  // 3. Filename Assertion Matrix
  console.log("\n--- STEP 2: FILENAME STANDARDIZATION MATRIX TEST ---");
  const fnResultPdf = buildSupervisionExportFilename({ reportNumber: "BCGS-2026-W32", weekStart: "2026-08-03", documentType: "RESULT", extension: "pdf" });
  const fnResultDocx = buildSupervisionExportFilename({ reportNumber: "BCGS-2026-W32", weekStart: "2026-08-03", documentType: "RESULT", extension: "docx" });
  const fnPlanPdf = buildSupervisionExportFilename({ reportNumber: "BCGS-2026-W32", weekStart: "2026-08-03", documentType: "NEXT_WEEK_PLAN", extension: "pdf" });
  const fnPlanDocx = buildSupervisionExportFilename({ reportNumber: "BCGS-2026-W32", weekStart: "2026-08-03", documentType: "NEXT_WEEK_PLAN", extension: "docx" });

  console.log("fnResultPdf:", fnResultPdf);
  console.log("fnResultDocx:", fnResultDocx);
  console.log("fnPlanPdf:", fnPlanPdf);
  console.log("fnPlanDocx:", fnPlanDocx);

  if (fnResultPdf !== "Bao-cao-giam-sat-tuan_BCGS-2026-W32_Ket-qua.pdf") throw new Error("fnResultPdf fail");
  if (fnResultDocx !== "Bao-cao-giam-sat-tuan_BCGS-2026-W32_Ket-qua.docx") throw new Error("fnResultDocx fail");
  if (fnPlanPdf !== "Bao-cao-giam-sat-tuan_BCGS-2026-W32_Ke-hoach-tuan-sau.pdf") throw new Error("fnPlanPdf fail");
  if (fnPlanDocx !== "Bao-cao-giam-sat-tuan_BCGS-2026-W32_Ke-hoach-tuan-sau.docx") throw new Error("fnPlanDocx fail");
  console.log("ASSERTION PASSED: All 4 export filenames follow production standards!");

  // 4. Playwright End-to-End Export Matrix Assertion
  console.log("\n--- STEP 3: PLAYWRIGHT EXPORT & METADATA AUDIT ---");
  const existingDossier = await prisma.supervisionWeeklyDossier.findFirst({
    where: { deletedAt: null },
    select: { id: true },
  });

  if (!existingDossier) {
    console.log("No existing dossier found in database, skipping live browser request assertion.");
    return;
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Login
  await page.goto("http://localhost:3000/login", { waitUntil: "load" });
  await page.fill('input[name="email"]', "daicongtu2910@gmail.com");
  await page.fill('input[name="password"]', "123456");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard", { timeout: 10000 }).catch(() => {});

  // Test Export PDF for RESULT
  const resResultPdf = await page.request.get(`http://localhost:3000/api/supervision/weekly/${existingDossier.id}/export?format=pdf&disposition=inline&document=RESULT`);
  if (resResultPdf.status() !== 200) throw new Error(`RESULT PDF export failed: ${resResultPdf.status()}`);
  console.log("RESULT PDF Response: 200 OK | Content-Type:", resResultPdf.headers()["content-type"]);

  // Test Export PDF for NEXT_WEEK_PLAN
  const resPlanPdf = await page.request.get(`http://localhost:3000/api/supervision/weekly/${existingDossier.id}/export?format=pdf&disposition=inline&document=NEXT_WEEK_PLAN`);
  if (resPlanPdf.status() !== 200) throw new Error(`NEXT_WEEK_PLAN PDF export failed: ${resPlanPdf.status()}`);
  console.log("NEXT_WEEK_PLAN PDF Response: 200 OK | Content-Type:", resPlanPdf.headers()["content-type"]);

  // Test DOCX Exports
  const resResultDocx = await page.request.get(`http://localhost:3000/api/supervision/weekly/${existingDossier.id}/export?format=docx&document=RESULT`);
  const resPlanDocx = await page.request.get(`http://localhost:3000/api/supervision/weekly/${existingDossier.id}/export?format=docx&document=NEXT_WEEK_PLAN`);
  if (resResultDocx.status() !== 200 || resPlanDocx.status() !== 200) {
    throw new Error("DOCX exports failed!");
  }
  console.log("DOCX Exports: 200 OK for both RESULT and NEXT_WEEK_PLAN");

  await browser.close();
  await prisma.$disconnect();

  console.log("\n=== ALL AUDIT CHECKS PASSED SUCCESSFULLY! ===");
}

runWeeklyDocumentTypeAndPrintTest().catch((err) => {
  console.error("Test failed with error:", err);
  process.exit(1);
});
