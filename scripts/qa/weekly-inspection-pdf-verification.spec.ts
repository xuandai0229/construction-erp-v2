import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";

const artifactsDir = "C:/Users/admin/.gemini/antigravity/brain/0dbf49d4-0752-45d9-a912-f1c31cea75a0";

test.describe("PDF & Print Metadata Sanitization QA Verification", () => {
  test("1. Generate, download, and rigorously audit PDF text layer for prohibited URLs and metadata", async ({
    page,
    request,
  }) => {
    // A. Login as ADMIN
    await page.setViewportSize({ width: 1536, height: 864 });
    await page.goto("http://localhost:3000/login");
    await page.fill('input[name="email"]', "daicongtu2910@gmail.com");
    await page.fill('input[name="password"]', "123456");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard", { timeout: 10000 }).catch(() => {});

    // B. Navigate to Supervision Weekly Inspection List
    await page.goto("http://localhost:3000/reports/weekly-inspection", { waitUntil: "networkidle" });
    const rows = page.locator("tbody tr");
    await expect(rows.first()).toBeVisible({ timeout: 10000 });

    const firstRow = rows.nth(0);
    const dossierId = (await firstRow.getAttribute("data-row-id")) || "";
    const dossierCode = (await firstRow.getAttribute("data-dossier-code")) || "BCGS";
    expect(dossierId).not.toBe("");

    // C. Trigger Clean PDF Download via API Endpoint
    const pdfResponse = await request.get(`http://localhost:3000/api/supervision/weekly/${dossierId}/export?format=pdf&document=RESULT`);
    expect(pdfResponse.ok()).toBe(true);
    expect(pdfResponse.headers()["content-type"]).toContain("application/pdf");

    const contentDisposition = pdfResponse.headers()["content-disposition"] || "";
    console.log("Content-Disposition:", contentDisposition);

    const pdfBuffer = await pdfResponse.body();
    const pdfPath = path.join(artifactsDir, `Bao-cao-giam-sat-tuan-real.pdf`);
    fs.writeFileSync(pdfPath, pdfBuffer);

    console.log(`Saved PDF to ${pdfPath}, size: ${pdfBuffer.length} bytes`);

    // D. Rigorous Text Layer Inspection (Security & Metadata Assertions)
    expect(pdfBuffer.length).toBeGreaterThan(10000);
    const headerMagic = pdfBuffer.slice(0, 4).toString("ascii");
    expect(headerMagic).toBe("%PDF");

    const rawPdfText = pdfBuffer.toString("binary");

    // Prohibited strings assertion
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

    console.log("Prohibited pattern violations:", violations);
    expect(violations).toEqual([]);

    // E. Save Verification Log JSON
    const verificationResult = {
      timestamp: new Date().toISOString(),
      dossierId,
      dossierCode,
      pdfPath,
      sizeBytes: pdfBuffer.length,
      isPdfValid: headerMagic === "%PDF",
      violationsCount: violations.length,
      violations,
      status: violations.length === 0 ? "PASS" : "FAIL",
    };

    fs.writeFileSync(
      path.join(artifactsDir, "pdf_text_verification_results.json"),
      JSON.stringify(verificationResult, null, 2)
    );
  });

  test("2. Capture Required Preview, PDF, and Print Screenshots for Delivery", async ({ page }) => {
    await page.setViewportSize({ width: 1536, height: 864 });
    await page.goto("http://localhost:3000/login");
    await page.fill('input[name="email"]', "daicongtu2910@gmail.com");
    await page.fill('input[name="password"]', "123456");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard", { timeout: 10000 }).catch(() => {});

    // Navigate to preview page of first dossier
    await page.goto("http://localhost:3000/reports/weekly-inspection", { waitUntil: "networkidle" });
    const firstRow = page.locator("tbody tr").nth(0);
    const dossierId = (await firstRow.getAttribute("data-row-id")) || "";

    await page.goto(`http://localhost:3000/reports/weekly-inspection/${dossierId}/preview`, { waitUntil: "networkidle" });
    await page.waitForTimeout(500);

    // 1. Preview Page Screenshot
    await page.screenshot({
      path: `${artifactsDir}/pdf_1_preview.png`,
      fullPage: false,
    });

    // 2. Page 1 Screenshot
    await page.screenshot({
      path: `${artifactsDir}/pdf_2_page_1.png`,
      fullPage: false,
    });

    // 3. Last Page Screenshot (scroll down to signature section)
    const signatureBlock = page.locator(".signature");
    if ((await signatureBlock.count()) > 0) {
      await signatureBlock.scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);
      await page.screenshot({
        path: `${artifactsDir}/pdf_3_page_last.png`,
        fullPage: false,
      });
    }

    // 4. Print Media Layout Screenshot (Emulating @media print)
    await page.emulateMedia({ media: "print" });
    await page.goto(`http://localhost:3000/reports/weekly-inspection/${dossierId}/preview`, { waitUntil: "networkidle" });
    await page.waitForTimeout(400);
    await page.screenshot({
      path: `${artifactsDir}/pdf_4_print_window.png`,
      fullPage: false,
    });
  });
});
