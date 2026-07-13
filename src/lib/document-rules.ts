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

const OFFICE_AND_IMAGE_EXTENSIONS = [".pdf", ".doc", ".docx", ".xls", ".xlsx", ".jpg", ".jpeg", ".png"];

export const DOCUMENT_FOLDER_RULES: Record<string, DocumentFolderRule> = {
  "01. Hồ sơ pháp lý công trình": {
    key: "01. Hồ sơ pháp lý công trình", title: "Hồ sơ pháp lý công trình", description: "Lưu quyết định, giấy phép, biên bản và hồ sơ pháp lý phục vụ thi công.", uploadLabel: "Tải hồ sơ pháp lý", allowedExtensions: OFFICE_AND_IMAGE_EXTENSIONS, accept: ".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png", friendlyAllowedTypes: "PDF, Word, Excel, Ảnh", namingHint: "PL_[NoiDung]_[Ngay].pdf", namingExample: "Ví dụ: PL_GiayPhep_19062026.pdf", emptyStateText: "Chưa có hồ sơ pháp lý nào",
  },
  "02. Bản vẽ thiết kế": {
    key: "02. Bản vẽ thiết kế", title: "Bản vẽ thiết kế", description: "Lưu bản vẽ thiết kế thi công, shop drawing, bản vẽ điều chỉnh, hoàn công và file CAD.", uploadLabel: "Tải bản vẽ mới", allowedExtensions: [".pdf", ".dwg", ".dxf", ".jpg", ".jpeg", ".png"], accept: ".pdf,.dwg,.dxf,.jpg,.jpeg,.png", friendlyAllowedTypes: "PDF, DWG, DXF, Ảnh", namingHint: "BV_[HangMuc]_[Version].pdf", namingExample: "Ví dụ: BV_Mong_Tang1_V01.pdf", emptyStateText: "Chưa có bản vẽ nào trong thư mục này",
  },
  "03. Biên bản nghiệm thu": {
    key: "03. Biên bản nghiệm thu", title: "Biên bản nghiệm thu", description: "Lưu hồ sơ chất lượng, nghiệm thu vật liệu, công việc, giai đoạn và bàn giao.", uploadLabel: "Tải hồ sơ nghiệm thu", allowedExtensions: OFFICE_AND_IMAGE_EXTENSIONS, accept: ".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png", friendlyAllowedTypes: "PDF, Word, Excel, Ảnh", namingHint: "NT_[HangMuc]_[Ngay].pdf", namingExample: "Ví dụ: NT_Mong_19062026.pdf", emptyStateText: "Chưa có hồ sơ nghiệm thu nào",
  },
  "04. Vật tư thiết bị": {
    key: "04. Vật tư thiết bị", title: "Vật tư thiết bị", description: "Lưu hồ sơ trình duyệt vật tư, chứng chỉ CO/CQ, catalogue và phiếu giao nhận tại công trường.", uploadLabel: "Tải tài liệu vật tư", allowedExtensions: OFFICE_AND_IMAGE_EXTENSIONS, accept: ".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png", friendlyAllowedTypes: "PDF, Word, Excel, Ảnh", namingHint: "VT_[TenVatTu]_[Ngay].pdf", namingExample: "Ví dụ: VT_Thep_19062026.pdf", emptyStateText: "Chưa có tài liệu vật tư nào",
  },
  "05. Hình ảnh tiến độ": {
    key: "05. Hình ảnh tiến độ", title: "Hình ảnh tiến độ", description: "Lưu ảnh thi công, nghiệm thu, nhật ký và ảnh trước/sau khi thi công.", uploadLabel: "Tải ảnh tiến độ", allowedExtensions: [".jpg", ".jpeg", ".png", ".heic", ".webp"], accept: "image/*,.heic,.webp", friendlyAllowedTypes: "Ảnh", namingHint: "HT_[Ngay]_[KhuVuc].jpg", namingExample: "Ví dụ: HT_Mong_A1_19062026.jpg", emptyStateText: "Chưa có ảnh tiến độ nào",
  },
  "06. Báo cáo hiện trường": {
    key: "06. Báo cáo hiện trường", title: "Báo cáo hiện trường", description: "Lưu báo cáo ngày, tuần, tháng, nhật ký thi công và biên bản xử lý phát sinh.", uploadLabel: "Tải báo cáo lên", allowedExtensions: [".pdf", ".doc", ".docx", ".xls", ".xlsx"], accept: ".pdf,.doc,.docx,.xls,.xlsx", friendlyAllowedTypes: "PDF, Word, Excel", namingHint: "BCN_[NgayBaoCao]_[NguoiLap].pdf", namingExample: "Ví dụ: BCN_19062026_NguyenVanA.pdf", emptyStateText: "Chưa có báo cáo nào",
  },
};

export const DEFAULT_DOCUMENT_RULE: DocumentFolderRule = {
  key: "default", title: "Tài liệu khác", description: "Thư mục tùy chỉnh, lưu trữ tài liệu công trình.", uploadLabel: "Tải tài liệu lên", allowedExtensions: OFFICE_AND_IMAGE_EXTENSIONS, accept: ".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png", friendlyAllowedTypes: "PDF, Word, Excel, Ảnh", namingHint: "TenTaiLieu_[Ngay].pdf", namingExample: "Ví dụ: BienBanHop_19062026.pdf", emptyStateText: "Chưa có tài liệu nào trong thư mục này", warning: "Vui lòng đặt tên file rõ ràng để dễ dàng tìm kiếm sau này.",
};

export function getDocumentRule(folderName: string): DocumentFolderRule {
  if (DOCUMENT_FOLDER_RULES[folderName]) return DOCUMENT_FOLDER_RULES[folderName];
  const normalized = folderName.replace(/^\d+[._]\s*/, "").trim().toLowerCase();
  return Object.entries(DOCUMENT_FOLDER_RULES).find(([key]) => key.replace(/^\d+[._]\s*/, "").trim().toLowerCase() === normalized)?.[1] ?? DEFAULT_DOCUMENT_RULE;
}
