export const DocumentTypeOptions: Record<string, { value: string; label: string }[]> = {
  "01_Hợp đồng": [
    { value: "MAIN_CONTRACT", label: "Hợp đồng chính" },
    { value: "APPENDIX", label: "Phụ lục" },
    { value: "GUARANTEE", label: "Bảo lãnh" },
    { value: "MINUTES", label: "Biên bản" }
  ],
  "02_Bản vẽ": [
    { value: "DESIGN_DRAWING", label: "Bản vẽ thiết kế" },
    { value: "SHOPDRAWING", label: "Shopdrawing" },
    { value: "AS_BUILT", label: "Bản vẽ hoàn công" },
    { value: "CAD_FILE", label: "File CAD/Gốc" }
  ],
  "03_Dự toán": [
    { value: "ORIGINAL_ESTIMATE", label: "Dự toán ban đầu" },
    { value: "REVISED_ESTIMATE", label: "Dự toán điều chỉnh" },
    { value: "BOQ", label: "Bảng khối lượng (BOQ)" }
  ],
  "04_Nghiệm thu": [
    { value: "ACCEPTANCE_RECORD", label: "Biên bản nghiệm thu" },
    { value: "MATERIAL_ACCEPTANCE", label: "Nghiệm thu vật liệu" },
    { value: "VOLUME_ACCEPTANCE", label: "Nghiệm thu khối lượng" }
  ],
  "05_Hóa đơn": [
    { value: "VAT_INVOICE", label: "Hóa đơn VAT" },
    { value: "SUPPLIER_INVOICE", label: "Hóa đơn NCC" },
    { value: "XML_INVOICE", label: "Hóa đơn XML" }
  ],
  "06_Thanh toán": [
    { value: "PAYMENT_ORDER", label: "Ủy nhiệm chi" },
    { value: "BANK_TRANSFER", label: "Giấy chuyển tiền" },
    { value: "RECEIPT", label: "Phiếu thu/chi" }
  ],
  "07_Hình ảnh hiện trường": [
    { value: "SITE_PHOTO", label: "Ảnh tổng quan" },
    { value: "MATERIAL_PHOTO", label: "Ảnh vật tư" },
    { value: "PROGRESS_PHOTO", label: "Ảnh tiến độ thi công" }
  ],
  "08_Báo cáo ngày": [
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
