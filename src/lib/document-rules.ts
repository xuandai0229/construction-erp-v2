export type DocumentFolderRule = {
  key: string;
  title: string;
  description: string;
  uploadLabel: string;
  allowedExtensions: string[];
  accept: string;
  namingHint: string;
  namingExample?: string;
  friendlyAllowedTypes?: string;
  emptyStateText?: string;
  warning?: string;
};

export const DOCUMENT_FOLDER_RULES: Record<string, DocumentFolderRule> = {
  "01. Hợp đồng pháp lý": {
    key: "01. Hợp đồng pháp lý",
    title: "Hồ sơ hợp đồng pháp lý",
    description: "Lưu hồ sơ hợp đồng, phụ lục,...",
    uploadLabel: "Tải hợp đồng lên",
    allowedExtensions: [".pdf", ".doc", ".docx", ".xls", ".xlsx"],
    accept: ".pdf,.doc,.docx,.xls,.xlsx",
    friendlyAllowedTypes: "PDF, Word, Excel",
    namingHint: "HD_[SoHopDong]_[NgayKy].pdf",
    namingExample: "Ví dụ: HD_12-2026_19062026.pdf",
    emptyStateText: "Chưa có hợp đồng nào trong thư mục này",
  },
  "02. Bản vẽ thiết kế": {
    key: "02. Bản vẽ thiết kế",
    title: "Bản vẽ thiết kế",
    description: "Lưu trữ bản vẽ thiết kế thi công, shop drawing, bản vẽ điều chỉnh, bản vẽ hoàn công và các file CAD liên quan.",
    uploadLabel: "Tải bản vẽ mới",
    allowedExtensions: [".pdf", ".dwg", ".dxf", ".jpg", ".jpeg", ".png"],
    accept: ".pdf,.dwg,.dxf,.jpg,.jpeg,.png",
    friendlyAllowedTypes: "PDF, DWG, DXF, Ảnh",
    namingHint: "BV_[HangMuc]_[Version].pdf",
    namingExample: "Ví dụ: BV_Mong_Tang1_V01.pdf",
    emptyStateText: "Chưa có bản vẽ nào trong thư mục này",
  },
  "03. Biên bản nghiệm thu": {
    key: "03. Biên bản nghiệm thu",
    title: "Biên bản nghiệm thu",
    description: "Lưu trữ hồ sơ chất lượng, biên bản nghiệm thu vật liệu, nghiệm thu công việc, nghiệm thu giai đoạn và bàn giao.",
    uploadLabel: "Tải hồ sơ nghiệm thu",
    allowedExtensions: [".pdf", ".doc", ".docx", ".jpg", ".jpeg", ".png", ".xls", ".xlsx"],
    accept: ".pdf,.doc,.docx,.jpg,.jpeg,.png,.xls,.xlsx",
    friendlyAllowedTypes: "PDF, Word, Excel, Ảnh",
    namingHint: "NT_[HangMuc]_[Ngay].pdf",
    namingExample: "Ví dụ: NT_Mong_19062026.pdf",
    emptyStateText: "Chưa có hồ sơ nghiệm thu nào",
  },
  "04. Vật tư thiết bị": {
    key: "04. Vật tư thiết bị",
    title: "Vật tư thiết bị",
    description: "Lưu trữ hồ sơ trình duyệt vật tư, chứng chỉ CO/CQ, catalogue, báo giá và phiếu giao nhận vật tư thiết bị.",
    uploadLabel: "Tải tài liệu vật tư",
    allowedExtensions: [".pdf", ".doc", ".docx", ".jpg", ".jpeg", ".png", ".xls", ".xlsx"],
    accept: ".pdf,.doc,.docx,.jpg,.jpeg,.png,.xls,.xlsx",
    friendlyAllowedTypes: "PDF, Word, Excel, Ảnh",
    namingHint: "VT_[TenVatTu]_[Ngay].pdf",
    namingExample: "Ví dụ: VT_ThepHoaPhat_19062026.pdf",
    emptyStateText: "Chưa có tài liệu vật tư nào",
  },
  "05. Hình ảnh tiến độ": {
    key: "05. Hình ảnh tiến độ",
    title: "Hình ảnh tiến độ",
    description: "Lưu trữ hình ảnh thi công thực tế, ảnh nghiệm thu, ảnh nhật ký công trình và hình ảnh trước/sau khi thi công.",
    uploadLabel: "Tải ảnh tiến độ",
    allowedExtensions: [".jpg", ".jpeg", ".png", ".heic", ".webp"],
    accept: "image/*,.heic,.webp",
    friendlyAllowedTypes: "Ảnh",
    namingHint: "HT_[Ngay]_[KhuVuc].jpg",
    namingExample: "Ví dụ: HT_Mong_A1_19062026.jpg",
    emptyStateText: "Chưa có ảnh tiến độ nào",
  },
  "06. Báo cáo hiện trường": {
    key: "06. Báo cáo hiện trường",
    title: "Báo cáo hiện trường",
    description: "Lưu trữ báo cáo tuần, báo cáo tháng, nhật ký thi công hiện trường và các biên bản xử lý phát sinh.",
    uploadLabel: "Tải báo cáo lên",
    allowedExtensions: [".pdf", ".doc", ".docx", ".xls", ".xlsx"],
    accept: ".pdf,.doc,.docx,.xls,.xlsx",
    friendlyAllowedTypes: "PDF, Word, Excel",
    namingHint: "BCN_[NgayBaoCao]_[NguoiLap].pdf",
    namingExample: "Ví dụ: BCN_19062026_NguyenVanA.pdf",
    emptyStateText: "Chưa có báo cáo nào",
  },
  "07. Thanh toán quyết toán": {
    key: "07. Thanh toán quyết toán",
    title: "Thanh toán quyết toán",
    description: "Lưu trữ hồ sơ thanh toán, hồ sơ quyết toán, biên bản xác nhận khối lượng, đề nghị thanh toán và hóa đơn.",
    uploadLabel: "Tải chứng từ TT/QT",
    allowedExtensions: [".pdf", ".jpg", ".jpeg", ".png", ".xml", ".xls", ".xlsx"],
    accept: ".pdf,.jpg,.jpeg,.png,.xml,.xls,.xlsx",
    friendlyAllowedTypes: "PDF, Excel, Ảnh, XML",
    namingHint: "TT_[NhaCungCap]_[Ngay].pdf",
    namingExample: "Ví dụ: TT_NCC_A_19062026.pdf",
    emptyStateText: "Chưa có chứng từ thanh toán nào",
  },
};

