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
  "01_Hợp đồng": {
    key: "01_Hợp đồng",
    title: "Hồ sơ hợp đồng",
    description: "Chỉ lưu hợp đồng chính, phụ lục, bảo lãnh, biên bản ký kết.",
    uploadLabel: "Tải hợp đồng lên",
    allowedExtensions: [".pdf", ".doc", ".docx", ".xls", ".xlsx"],
    accept: ".pdf,.doc,.docx,.xls,.xlsx",
    friendlyAllowedTypes: "PDF, Word, Excel",
    namingHint: "HD_[SoHopDong]_[NgayKy].pdf",
    namingExample: "Ví dụ: HD_12-2026_19062026.pdf",
    emptyStateText: "Chưa có hợp đồng nào trong thư mục này",
  },
  "02_Bản vẽ": {
    key: "02_Bản vẽ",
    title: "Bản vẽ",
    description: "Bản vẽ thiết kế, shopdrawing, hoàn công.",
    uploadLabel: "Tải bản vẽ mới",
    allowedExtensions: [".pdf", ".dwg", ".dxf", ".jpg", ".jpeg", ".png"],
    accept: ".pdf,.dwg,.dxf,.jpg,.jpeg,.png",
    friendlyAllowedTypes: "PDF, DWG, DXF, Ảnh",
    namingHint: "BV_[HangMuc]_[Version].pdf",
    namingExample: "Ví dụ: BV_Mong_Tang1_V01.pdf",
    emptyStateText: "Chưa có bản vẽ nào trong thư mục này",
  },
  "03_Dự toán": {
    key: "03_Dự toán",
    title: "Dự toán",
    description: "Dự toán gốc, dự toán điều chỉnh, bảng khối lượng.",
    uploadLabel: "Tải dự toán lên",
    allowedExtensions: [".pdf", ".xls", ".xlsx"],
    accept: ".pdf,.xls,.xlsx",
    friendlyAllowedTypes: "PDF, Excel",
    namingHint: "DT_[LoaiDuToan]_[NgayLap].xlsx",
    namingExample: "Ví dụ: DT_Goc_19062026.xlsx",
    emptyStateText: "Chưa có dự toán nào trong thư mục này",
  },
  "04_Nghiệm thu": {
    key: "04_Nghiệm thu",
    title: "Hồ sơ nghiệm thu",
    description: "Biên bản nghiệm thu, hồ sơ vật liệu, hồ sơ khối lượng.",
    uploadLabel: "Tải hồ sơ nghiệm thu",
    allowedExtensions: [".pdf", ".doc", ".docx", ".jpg", ".jpeg", ".png"],
    accept: ".pdf,.doc,.docx,.jpg,.jpeg,.png",
    friendlyAllowedTypes: "PDF, Word, Ảnh",
    namingHint: "NT_[HangMuc]_[Ngay].pdf",
    namingExample: "Ví dụ: NT_Mong_19062026.pdf",
    emptyStateText: "Chưa có hồ sơ nghiệm thu nào",
  },
  "05_Hóa đơn": {
    key: "05_Hóa đơn",
    title: "Hóa đơn",
    description: "Chỉ tải hóa đơn VAT, hóa đơn nhà cung cấp hoặc file XML hóa đơn.",
    uploadLabel: "Tải hóa đơn lên",
    allowedExtensions: [".pdf", ".jpg", ".jpeg", ".png", ".xml"],
    accept: ".pdf,.jpg,.jpeg,.png,.xml",
    friendlyAllowedTypes: "PDF, Ảnh, XML",
    namingHint: "HDON_[NhaCungCap]_[SoHoaDon].pdf",
    namingExample: "Ví dụ: HDON_NCC_A_000123.pdf",
    emptyStateText: "Chưa có hóa đơn nào",
  },
  "06_Thanh toán": {
    key: "06_Thanh toán",
    title: "Thanh toán",
    description: "Phiếu chi, ủy nhiệm chi, biên nhận, chứng từ ngân hàng.",
    uploadLabel: "Tải chứng từ TT",
    allowedExtensions: [".pdf", ".jpg", ".jpeg", ".png"],
    accept: ".pdf,.jpg,.jpeg,.png",
    friendlyAllowedTypes: "PDF, Ảnh",
    namingHint: "TT_[Ngay]_[SoTien].pdf",
    namingExample: "Ví dụ: TT_19062026_50000000.pdf",
    emptyStateText: "Chưa có chứng từ thanh toán nào",
  },
  "07_Hình ảnh hiện trường": {
    key: "07_Hình ảnh hiện trường",
    title: "Hình ảnh hiện trường",
    description: "Ảnh công trường, ảnh vật tư, ảnh thi công.",
    uploadLabel: "Tải ảnh hiện trường",
    allowedExtensions: [".jpg", ".jpeg", ".png", ".heic", ".webp"],
    accept: "image/*,.heic,.webp",
    friendlyAllowedTypes: "Ảnh",
    namingHint: "HT_[Ngay]_[KhuVuc].jpg",
    namingExample: "Ví dụ: HT_Mong_A1_19062026.jpg",
    emptyStateText: "Chưa có ảnh hiện trường nào",
  },
  "08_Báo cáo ngày": {
    key: "08_Báo cáo ngày",
    title: "Báo cáo ngày",
    description: "Báo cáo ngày/tuần/tháng, báo cáo chỉ huy trưởng.",
    uploadLabel: "Tải báo cáo lên",
    allowedExtensions: [".pdf", ".doc", ".docx", ".xls", ".xlsx"],
    accept: ".pdf,.doc,.docx,.xls,.xlsx",
    friendlyAllowedTypes: "PDF, Word, Excel",
    namingHint: "BCN_[NgayBaoCao]_[NguoiLap].pdf",
    namingExample: "Ví dụ: BCN_19062026_NguyenVanA.pdf",
    emptyStateText: "Chưa có báo cáo nào",
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
