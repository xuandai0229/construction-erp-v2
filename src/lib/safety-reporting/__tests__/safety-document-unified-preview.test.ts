import { describe, it, expect } from "vitest";
import JSZip from "jszip";
import { buildSafetyAssessmentOutputModel } from "../assessment-view-model";
import { renderSafetyAssessmentHtml } from "../assessment-html-renderer";
import { SafetyAssessmentDocxGenerator } from "../assessment-docx-generator";

describe("Unified Safety Document Preview & Column 2 Parity Suite", () => {
  const mockReportWithProject = {
    id: "rep-col2-001",
    documentNumber: "BC-ATLD-2026-0099",
    officialDocumentNumber: "99/BC-ATLD",
    documentPlace: "Hà Nội",
    documentDate: "2026-07-31",
    periodStart: "2026-07-27",
    periodEnd: "2026-08-02",
    reporterName: "Phạm Xuân Quảng",
    reporterTitle: "Cán bộ ATLĐ",
    reporterDepartment: "Phòng Kỹ thuật",
    recipientText: "Ban Giám đốc Công ty",
    previousWeekRemediation: "",
    reinspectionConfirmation: "OK",
    managementRecommendation: "",
    otherOpinion: "",
    entries: [
      {
        id: "entry-01",
        inspectionDate: "2026-07-27",
        shift: "MORNING",
        customProjectName: "Dự án Nhà máy HA02",
        inspectionContent: "Kiểm tra hệ thống giàn giáo ngoài tầng 3",
        assessment: "Đạt yêu cầu an toàn",
        recommendation: "Tiếp tục duy trì",
        implementationResult: "Đã hoàn thành",
        sortOrder: 1,
      },
    ],
  };

  it("1. HTML Renderer renders Column 2 with explicit 'Công trình:' and 'Nội dung kiểm tra:' labels", () => {
    const viewModel = buildSafetyAssessmentOutputModel(mockReportWithProject);
    const html = renderSafetyAssessmentHtml(viewModel);

    expect(html).toContain("Công trình:");
    expect(html).toContain("Dự án Nhà máy HA02");
    expect(html).toContain("Nội dung kiểm tra:");
    expect(html).toContain("Kiểm tra hệ thống giàn giáo ngoài tầng 3");
    expect(html).toContain("class=\"assessment-project-content-cell\"");
  });

  it("2. DOCX Generator renders Column 2 with explicit 'Công trình:' and 'Nội dung kiểm tra:' labels", async () => {
    const buffer = await SafetyAssessmentDocxGenerator.generateAssessmentDocx(mockReportWithProject);
    expect(buffer).toBeInstanceOf(Buffer);

    const zip = await JSZip.loadAsync(buffer);
    const docXml = await zip.file("word/document.xml")?.async("string");
    expect(docXml).toBeDefined();

    expect(docXml).toContain("Công trình:");
    expect(docXml).toContain("Dự án Nhà máy HA02");
    expect(docXml).toContain("Nội dung kiểm tra:");
    expect(docXml).toContain("Kiểm tra hệ thống giàn giáo ngoài tầng 3");
  });

  it("3. Handles entry with only Project Name or only Inspection Content without duplicate labels or empty placeholders", () => {
    const reportOnlyProj = {
      ...mockReportWithProject,
      entries: [
        {
          id: "entry-proj-only",
          inspectionDate: "2026-07-27",
          shift: "MORNING",
          customProjectName: "Tòa nhà Văn phòng 18T",
          inspectionContent: "",
          assessment: "",
          recommendation: "",
          implementationResult: "",
          sortOrder: 1,
        },
      ],
    };

    const viewModel = buildSafetyAssessmentOutputModel(reportOnlyProj);
    const html = renderSafetyAssessmentHtml(viewModel);

    expect(html).toContain("Công trình:");
    expect(html).toContain("Tòa nhà Văn phòng 18T");
    expect(html).not.toContain('<div class="assessment-cell-label">Nội dung kiểm tra:</div>');
    expect(html).not.toContain("None");
    expect(html).not.toContain("null");
  });
});
