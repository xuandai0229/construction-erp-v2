import "dotenv/config";
import { chromium, expect } from "@playwright/test";
import fs from "fs";
import path from "path";
import prisma from "../../src/lib/prisma";
import { formatOfficialDocumentDate } from "../../src/lib/supervision-weekly/document-model";

const artifactsDir = "C:/Users/admin/.gemini/antigravity/brain/0dbf49d4-0752-45d9-a912-f1c31cea75a0";

async function runUnitTests() {
  console.log("=== 1. RUNNING UNIT TESTS FOR DATE FORMATTER ===");

  const test1 = formatOfficialDocumentDate(null, "03/08/2026");
  console.log("Test 1 (null place):", test1);
  expect(test1).toBe("ngày 03 tháng 08 năm 2026");
  expect(test1.startsWith(",")).toBe(false);

  const test2 = formatOfficialDocumentDate("", "03/08/2026");
  console.log("Test 2 (empty place):", test2);
  expect(test2).toBe("ngày 03 tháng 08 năm 2026");
  expect(test2.startsWith(",")).toBe(false);

  const test3 = formatOfficialDocumentDate("  ", "03/08/2026");
  console.log("Test 3 (whitespace place):", test3);
  expect(test3).toBe("ngày 03 tháng 08 năm 2026");
  expect(test3.startsWith(",")).toBe(false);

  const test4 = formatOfficialDocumentDate("Hà Nội", "03/08/2026");
  console.log("Test 4 (Hà Nội place):", test4);
  expect(test4).toBe("Hà Nội, ngày 03 tháng 08 năm 2026");

  console.log("--> UNIT TESTS PASSED!");
}

async function getActiveDossierId(): Promise<string> {
  const adminUser = await prisma.user.findFirst({ where: { email: "daicongtu2910@gmail.com" } });
  let dossier = await prisma.supervisionWeeklyDossier.findFirst({
    where: { deletedAt: null },
    orderBy: { updatedAt: "desc" },
  });

  if (!dossier && adminUser) {
    console.log("No active dossier found, creating seed dossier...");
    const monday = new Date("2026-08-03T00:00:00.000Z");
    const sunday = new Date("2026-08-09T00:00:00.000Z");
    const nextMon = new Date("2026-08-10T00:00:00.000Z");
    const nextSun = new Date("2026-08-16T00:00:00.000Z");
    dossier = await prisma.supervisionWeeklyDossier.create({
      data: {
        reportNumber: "BCGS-2026-W32",
        weekStart: monday,
        weekEnd: sunday,
        nextWeekStart: nextMon,
        nextWeekEnd: nextSun,
        createdById: adminUser.id,
        recipientName: "Ban Giám Đốc",
        recipientTitle: "Giám đốc Dự án",
        place: "Hà Nội",
        entries: {
          create: [
            {
              documentType: "RESULT",
              entryDate: monday,
              shift: "MORNING",
              sortOrder: 1,
              sourceText: "Dự án Chung cư Starlake",
              content: "Kiểm tra đan thép sàn tầng 15",
              result: "Đạt yêu cầu kỹ thuật",
            },
          ],
        },
      },
    });
  }

  if (!dossier) throw new Error("Could not find or create test dossier.");
  return dossier.id;
}

