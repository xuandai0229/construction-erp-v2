export const DocumentTypeOptions: Record<string, { value: string; label: string }[]> = {
  "01. Bản vẽ thiết kế": [
    { value: "DESIGN_DRAWING", label: "Bản vẽ thiết kế" },
    { value: "SHOPDRAWING", label: "Shopdrawing" },
    { value: "AS_BUILT", label: "Bản vẽ hoàn công" },
    { value: "CAD_FILE", label: "File CAD/Gốc" }
  ],
  "02. Biên bản nghiệm thu": [
    { value: "ACCEPTANCE_RECORD", label: "Biên bản nghiệm thu" },
    { value: "MATERIAL_ACCEPTANCE", label: "Nghiệm thu vật liệu" },
    { value: "VOLUME_ACCEPTANCE", label: "Nghiệm thu khối lượng" }
  ],
  "03. Vật tư thiết bị": [
    { value: "MATERIAL_RECEIPT_NOTE", label: "Phiếu xuất nhập" },
    { value: "TECHNICAL_DOC", label: "Tài liệu kỹ thuật" },
    { value: "WARRANTY_CARD", label: "Phiếu bảo hành" }
  ],
  "04. Hình ảnh tiến độ": [
    { value: "SITE_PHOTO", label: "Ảnh tổng quan" },
    { value: "MATERIAL_PHOTO", label: "Ảnh vật tư" },
    { value: "PROGRESS_PHOTO", label: "Ảnh tiến độ thi công" }
  ],
  "05. Báo cáo hiện trường": [
    { value: "DAILY_REPORT", label: "Báo cáo ngày" },
    { value: "WEEKLY_REPORT", label: "Báo cáo tuần" },
    { value: "MONTHLY_REPORT", label: "Báo cáo tháng" }
  ]
};

function normalizeFolderKey(name: string): string {
  return name.replace(/^\d+[._]\s*/, "").trim().toLowerCase();
}

export function getDocumentTypeOptionsForFolder(folderName: string) {
  // Direct match
  if (DocumentTypeOptions[folderName]) {
    return DocumentTypeOptions[folderName];
  }
  // Normalized match
  const normalized = normalizeFolderKey(folderName);
  for (const key of Object.keys(DocumentTypeOptions)) {
    if (normalizeFolderKey(key) === normalized) {
      return DocumentTypeOptions[key];
    }
  }
  return [];
}

export function getDocumentTypeLabel(typeValue: string | null | undefined): string {
  if (!typeValue) return "Khác";
  for (const group of Object.values(DocumentTypeOptions)) {
    const found = group.find(opt => opt.value === typeValue);
    if (found) return found.label;
  }
  return typeValue;
}
