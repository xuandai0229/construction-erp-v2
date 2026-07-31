import { describe, it, expect } from "vitest";
import { buildSafetyAssessmentOutputModel } from "../assessment-view-model";
import { renderSafetyAssessmentHtml } from "../assessment-html-renderer";
import { SAFETY_SELF_ASSESSMENT_INSPECTION_CONTENT } from "../safety-assessment-official-content";
import { SAFETY_DOCUMENT_TYPOGRAPHY } from "../date-utils";

describe("Safety Self-Assessment (Mẫu 01) — HTML Preview Parity & Clean Rendering Suite", () => {
  const mockReport = {
    id: "rep-preview-001",
    documentNumber: "BC-ATLD-2026-0005",
    officialDocumentNumber: "12/BC-ATLD",
    documentPlace: "Hà Nội",
    documentDate: new Date("2026-07-31"),
    periodStart: new Date("2026-07-27"),
    periodEnd: new Date("2026-08-02"),
    reporterName: "Nguyễn Văn B",
    reporterTitle: "Cán bộ ATLĐ",
    reporterDepartment: "Phòng Kỹ thuật",
    recipientText: "Ban Giám đốc Công ty; Phòng Kỹ thuật",
    previousWeekRemediation: "Đã xử lý 10/10 lỗi giàn giáo.",
    reinspectionConfirmation: "Xác nhận đạt yêu cầu an toàn.",
    managementRecommendation: "Bổ sung thêm 5 bình chữa cháy bột.",
    otherOpinion: "",
    entries: [
      {
        id: "ent-1",
        inspectionDate: "2026-07-27",
        shift: "MORNING",
        customProjectName: "Dự án Tòa nhà A",
        inspectionContent: "Kiểm tra hệ thống điện thi công",
        assessment: "Đạt tiêu chuẩn an toàn",
        recommendation: "Tiếp tục duy trì",
        implementationResult: "Đã hoàn thành",
        sortOrder: 1,
      },
    ],
  };

  it("1. Does NOT contain legacy PDF iframe, object/embed tags or technical Golden Master description", () => {
    const viewModel = buildSafetyAssessmentOutputModel(mockReport);
    const html = renderSafetyAssessmentHtml(viewModel);

    expect(html).not.toContain("<iframe");
    expect(html).not.toContain("<object");
    expect(html).not.toContain("<embed");
    expect(html).not.toContain("Golden Master Word template");
    expect(html).not.toContain("pdfjs");
    expect(html).not.toContain("viewer.html");
  });

  it("2. Contains all 20 official inspection items of Mẫu 01", () => {
    const viewModel = buildSafetyAssessmentOutputModel(mockReport);
    const html = renderSafetyAssessmentHtml(viewModel);

    expect(SAFETY_SELF_ASSESSMENT_INSPECTION_CONTENT).toHaveLength(20);
    SAFETY_SELF_ASSESSMENT_INSPECTION_CONTENT.forEach((item) => {
      expect(html).toContain(item.content);
    });
  });

  it("3. Features correct 5-column table structure and labels", () => {
    const viewModel = buildSafetyAssessmentOutputModel(mockReport);
    const html = renderSafetyAssessmentHtml(viewModel);

    expect(html).toContain("NGÀY KIỂM TRA");
    expect(html).toContain("CÔNG TRÌNH/NỘI DUNG KIỂM TRA");
    expect(html).toContain("ĐÁNH GIÁ CÔNG TRÌNH");
    expect(html).toContain("KIẾN NGHỊ YÊU CẦU");
    expect(html).toContain("KẾT QUẢ THỰC HIỆN");

    // 7 days Mon-Sun
    expect(viewModel.days).toHaveLength(7);
    expect(viewModel.days[0].dayName).toBe("Thứ Hai");
    expect(viewModel.days[6].dayName).toBe("Chủ Nhật");

    // 3 shifts per day (MORNING, AFTERNOON, EVENING)
    viewModel.days.forEach((day) => {
      expect(day.shifts).toHaveLength(3);
      expect(day.shifts[0].shiftLabel).toBe("Sáng");
      expect(day.shifts[1].shiftLabel).toBe("Chiều");
      expect(day.shifts[2].shiftLabel).toBe("Tối");
    });
  });

  it("4. Ensures Zero Placeholder policy: No 'None', 'null', 'undefined', 'N/A' or ghost dashes", () => {
    const reportWithEmpties = {
      ...mockReport,
      previousWeekRemediation: "",
      reinspectionConfirmation: "",
      managementRecommendation: "",
      otherOpinion: "",
      entries: [],
    };

    const viewModel = buildSafetyAssessmentOutputModel(reportWithEmpties);
    const html = renderSafetyAssessmentHtml(viewModel);

    expect(html).not.toContain("None");
    expect(html).not.toContain("null");
    expect(html).not.toContain("undefined");
    expect(html).not.toContain("N/A");
    expect(html).not.toContain("(Không có)");
  });

  it("5. Verifies Times New Roman font stack and Vietnamese NFC Unicode integrity", () => {
    const viewModel = buildSafetyAssessmentOutputModel(mockReport);
    const html = renderSafetyAssessmentHtml(viewModel);

    expect(SAFETY_DOCUMENT_TYPOGRAPHY.fontFamily).toContain("Times New Roman");
    expect(html).not.toContain("Chiề u");
    expect(html).not.toContain("Tố i");
    expect(html).not.toContain("\uFFFD");
  });

  it("6. Verifies print media query styles suppress ERP chrome", () => {
    const viewModel = buildSafetyAssessmentOutputModel(mockReport);
    const html = renderSafetyAssessmentHtml(viewModel);

    expect(html).toContain("@media print");
    expect(html).toContain("A4 portrait");
  });
});
