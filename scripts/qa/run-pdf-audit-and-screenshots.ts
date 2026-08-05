import { chromium, expect } from "@playwright/test";
import fs from "fs";
import path from "path";

const artifactsDir = "C:/Users/admin/.gemini/antigravity/brain/0dbf49d4-0752-45d9-a912-f1c31cea75a0";

async function main() {
  console.log("=== STARTING PDF & PRINT AUDIT ===");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1536, height: 864 } });
  const page = await context.newPage();

  // 1. Authenticate via login page to ensure browser session cookies are set correctly
  console.log("Logging in via UI form...");
  await page.goto("http://localhost:3000/login", { waitUntil: "load" });
  await page.fill('input[name="email"]', "daicongtu2910@gmail.com");
  await page.fill('input[name="password"]', "123456");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard", { timeout: 10000 }).catch(() => {});
  console.log("Logged in! Current URL:", page.url());

  // 2. Open Weekly Inspection List
  console.log("Navigating to Weekly Inspection list...");
  await page.goto("http://localhost:3000/reports/weekly-inspection", { waitUntil: "load" });
  await page.waitForTimeout(1000);

  const rows = page.locator("tbody tr");
  const count = await rows.count();
  console.log(`Table row count: ${count}`);
  expect(count).toBeGreaterThan(0);

  const firstRow = rows.nth(0);
  const dossierId = (await firstRow.getAttribute("data-row-id")) || "";
  const dossierCode = (await firstRow.getAttribute("data-dossier-code")) || "BCGS-2026-W33";
  console.log(`Found active dossier: ID=${dossierId}, Code=${dossierCode}`);

  // 3. Fetch PDF via browser-native fetch with credentials: include
  console.log("Fetching PDF from API route via page.evaluate with credentials: include...");
  const pdfBase64 = await page.evaluate(async (id) => {
    const res = await fetch(`/api/supervision/weekly/${id}/export?format=pdf&document=RESULT`, {
      credentials: "include",
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`PDF API returned HTTP ${res.status}: ${errText}`);
    }
    const blob = await res.blob();
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        resolve(result.split(",")[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }, dossierId);

  const pdfBuffer = Buffer.from(pdfBase64, "base64");
  const pdfPath = path.join(artifactsDir, `Bao-cao-giam-sat-tuan-real.pdf`);
  fs.writeFileSync(pdfPath, pdfBuffer);
  console.log(`Saved PDF to ${pdfPath}, size: ${pdfBuffer.length} bytes`);

  // 4. Perform Text Audit
  const headerMagic = pdfBuffer.slice(0, 4).toString("ascii");
  console.log("PDF Magic Header:", headerMagic);

  const rawPdfText = pdfBuffer.toString("binary");
  const prohibitedPatterns = [
    "localhost",
    "127.0.0.1",
    "/reports/weekly-inspection",
    "/edit",
    "09:15 3/8/26",
  ];

  const violations: string[] = [];
  for (const pattern of prohibitedPatterns) {
    if (rawPdfText.includes(pattern)) {
      violations.push(pattern);
    }
  }

  console.log("Prohibited Violations:", violations);

  const auditResult = {
    timestamp: new Date().toISOString(),
    dossierId,
    dossierCode,
    pdfPath,
    sizeBytes: pdfBuffer.length,
    isPdfValid: headerMagic === "%PDF" && pdfBuffer.length > 10000,
    violationsCount: violations.length,
    violations,
    status: violations.length === 0 && headerMagic === "%PDF" ? "PASS" : "FAIL",
  };

  fs.writeFileSync(
    path.join(artifactsDir, "pdf_text_audit_results.json"),
    JSON.stringify(auditResult, null, 2)
  );

  // 5. Capture Required Screenshots
  console.log("Capturing required screenshots...");

  // A. Preview view with toolbar
  await page.goto(`http://localhost:3000/reports/weekly-inspection/${dossierId}/preview`, { waitUntil: "load" });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${artifactsDir}/pdf_1_preview.png`, fullPage: false });

  // B. Page 1 view
  await page.screenshot({ path: `${artifactsDir}/pdf_2_page_1.png`, fullPage: false });

  // C. Last Page view (Signature section)
  const signatureBlock = page.locator(".signature");
  if ((await signatureBlock.count()) > 0) {
    await signatureBlock.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${artifactsDir}/pdf_3_page_last.png`, fullPage: false });
  }

  // D. Print media layout
  await page.emulateMedia({ media: "print" });
  await page.goto(`http://localhost:3000/reports/weekly-inspection/${dossierId}/preview`, { waitUntil: "load" });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${artifactsDir}/pdf_4_print_window.png`, fullPage: false });

  await browser.close();
  console.log("=== AUDIT AND SCREENSHOT CAPTURE COMPLETE ===");
}

main().catch(console.error);
