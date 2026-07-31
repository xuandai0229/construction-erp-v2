import { describe, it, expect } from "vitest";
import { SafetyPdfConverter } from "../pdf-converter";

describe("Safety Self-Assessment (Mẫu 01) — PDF Page Count & Formatting Verification", () => {
  const mockReportQA = {
    id: "rep-pdf-qa-001",
    documentNumber: "BC-ATLD-2026-0010",
    officialDocumentNumber: "16/BC-ATLD",
    documentPlace: "Hà Nội",
    documentDate: new Date("2026-07-31"),
    periodStart: new Date("2026-07-27"),
    periodEnd: new Date("2026-08-02"),
    reporterName: "Phạm Xuân Quảng",
    reporterTitle: "Cán bộ ATLĐ",
    reporterDepartment: "Phòng Kỹ thuật",
    recipientText: "Ban Giám đốc Công ty; Phòng Kỹ thuật",
    previousWeekRemediation: "",
    reinspectionConfirmation: "OK",
    managementRecommendation: "",
    otherOpinion: "",
    entries: [],
  };

  it("Generates a valid PDF buffer and does NOT spill onto unnecessary 4th page", async () => {
    const pdfBuffer = await SafetyPdfConverter.generateAssessmentPdf(mockReportQA);

    expect(pdfBuffer).toBeInstanceOf(Buffer);
    expect(pdfBuffer.length).toBeGreaterThan(10000);

    const pdfContentStr = pdfBuffer.toString("binary");
    expect(pdfContentStr.startsWith("%PDF")).toBe(true);

    // Verify page count match in PDF stream
    const pageCountMatch = pdfContentStr.match(/\/Count\s+(\d+)/);
    if (pageCountMatch) {
      const totalPages = parseInt(pageCountMatch[1], 10);
      expect(totalPages).toBeLessThanOrEqual(3);
    }
  }, 15000);
});
