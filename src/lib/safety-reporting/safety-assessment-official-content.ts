import { normalizeNfc } from './date-utils';

export const SAFETY_SELF_ASSESSMENT_INSPECTION_TITLE = normalizeNfc('Nội dung kiểm tra:');

export interface SelfAssessmentInspectionItem {
  number: number;
  content: string;
}

export const SAFETY_SELF_ASSESSMENT_INSPECTION_CONTENT: SelfAssessmentInspectionItem[] = [
  { number: 1, content: normalizeNfc('Phương tiện bảo vệ bảo hộ cá nhân.') },
  { number: 2, content: normalizeNfc('Thiết bị bảo hộ làm việc trên cao (Dây đai, mũ, lưới, hệ thống điểm neo…).') },
  { number: 3, content: normalizeNfc('An toàn thang và lối đi lại: Kiểm tra độ an toàn của thang; hướng dẫn công nhân và Chỉ huy đảm bảo các lối lên xuống, lối đi lại chắc chắn.') },
  { number: 4, content: normalizeNfc('Hệ thống giàn giáo.') },
  { number: 5, content: normalizeNfc('Lưới bao che: Chắn vật liệu rơi, chống bụi và kiểm tra độ võng của lưới') },
  { number: 6, content: normalizeNfc('Khu vực nguy hiểm: Hố đào sâu, lỗ mở, hố ga... (Lắp đặt rào chắn và hệ thống văng chống hố đào).') },
  { number: 7, content: normalizeNfc('Công việc phát sinh nhiệt: (Hàn, cắt, mối nối... đảm bảo an toàn cháy nổ).') },
  { number: 8, content: normalizeNfc('Công việc ngày') },
  { number: 9, content: normalizeNfc('Dụng cụ, máy móc, thiết bị: (Kiểm tra độ an toàn và tình trạng vận hành).') },
  { number: 10, content: normalizeNfc('Lối đi lại và thoát hiểm: Đảm bảo lối đi thông thoáng, không để vật liệu cản trở để xử lý kịp thời khi có sự cố.') },
  { number: 11, content: normalizeNfc('Vệ sinh công trình') },
  { number: 12, content: normalizeNfc('Thiết bị và biển báo PCCC: Kiểm tra số lượng, vị trí lắp đặt và tình trạng hoạt động.') },
  { number: 13, content: normalizeNfc('Hệ thống biển báo nội quy và cảnh báo: Đảm bảo treo đầy đủ tại: Ban chỉ huy, khu vực làm việc trên cao, tủ điện, khu vực nguy hiểm (cấm tiếp cận khi có thi công phía trên cao), biển cảnh báo giao thông, đèn tín hiệu và đèn phản quang.') },
  { number: 14, content: normalizeNfc('Sinh hoạt của công nhân: Kiểm tra an toàn điện sinh hoạt, vệ sinh môi trường nơi ăn ở và lắp đặt đầy đủ biển cảnh báo tại khu vực lưu trú.') },
  { number: 15, content: normalizeNfc('Hệ thống điện thi công: Đảm bảo dây dẫn được treo cao, tủ điện đấu nối đúng kỹ thuật; kiểm tra an toàn các ổ cắm và dây nguồn của thiết bị cầm tay.') },
  { number: 16, content: normalizeNfc('Hồ sơ nhân công: Kiểm tra tính đầy đủ của hồ sơ pháp lý và chữ ký xác nhận của công nhân.') },
  { number: 17, content: normalizeNfc('Công tác huấn luyện: Đảm bảo việc huấn luyện ATLĐ, VSMT, PCCC được thực hiện tập trung và nghiêm túc.') },
  { number: 18, content: normalizeNfc('Phối hợp nhân sự: Kiểm tra mức độ phối hợp giữa các Cán bộ chỉ huy trong công tác an toàn.') },
  { number: 19, content: normalizeNfc('Chế độ báo cáo: Thực hiện báo cáo định kỳ vào thứ 2 hàng tuần.') },
  { number: 20, content: normalizeNfc('Các công tác kiểm tra khác.') }
];

export const SAFETY_ASSESSMENT_OFFICIAL_CONTENT = {
  companyNameUpper: normalizeNfc('CÔNG TY CỔ PHẦN XÂY DỰNG VÀ THƯƠNG MẠI SỐ 2 HÀ NỘI'),
  countryTitleUpper: normalizeNfc('CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM'),
  motto: normalizeNfc('Độc lập - Tự do - Hạnh phúc'),
  documentTitleUpper: normalizeNfc('BÁO CÁO TỰ ĐÁNH GIÁ KẾT QUẢ KIỂM TRA ATLĐ, PCCC, VSMT'),
  
  recipientsDefault: [
    normalizeNfc('Ban Giám đốc Công ty;'),
    normalizeNfc('Phòng kỹ thuật')
  ],

  legalBases: [
    normalizeNfc('Căn cứ Quyết định giao việc của lãnh đạo Công ty.'),
    normalizeNfc('Căn cứ kế hoạch kiểm tra công trình Tuần .. tháng.. năm ….. (Từ ngày …… đến ngày ………).'),
    normalizeNfc('Căn cứ các biên bản kiểm tra an toàn, vệ sinh lao động.')
  ],

  defaultReporter: {
    name: normalizeNfc('Phạm Xuân Quảng'),
    title: normalizeNfc('Cán bộ An toàn'),
    department: normalizeNfc('Phòng kỹ thuật')
  },

  inspectionTitle: SAFETY_SELF_ASSESSMENT_INSPECTION_TITLE,
  inspectionItems: SAFETY_SELF_ASSESSMENT_INSPECTION_CONTENT,
  standard20Items: SAFETY_SELF_ASSESSMENT_INSPECTION_CONTENT.map(
    item => `${item.number}. ${item.content}`
  ),

  sectionITitle: normalizeNfc('I. ĐÁNH GIÁ KẾT QUẢ, XỬ LÝ TỒN TẠI CỦA TUẦN TRƯỚC'),
  sectionISub1: normalizeNfc('1. Theo dõi khắc phục các yêu cầu của tuần trước còn tồn đọng'),
  sectionISub2: normalizeNfc('2. Kiểm tra lại sau khắc phục và xác nhận đã hoàn thành'),

  sectionIITitle: normalizeNfc('II. KIẾN NGHỊ ĐỀ XUẤT BAN GIÁM ĐỐC VỀ KẾT QUẢ TUẦN'),
  sectionIISub1: normalizeNfc('1. Bổ sung nhân lực, thiết bị, thay thế đội ngũ yếu kém không đạt về kỹ mỹ thuật, ATLĐ, PCCC, VSMT'),
  sectionIISub2: normalizeNfc('2. Ý kiến khác'),

  recipientFooter: [
    normalizeNfc('Nơi nhận:'),
    normalizeNfc('- Như kính gửi;'),
    normalizeNfc('- Lưu KT.')
  ],

  reporterRoleTitleUpper: normalizeNfc('NGƯỜI LẬP BÁO CÁO')
};