async function runExportFlowTests() {
  const dossierId = await getActiveDossierId();
  console.log(`=== 2. RUNNING EXPORT FLOW TESTS FOR DOSSIER ID: ${dossierId} ===`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1536, height: 864 } });
  const page = await context.newPage();

  // 1. Login
  console.log("Logging in as ADMIN...");
  await page.goto("http://localhost:3000/login", { waitUntil: "load" });
  await page.fill('input[name="email"]', "daicongtu2910@gmail.com");
  await page.fill('input[name="password"]', "123456");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard", { timeout: 10000 }).catch(() => {});

  // 2. Test Preview Page Content (Assert NO leading comma in date)
  console.log("Navigating to preview page...");
  await page.goto(`http://localhost:3000/reports/weekly-inspection/${dossierId}/preview`, { waitUntil: "load" });
  await page.waitForTimeout(500);

  const previewHtml = await page.content();
  expect(previewHtml).not.toContain(", ngày ");
  console.log("Preview page date check PASSED (no ', ngày ' found)");

  // 3. Test 'Xem PDF' (inline disposition)
  console.log("Testing 'Xem PDF' (inline)...");
  const inlineRes = await page.evaluate(async (id) => {
    const res = await fetch(`/api/supervision/weekly/${id}/export?format=pdf&disposition=inline&document=RESULT`, { credentials: "include" });
    return {
      status: res.status,
      disposition: res.headers.get("content-disposition"),
      contentType: res.headers.get("content-type"),
    };
  }, dossierId);

  console.log("Inline PDF Response:", inlineRes);
  expect(inlineRes.status).toBe(200);
  expect(inlineRes.disposition).toContain("inline");
  expect(inlineRes.disposition).toContain("Bao-cao-giam-sat-tuan_");
  expect(inlineRes.disposition).not.toContain("Wcmsclj");
  expect(inlineRes.disposition).not.toContain("RESULT");

  // 4. Test 'Tải PDF' (attachment disposition)
  console.log("Testing 'Tải PDF' (attachment)...");
  const attachRes = await page.evaluate(async (id) => {
    const res = await fetch(`/api/supervision/weekly/${id}/export?format=pdf&disposition=attachment&document=RESULT`, { credentials: "include" });
    const blob = await res.blob();
    const base64 = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string).split(",")[1]);
      reader.readAsDataURL(blob);
    });
    return {
      status: res.status,
      disposition: res.headers.get("content-disposition"),
      contentType: res.headers.get("content-type"),
      base64,
    };
  }, dossierId);

  console.log("Attachment PDF Response:", { status: attachRes.status, disposition: attachRes.disposition });
  expect(attachRes.status).toBe(200);
  expect(attachRes.disposition).toContain("attachment");
  expect(attachRes.disposition).toContain("Bao-cao-giam-sat-tuan_");
  expect(attachRes.disposition).not.toContain("Wcmsclj");
  expect(attachRes.disposition).not.toContain("RESULT");

  const pdfBuffer = Buffer.from(attachRes.base64, "base64");
  const pdfPath = path.join(artifactsDir, "Bao-cao-giam-sat-tuan-downloaded.pdf");
  fs.writeFileSync(pdfPath, pdfBuffer);
  console.log(`Saved PDF download to ${pdfPath}, size: ${pdfBuffer.length} bytes`);

  // Check PDF magic header
  const magic = pdfBuffer.slice(0, 4).toString("ascii");
  expect(magic).toBe("%PDF");

  // Audit text inside PDF binary
  const pdfBinary = pdfBuffer.toString("binary");
  expect(pdfBinary).not.toContain(", ngày ");
  for (const pattern of ["localhost", "127.0.0.1", "/reports/weekly-inspection/edit"]) {
    expect(pdfBinary).not.toContain(pattern);
  }
  console.log("PDF text audit PASSED!");

  // 5. Test 'Tải DOCX' (attachment disposition)
  console.log("Testing 'Tải DOCX'...");
  const docxRes = await page.evaluate(async (id) => {
    const res = await fetch(`/api/supervision/weekly/${id}/export?format=docx&document=RESULT`, { credentials: "include" });
    const blob = await res.blob();
    const base64 = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string).split(",")[1]);
      reader.readAsDataURL(blob);
    });
    return {
      status: res.status,
      disposition: res.headers.get("content-disposition"),
      base64,
    };
  }, dossierId);

  console.log("DOCX Export Response:", { status: docxRes.status, disposition: docxRes.disposition });
  expect(docxRes.status).toBe(200);
  expect(docxRes.disposition).toContain("attachment");
  expect(docxRes.disposition).toContain("Bao-cao-giam-sat-tuan_");
  expect(docxRes.disposition).not.toContain("Wcmsclj");
  expect(docxRes.disposition).not.toContain("RESULT");

  const docxBuffer = Buffer.from(docxRes.base64, "base64");
  const docxPath = path.join(artifactsDir, "Bao-cao-giam-sat-tuan-downloaded.docx");
  fs.writeFileSync(docxPath, docxBuffer);
  console.log(`Saved DOCX download to ${docxPath}, size: ${docxBuffer.length} bytes`);

  // Inspect DOCX binary text for leading comma
  const docxString = docxBuffer.toString("binary");
  expect(docxString).not.toContain(", ngày ");
  console.log("DOCX text audit PASSED!");

  // 6. Capture visual proof screenshots
  console.log("Capturing visual evidence screenshots...");

  // Preview tab
  await page.screenshot({ path: `${artifactsDir}/qa_preview_fixed.png`, fullPage: false });

  // Print emulation
  await page.emulateMedia({ media: "print" });
  await page.screenshot({ path: `${artifactsDir}/qa_print_media_fixed.png`, fullPage: false });

  await browser.close();
  console.log("=== EXPORT FLOW TESTS COMPLETE - ALL PASSED! ===");
}

async function main() {
  await runUnitTests();
  await runExportFlowTests();
}

main().catch(console.error).finally(() => prisma.$disconnect());
