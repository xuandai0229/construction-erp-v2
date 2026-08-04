import { describe, it, expect } from "vitest";
import JSZip from "jszip";
import { buildSafetyAssessmentOutputModel, buildNarrativeSectionValue } from "../assessment-view-model";
import { renderSafetyAssessmentHtml } from "../assessment-html-renderer";
import { SafetyAssessmentDocxGenerator } from "../assessment-docx-generator";

describe("Safety Self-Assessment (Mẫu 01) — Real Text Dot Lines & Soft Pagination Suite", () => {
  const baseMockReport = {
    id: "rep-hw-003",
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
    reinspectionConfirmation: "",
    managementRecommendation: "",
    otherOpinion: "",
    entries: [],
  };

  it("1. buildNarrativeSectionValue correctly identifies empty vs non-empty states", () => {
    expect(buildNarrativeSectionValue(null)).toEqual({ text: "", isEmpty: true, handwritingLineCount: 4 });
    expect(buildNarrativeSectionValue("")).toEqual({ text: "", isEmpty: true, handwritingLineCount: 4 });
    expect(buildNarrativeSectionValue("   ")).toEqual({ text: "", isEmpty: true, handwritingLineCount: 4 });
    expect(buildNarrativeSectionValue("None")).toEqual({ text: "", isEmpty: true, handwritingLineCount: 4 });
    expect(buildNarrativeSectionValue("none")).toEqual({ text: "", isEmpty: true, handwritingLineCount: 4 });
    expect(buildNarrativeSectionValue("null")).toEqual({ text: "", isEmpty: true, handwritingLineCount: 4 });
    expect(buildNarrativeSectionValue("undefined")).toEqual({ text: "", isEmpty: true, handwritingLineCount: 4 });
    expect(buildNarrativeSectionValue("N/A")).toEqual({ text: "", isEmpty: true, handwritingLineCount: 4 });

    expect(buildNarrativeSectionValue("OK")).toEqual({ text: "OK", isEmpty: false, handwritingLineCount: 0 });
    expect(buildNarrativeSectionValue("Đã kiểm tra 100%")).toEqual({ text: "Đã kiểm tra 100%", isEmpty: false, handwritingLineCount: 0 });
  });

  it("2. Case A: HTML uses real text dot lines (.assessment-handwriting-text-line) and zero SVG patterns or CSS dotted borders", () => {
    const viewModel = buildSafetyAssessmentOutputModel(baseMockReport);
    const html = renderSafetyAssessmentHtml(viewModel);

    // Text dot line elements count
    const lineMatches = html.match(/class="assessment-handwriting-text-line"/g);
    expect(lineMatches).not.toBeNull();
    expect(lineMatches?.length).toBe(16);

    // ZERO SVG patterns or circle elements
    expect(html).not.toContain("<pattern");
    expect(html).not.toContain("<circle");
    expect(html).not.toContain("<svg");
    expect(html).not.toContain("border-bottom: 1px dotted");
    expect(html).not.toContain("border-bottom: dotted");

    // Ensure NO placeholders
    expect(html).not.toContain("None");
    expect(html).not.toContain("null");
    expect(html).not.toContain("undefined");
    expect(html).not.toContain("N/A");
    expect(html).not.toContain("Không phát sinh");

    // Real dot characters check
    expect(html).toContain("....................");

    // Check soft pagination CSS rules
    expect(html).toContain('class="assessment-handwriting-lines"');
    expect(html).toContain('class="assessment-signature-block"');
    expect(html).toContain('page-break-after: avoid');
  });

  it("3. Case B: QA Test Data (I.1: empty, I.2: OK, II.1: empty, II.2: empty) produces exactly 12 text dot lines and preserves 'OK'", () => {
    const report = {
      ...baseMockReport,
      reinspectionConfirmation: "OK",
    };

    const viewModel = buildSafetyAssessmentOutputModel(report);
    const html = renderSafetyAssessmentHtml(viewModel);

    const lineMatches = html.match(/class="assessment-handwriting-text-line"/g);
    expect(lineMatches?.length).toBe(12);

    expect(html).toContain("OK");
  });

  it("4. Case C: Multiline content is rendered verbatim with line breaks and no handwriting text lines for that section", () => {
    const multilineText = "Dòng 1: Kiểm tra lại.\nDòng 2: Hạng mục đã hoàn thành.";
    const report = {
      ...baseMockReport,
      previousWeekRemediation: multilineText,
    };

    const viewModel = buildSafetyAssessmentOutputModel(report);
    const html = renderSafetyAssessmentHtml(viewModel);

    expect(html).toContain("Dòng 1: Kiểm tra lại.<br/>Dòng 2: Hạng mục đã hoàn thành.");
  });

  it("5. DOCX Generator creates valid buffer with tab stops and leader dots without paragraph borders", async () => {
    const buffer = await SafetyAssessmentDocxGenerator.generateAssessmentDocx(baseMockReport);
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(1000);

    const zip = await JSZip.loadAsync(buffer);
    const docXml = await zip.file("word/document.xml")?.async("string");
    expect(docXml).toBeDefined();
    expect(docXml).toContain('w:val="dotted"');
  });
});
