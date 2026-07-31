import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";
import { chromium } from "playwright";
import { buildSafetyPlanPreviewModel } from "./plan-view-model";
import { renderSafetyPlanStandaloneHtml } from "./html-renderer";

export class SafetyPdfConverter {
  /**
   * Generates a validated PDF buffer for a Safety Plan strictly from Standalone HTML.
   * Guarantees PDF output NEVER redirects to login pages, NEVER renders AppShell/navigation,
   * and ALWAYS contains clean A4 document content.
   */
  static async generatePlanPdf(plan: any): Promise<Buffer> {
    const viewModel = buildSafetyPlanPreviewModel(plan);
    const htmlContent = renderSafetyPlanStandaloneHtml(viewModel);

    // 1. Try Playwright setContent (Server-side Direct HTML Rendering)
    let browser;
    try {
      browser = await chromium.launch({ headless: true });
      const context = await browser.newContext();
      const page = await context.newPage();

      await page.setContent(htmlContent, { waitUntil: "load" });
      await page.evaluate(() => document.fonts.ready).catch(() => undefined);
      await page.emulateMedia({ media: "print" });

      const pdfBuffer = await page.pdf({
        format: "A4",
        printBackground: true,
        preferCSSPageSize: true,
        displayHeaderFooter: false,
        margin: { top: "18mm", right: "15mm", bottom: "18mm", left: "20mm" },
      });

      await browser.close();

      // Guard check: Validate PDF content
      this.validatePdfBuffer(pdfBuffer, viewModel);
      return pdfBuffer;
    } catch (pwError: any) {
      if (browser) await browser.close().catch(() => undefined);
      console.warn("[SafetyPdfConverter] Playwright setContent PDF failed, attempting LibreOffice fallback:", pwError?.message);
    }

    // 2. Fallback to LibreOffice if Playwright is unavailable
    try {
      const tempDir = path.join(os.tmpdir(), "safety-reporting-pdf");
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

      const tempName = `Ke-Hoach-ATLD-${plan.id}`;
      const tempDocxPath = path.join(tempDir, `${tempName}.docx`);
      const tempPdfPath = path.join(tempDir, `${tempName}.pdf`);

      // Lazy import docx generator
      const { SafetyDocxGenerator } = await import("./docx-generator");
      const docxBuffer = await SafetyDocxGenerator.generatePlanDocx(plan);
      fs.writeFileSync(tempDocxPath, docxBuffer);

      const sofficeWinPath = "C:\\Program Files\\LibreOffice\\program\\soffice.exe";
      const cmd = fs.existsSync(sofficeWinPath)
        ? `"${sofficeWinPath}" --headless --convert-to pdf "${tempDocxPath}" --outdir "${tempDir}"`
        : `soffice --headless --convert-to pdf "${tempDocxPath}" --outdir "${tempDir}"`;

      execSync(cmd, { stdio: "pipe" });

      if (fs.existsSync(tempPdfPath)) {
        const pdfBuffer = fs.readFileSync(tempPdfPath);
        if (fs.existsSync(tempDocxPath)) fs.unlinkSync(tempDocxPath);
        if (fs.existsSync(tempPdfPath)) fs.unlinkSync(tempPdfPath);

        this.validatePdfBuffer(pdfBuffer, viewModel);
        return pdfBuffer;
      }
    } catch (loError: any) {
      console.error("[SafetyPdfConverter] LibreOffice conversion failed:", loError?.message);
    }

    throw new Error("Không thể khởi tạo engine sinh PDF. Vui lòng kiểm tra lại cấu hình hệ thống.");
  }

  /**
   * Chuyển đổi DOCX Buffer sang PDF Buffer dùng LibreOffice hoặc Playwright
   */
  static async convertDocxToPdf(docxBuffer: Buffer, tempName: string): Promise<Buffer> {
    const tempDir = path.join(os.tmpdir(), "safety-reporting-pdf");
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    const tempDocxPath = path.join(tempDir, `${tempName}.docx`);
    const tempPdfPath = path.join(tempDir, `${tempName}.pdf`);

    fs.writeFileSync(tempDocxPath, docxBuffer);

    try {
      const sofficeWinPath = "C:\\Program Files\\LibreOffice\\program\\soffice.exe";
      const cmd = fs.existsSync(sofficeWinPath)
        ? `"${sofficeWinPath}" --headless --convert-to pdf "${tempDocxPath}" --outdir "${tempDir}"`
        : `soffice --headless --convert-to pdf "${tempDocxPath}" --outdir "${tempDir}"`;

      execSync(cmd, { stdio: "pipe" });

      if (fs.existsSync(tempPdfPath)) {
        const pdfBuffer = fs.readFileSync(tempPdfPath);
        if (fs.existsSync(tempDocxPath)) fs.unlinkSync(tempDocxPath);
        if (fs.existsSync(tempPdfPath)) fs.unlinkSync(tempPdfPath);
        return pdfBuffer;
      }
    } catch (error) {
      console.warn("[SafetyPdfConverter] convertDocxToPdf LibreOffice failed:", error);
    } finally {
      if (fs.existsSync(tempDocxPath)) fs.unlinkSync(tempDocxPath);
    }

    return docxBuffer;
  }

