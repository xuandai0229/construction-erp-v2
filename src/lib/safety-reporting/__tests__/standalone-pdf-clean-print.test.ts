import { describe, it, expect } from "vitest";
import { buildSafetyPlanPreviewModel } from "../plan-view-model";
import { renderSafetyPlanStandaloneHtml } from "../html-renderer";
import { buildSafetyAssessmentOutputModel } from "../assessment-view-model";
import { renderSafetyAssessmentHtml } from "../assessment-html-renderer";

describe("Standalone A4 HTML Clean Output Test Suite", () => {
  const mockPlan = {
    id: "plan-test-123",
    documentNumber: "KH-ATLD-2026-0001",
    officialDocumentNumber: "15/KH-ATLD",
    periodStart: "2026-07-20T00:00:00.000Z",
    createdDate: "2026-07-20T00:00:00.000Z",
    createdBy: { name: "Nguyễn Văn A" },
    recipients: {
      place: "Hà Nội",
      recipientName: "Ban Giám đốc, Các BCH công trường",
      recipientTitle: "Phòng Kỹ thuật",
    },
    entries: [
      {
        id: "e1",
        inspectionDate: "2026-07-20T00:00:00.000Z",
        shift: "MORNING",
        location: "Dự án Tòa nhà A",
        inspectionContent: "Kiểm tra giàn giáo ngoài",
        note: "Đã khắc phục",
      },
    ],
  };

  const mockAssessment = {
    id: "report-test-456",
    documentNumber: "BC-ATLD-2026-0001",
    officialDocumentNumber: "08/BC-ATLD",
    periodStart: new Date("2026-07-27"),
    createdDate: new Date("2026-07-27"),
    reporterName: "Nguyễn Văn B",
    reporterTitle: "Cán bộ Safety",
    reporterDepartment: "Phòng Kỹ thuật - An toàn",
    recipientText: "Ban Giám đốc Công ty",
    entries: [
      {
        id: "r1",
        inspectionDate: new Date("2026-07-27"),
        shift: "MORNING",
        customProjectName: "Công trình Nhà xưởng B",
        inspectionContent: "Kiểm tra hệ thống điện tạm",
        assessment: "Cáp điện chùng",
        recommendation: "Treo cao cáp điện",
        implementationResult: "Đã hoàn thành",
      },
    ],
  };

  it("Mẫu 02 (Kế hoạch) Standalone HTML must NOT contain ERP AppShell chrome or UI elements", () => {
    const viewModel = buildSafetyPlanPreviewModel(mockPlan);
    const html = renderSafetyPlanStandaloneHtml(viewModel);

    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("KẾ HOẠCH KIỂM TRA ATLĐ, PCCC, VSMT CÔNG TRÌNH");
    expect(html).toContain("15/KH-ATLD");

    // ABSOLUTE FORBIDDEN ERP STRINGS
    expect(html).not.toContain("Phạm vi dữ liệu");
    expect(html).not.toContain("Toàn hệ thống");
    expect(html).not.toContain("ERP Công trình");
    expect(html).not.toContain("localhost:");
    expect(html).not.toContain("data-preview-toolbar");
    expect(html).not.toContain("Quay lại chỉnh sửa");
  });

  it("Mẫu 01 (Báo cáo) Standalone HTML must NOT contain ERP AppShell chrome or UI elements", () => {
    const viewModel = buildSafetyAssessmentOutputModel(mockAssessment);
    const html = renderSafetyAssessmentHtml(viewModel);

    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("BÁO CÁO TỰ ĐÁNH GIÁ KẾT QUẢ KIỂM TRA ATLĐ, PCCC, VSMT");
    expect(html).toContain("08/BC-ATLD");

    // ABSOLUTE FORBIDDEN ERP STRINGS
    expect(html).not.toContain("Phạm vi dữ liệu");
    expect(html).not.toContain("Toàn hệ thống");
    expect(html).not.toContain("ERP Công trình");
    expect(html).not.toContain("localhost:");
    expect(html).not.toContain("data-preview-toolbar");
    expect(html).not.toContain("Quay lại chỉnh sửa");
  });

  it("Mẫu 01 Standalone HTML correctly separates Project Name and Inspection Content labels", () => {
    const viewModel = buildSafetyAssessmentOutputModel(mockAssessment);
    const html = renderSafetyAssessmentHtml(viewModel);

    expect(html).toContain("Công trình Nhà xưởng B");
    expect(html).toContain("Kiểm tra hệ thống điện tạm");
    expect(html).toContain("ĐÁNH GIÁ CÔNG TRÌNH");
    expect(html).toContain("KIẾN NGHỊ YÊU CẦU");
    expect(html).toContain("KẾT QUẢ THỰC HIỆN");
  });
});
