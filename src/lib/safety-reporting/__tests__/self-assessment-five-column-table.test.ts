import { describe, it, expect } from 'vitest';
import { buildSafetyAssessmentOutputModel } from '../assessment-view-model';
import { renderSafetyAssessmentHtml } from '../assessment-html-renderer';

describe("Safety Self-Assessment (Mẫu 01) 5-Column Inspection Table Rebuild Test Suite", () => {
  const mockReport = {
    id: "report-test-01",
    documentNumber: "BC-ATLD-2026-0001",
    officialDocumentNumber: "12/CT2",
    documentPlace: "Hà Nội",
    documentDate: new Date("2026-07-27"),
    periodStart: new Date("2026-07-27"), // Mon
    periodEnd: new Date("2026-08-02"),   // Sun
    reporterName: "Phạm Xuân Quảng",
    reporterTitle: "Cán bộ An toàn",
    reporterDepartment: "Phòng kỹ thuật",
    entries: [
      {
        id: "e1",
        inspectionDate: new Date("2026-07-27"), // Monday
        shift: "MORNING",
        projectId: "proj-1",
        projectNameSnapshot: "Công trình Nhà ở Cao tầng HH1",
        inspectionContent: "1. Phương tiện bảo vệ bảo hộ cá nhân; 2. Thiết bị bảo hộ làm việc trên cao.",
        assessment: "Công nhân tuân thủ đeo dây an toàn và mũ bảo hộ 100%.",
        recommendation: "Yêu cầu duy trì kiểm tra đầu giờ hàng ngày.",
        implementationResult: "Đã khắc phục xong và bổ sung 05 mũ mới.",
        sortOrder: 1,
      },
      {
        id: "e2",
        inspectionDate: new Date("2026-07-27"), // Monday - Multi-row in same shift
        shift: "MORNING",
        customProjectName: "Hạng mục Hạ tầng Kỹ thuật Ngoài trời (Nhập tự do)",
        inspectionContent: "15. Hệ thống điện thi công: Đảm bảo dây dẫn được treo cao.",
        assessment: "Tủ điện thi công tạm thời cần bổ sung khóa bảo vệ.",
        recommendation: "Yêu cầu đội điện lắp đặt ổ cắm chống nước.",
        implementationResult: "Đã hoàn thành bàn giao lúc 11h00.",
        sortOrder: 2,
      },
      {
        id: "e3",
        inspectionDate: new Date("2026-07-28"), // Tuesday
        shift: "AFTERNOON",
        projectId: "proj-1",
        projectNameSnapshot: "Công trình Nhà ở Cao tầng HH1",
        inspectionContent: "6. Khu vực nguy hiểm: Hố đào sâu, lỗ mở, hố ga.",
        assessment: "Lỗ mở tầng 5 đã có rào chắn cảnh báo màu đỏ.",
        recommendation: "Đề nghị kiểm tra thêm đèn tín hiệu ban đêm.",
        implementationResult: "Ban chỉ huy đã phê duyệt thiết bị.",
        sortOrder: 1,
      },
    ],
  };

  it("should correctly map 7 days and 3 shifts (21 total shifts structure)", () => {
    const model = buildSafetyAssessmentOutputModel(mockReport);
    expect(model.days.length).toBe(7);
    expect(model.days[0].dayName).toBe("Thứ Hai");
    expect(model.days[6].dayName).toBe("Chủ Nhật");

    model.days.forEach((day) => {
      expect(day.shifts.length).toBe(3);
      expect(day.shifts.map(s => s.shiftKey)).toEqual(["MORNING", "AFTERNOON", "EVENING"]);
    });
  });

  it("should support multiple entries in the same shift and sort them by sortOrder", () => {
    const model = buildSafetyAssessmentOutputModel(mockReport);
    const monMorning = model.days[0].shifts[0];
    expect(monMorning.entries.length).toBe(2);
    expect(monMorning.entries[0].projectName).toBe("Công trình Nhà ở Cao tầng HH1");
    expect(monMorning.entries[1].projectName).toBe("Hạng mục Hạ tầng Kỹ thuật Ngoài trời (Nhập tự do)");
  });

  it("should distinguish between existing project snapshot and custom project name", () => {
    const model = buildSafetyAssessmentOutputModel(mockReport);
    expect(model.flatEntries[0].customProjectName).toBeNull();
    expect(model.flatEntries[1].customProjectName).toBe("Hạng mục Hạ tầng Kỹ thuật Ngoài trời (Nhập tự do)");
  });

  it("should render physical 5-column table with exact headers and no edit action column in HTML", () => {
    const html = renderSafetyAssessmentHtml(mockReport);

    expect(html).toContain("NGÀY KIỂM TRA");
    expect(html).toContain("CÔNG TRÌNH/NỘI DUNG KIỂM TRA");
    expect(html).toContain("ĐÁNH GIÁ CÔNG TRÌNH");
    expect(html).toContain("KIẾN NGHỊ YÊU CẦU");
    expect(html).toContain("KẾT QUẢ THỰC HIỆN");

    // Action menu buttons must not be in official document HTML
    expect(html).not.toContain("Thêm dòng");
    expect(html).not.toContain("SafetyRowActionMenu");
    expect(html).not.toContain("delete-row");
  });

  it("should preserve NFC Unicode text across all 5 fields", () => {
    const model = buildSafetyAssessmentOutputModel(mockReport);
    const entry = model.flatEntries[0];
    expect(entry.assessment).toBe("Công nhân tuân thủ đeo dây an toàn và mũ bảo hộ 100%.");
    expect(entry.recommendation).toBe("Yêu cầu duy trì kiểm tra đầu giờ hàng ngày.");
    expect(entry.implementationResult).toBe("Đã khắc phục xong và bổ sung 05 mũ mới.");
  });
});