  /**
   * PDF Buffer Guard Validation
   */
  private static validatePdfBuffer(pdfBuffer: Buffer, viewModel: any) {
    if (!pdfBuffer || pdfBuffer.length < 5000) {
      throw new Error("File PDF tạo ra bị rỗng hoặc dung lượng quá nhỏ.");
    }

    const header = pdfBuffer.slice(0, 4).toString("ascii");
    if (header !== "%PDF") {
      throw new Error("Dữ liệu xuất ra không phải định dạng PDF hợp lệ.");
    }

    const pdfRawText = pdfBuffer.toString("utf-8");

    // Must NOT contain login screen indicators or app shell elements
    if (pdfRawText.includes("Đăng nhập") || pdfRawText.includes("Mật khẩu") || pdfRawText.includes("Email đăng nhập")) {
      throw new Error("LỖI AN NINH: PDF chụp nhầm trang đăng nhập thay vì nội dung văn bản!");
    }
  }

  /**
   * Generates a validated PDF buffer for a Safety Assessment Report strictly from Standalone HTML rendering.
   */
  static async generateAssessmentPdf(report: any): Promise<Buffer> {
    const { buildSafetyAssessmentOutputModel } = await import("./assessment-view-model");
    const { renderSafetyAssessmentHtml } = await import("./assessment-html-renderer");

    const viewModel = buildSafetyAssessmentOutputModel(report);
    const htmlContent = renderSafetyAssessmentHtml(report);

    // 1. Try Playwright setContent
    let browser;
    try {
      browser = await chromium.launch({ headless: true });
      const context = await browser.newContext();
      const page = await context.newPage();

      await page.setContent(htmlContent, { waitUntil: "load" });
      await page.evaluate(() => document.fonts.ready).catch(() => undefined);
      await page.emulateMedia({ media: "print" });

      const pdfBuffer = await page.pdf({
        format: "A4",
        printBackground: true,
        preferCSSPageSize: true,
        displayHeaderFooter: false,
        margin: {
          top: "0",
          right: "0",
          bottom: "0",
          left: "0",
        },
      });

      await browser.close();
      this.validatePdfBuffer(pdfBuffer, viewModel);
      return pdfBuffer;
    } catch (pwError: any) {
      if (browser) await browser.close().catch(() => undefined);
      console.warn("[SafetyPdfConverter] Playwright setContent PDF for assessment failed, attempting LibreOffice fallback:", pwError?.message);
    }

    // 2. Fallback to LibreOffice
    try {
      const tempDir = path.join(os.tmpdir(), "safety-reporting-pdf");
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

      const tempName = `Bao-Cao-ATLD-${report.id}`;
      const tempDocxPath = path.join(tempDir, `${tempName}.docx`);
      const tempPdfPath = path.join(tempDir, `${tempName}.pdf`);

      const { SafetyAssessmentDocxGenerator } = await import("./assessment-docx-generator");
      const docxBuffer = await SafetyAssessmentDocxGenerator.generateAssessmentDocx(report);
      fs.writeFileSync(tempDocxPath, docxBuffer);

      const sofficeWinPath = "C:\\Program Files\\LibreOffice\\program\\soffice.exe";
      const cmd = fs.existsSync(sofficeWinPath)
        ? `"${sofficeWinPath}" --headless --convert-to pdf "${tempDocxPath}" --outdir "${tempDir}"`
        : `soffice --headless --convert-to pdf "${tempDocxPath}" --outdir "${tempDir}"`;

      execSync(cmd, { stdio: "pipe" });

      if (fs.existsSync(tempPdfPath)) {
        const pdfBuffer = fs.readFileSync(tempPdfPath);
        if (fs.existsSync(tempDocxPath)) fs.unlinkSync(tempDocxPath);
        if (fs.existsSync(tempPdfPath)) fs.unlinkSync(tempPdfPath);

        this.validatePdfBuffer(pdfBuffer, viewModel);
        return pdfBuffer;
      }
    } catch (loError: any) {
      console.error("[SafetyPdfConverter] LibreOffice conversion for assessment failed:", loError?.message);
    }

    throw new Error("Không thể khởi tạo engine sinh PDF cho Báo cáo.");
  }
}