export const DEFAULT_DOCUMENT_RULE: DocumentFolderRule = {
  key: "default",
  title: "Tài liệu khác",
  description: "Thư mục tùy chỉnh, lưu trữ tài liệu công trình.",
  uploadLabel: "Tải tài liệu lên",
  allowedExtensions: [".pdf", ".doc", ".docx", ".xls", ".xlsx", ".jpg", ".jpeg", ".png"],
  accept: ".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png",
  friendlyAllowedTypes: "PDF, Word, Excel, Ảnh",
  namingHint: "TenTaiLieu_[Ngay].pdf",
  namingExample: "Ví dụ: BienBanHop_19062026.pdf",
  emptyStateText: "Chưa có tài liệu nào trong thư mục này",
  warning: "Vui lòng đặt tên file rõ ràng để dễ dàng tìm kiếm sau này.",
};

export function getDocumentRule(folderName: string): DocumentFolderRule {
  // Direct match first
  if (DOCUMENT_FOLDER_RULES[folderName]) {
    return DOCUMENT_FOLDER_RULES[folderName];
  }
  // Normalize: strip leading digits + separator and match by keyword
  const normalized = folderName.replace(/^\d+[._]\s*/, "").trim().toLowerCase();
  for (const [key, rule] of Object.entries(DOCUMENT_FOLDER_RULES)) {
    const keyNormalized = key.replace(/^\d+[._]\s*/, "").trim().toLowerCase();
    if (keyNormalized === normalized) {
      return rule;
    }
  }
  return DEFAULT_DOCUMENT_RULE;
}
