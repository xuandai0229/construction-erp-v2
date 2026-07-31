import { describe, it, expect } from 'vitest';
import {
  SAFETY_SELF_ASSESSMENT_INSPECTION_TITLE,
  SAFETY_SELF_ASSESSMENT_INSPECTION_CONTENT,
  SAFETY_ASSESSMENT_OFFICIAL_CONTENT,
} from '../safety-assessment-official-content';
import { renderSafetyAssessmentHtml } from '../assessment-html-renderer';

const EXPECTED_20_ITEMS = [
  "Phương tiện bảo vệ bảo hộ cá nhân.",
  "Thiết bị bảo hộ làm việc trên cao (Dây đai, mũ, lưới, hệ thống điểm neo…).",
  "An toàn thang và lối đi lại: Kiểm tra độ an toàn của thang; hướng dẫn công nhân và Chỉ huy đảm bảo các lối lên xuống, lối đi lại chắc chắn.",
  "Hệ thống giàn giáo.",
  "Lưới bao che: Chắn vật liệu rơi, chống bụi và kiểm tra độ võng của lưới",
  "Khu vực nguy hiểm: Hố đào sâu, lỗ mở, hố ga... (Lắp đặt rào chắn và hệ thống văng chống hố đào).",
  "Công việc phát sinh nhiệt: (Hàn, cắt, mối nối... đảm bảo an toàn cháy nổ).",
  "Công việc ngày",
  "Dụng cụ, máy móc, thiết bị: (Kiểm tra độ an toàn và tình trạng vận hành).",
  "Lối đi lại và thoát hiểm: Đảm bảo lối đi thông thoáng, không để vật liệu cản trở để xử lý kịp thời khi có sự cố.",
  "Vệ sinh công trình",
  "Thiết bị và biển báo PCCC: Kiểm tra số lượng, vị trí lắp đặt và tình trạng hoạt động.",
  "Hệ thống biển báo nội quy và cảnh báo: Đảm bảo treo đầy đủ tại: Ban chỉ huy, khu vực làm việc trên cao, tủ điện, khu vực nguy hiểm (cấm tiếp cận khi có thi công phía trên cao), biển cảnh báo giao thông, đèn tín hiệu và đèn phản quang.",
  "Sinh hoạt của công nhân: Kiểm tra an toàn điện sinh hoạt, vệ sinh môi trường nơi ăn ở và lắp đặt đầy đủ biển cảnh báo tại khu vực lưu trú.",
  "Hệ thống điện thi công: Đảm bảo dây dẫn được treo cao, tủ điện đấu nối đúng kỹ thuật; kiểm tra an toàn các ổ cắm và dây nguồn của thiết bị cầm tay.",
  "Hồ sơ nhân công: Kiểm tra tính đầy đủ của hồ sơ pháp lý và chữ ký xác nhận của công nhân.",
  "Công tác huấn luyện: Đảm bảo việc huấn luyện ATLĐ, VSMT, PCCC được thực hiện tập trung và nghiêm túc.",
  "Phối hợp nhân sự: Kiểm tra mức độ phối hợp giữa các Cán bộ chỉ huy trong công tác an toàn.",
  "Chế độ báo cáo: Thực hiện báo cáo định kỳ vào thứ 2 hàng tuần.",
  "Các công tác kiểm tra khác.",
];

describe("Safety Self Assessment (Mẫu 01) Inspection Content Verbatim Manifest Test", () => {
  it("should have exact title 'Nội dung kiểm tra:' with trailing colon", () => {
    expect(SAFETY_SELF_ASSESSMENT_INSPECTION_TITLE).toBe("Nội dung kiểm tra:");
    expect(SAFETY_ASSESSMENT_OFFICIAL_CONTENT.inspectionTitle).toBe("Nội dung kiểm tra:");
  });

  it("should have exactly 20 items ordered sequentially 1 to 20", () => {
    expect(SAFETY_SELF_ASSESSMENT_INSPECTION_CONTENT.length).toBe(20);
    SAFETY_SELF_ASSESSMENT_INSPECTION_CONTENT.forEach((item, index) => {
      expect(item.number).toBe(index + 1);
    });
  });

  it("should match verbatim content for all 20 items without any alterations", () => {
    SAFETY_SELF_ASSESSMENT_INSPECTION_CONTENT.forEach((item, index) => {
      const expectedText = EXPECTED_20_ITEMS[index];
      expect(item.content).toBe(expectedText);
    });
  });

  it("should contain zero Unicode replacement characters or mojibake", () => {
    SAFETY_SELF_ASSESSMENT_INSPECTION_CONTENT.forEach((item) => {
      expect(item.content).not.toContain("\uFFFD");
      expect(item.content).not.toMatch(/[ÃÂÊÔƯàáạảãèéẹẻẽìíịỉĩòóọỏõùúụủũỳýỵỷỹ]{2,}/);
    });
  });

  it("should render full 20 items in HTML/Preview output without old header titles", () => {
    const mockReport = {
      id: "test-id",
      documentNumber: "BC-ATLD-2026-0001",
      officialDocumentNumber: "12/CT2",
      documentPlace: "Hà Nội",
      documentDate: new Date("2026-07-27"),
      reporterName: "Phạm Xuân Quảng",
      reporterTitle: "Cán bộ An toàn",
      reporterDepartment: "Phòng kỹ thuật",
      entries: [],
    };

    const html = renderSafetyAssessmentHtml(mockReport);

    expect(html).toContain("Nội dung kiểm tra:");
    expect(html).not.toContain("Danh mục 20 nội dung kiểm tra tiêu chuẩn (Mẫu 01)");

    EXPECTED_20_ITEMS.forEach((text, idx) => {
      expect(html).toContain(`${idx + 1}.`);
      expect(html).toContain(text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"));
    });
  });
});
