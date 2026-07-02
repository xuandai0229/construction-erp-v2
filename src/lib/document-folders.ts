export type FolderTreeItem = {
  id: string;
  parentId: string | null;
};

const FOLDER_DISPLAY_NAME_MAP: Record<string, string> = {
  "01_Hop_dong_Phap_ly": "01. Hợp đồng pháp lý",
  "01. Hop dong Phap ly": "01. Hợp đồng pháp lý",
  "01_Hợp đồng": "01. Hợp đồng pháp lý",
  "01_Hop_dong": "01. Hợp đồng",
  "02_Ban_ve_Thiet_ke": "02. Bản vẽ thiết kế",
  "02. Ban ve Thiet ke": "02. Bản vẽ thiết kế",
  "02_Bản vẽ": "02. Bản vẽ thiết kế",
  "02_Phu_luc_hop_dong": "02. Phụ lục hợp đồng",
  "03_Bien_ban_Nghiem_thu": "03. Biên bản nghiệm thu",
  "03. Bien ban Nghiem thu": "03. Biên bản nghiệm thu",
  "03_Dự toán": "03. Biên bản nghiệm thu",
  "03_Bao_lanh_Bao_hiem": "03. Bảo lãnh bảo hiểm",
  "04_Vat_tu_Thiet_bi": "04. Vật tư thiết bị",
  "04. Vat tu Thiet bi": "04. Vật tư thiết bị",
  "04_Nghiệm thu": "04. Vật tư thiết bị",
  "05_Hinh_anh_Tien_do": "05. Hình ảnh tiến độ",
  "05. Hinh anh Tien do": "05. Hình ảnh tiến độ",
  "05_Hóa đơn": "05. Hình ảnh tiến độ",
  "06_Bao_cao_Hien_truong": "06. Báo cáo hiện trường",
  "06. Bao cao Hien truong": "06. Báo cáo hiện trường",
  "06_Thanh toán": "06. Báo cáo hiện trường",
  "07_Thanh_toan_Quyet_toan": "07. Thanh toán quyết toán",
  "07. Thanh toan Quyet toan": "07. Thanh toán quyết toán",
  "07_Hình ảnh hiện trường": "07. Thanh toán quyết toán",
};

export function formatDocumentFolderName(name: string): string {
  return FOLDER_DISPLAY_NAME_MAP[name] || name;
}

export function buildFolderAncestorChain<T extends FolderTreeItem>(
  folders: T[],
  folderId: string | null,
): string[] {
  if (!folderId) return [];

  const folderById = new Map(folders.map((folder) => [folder.id, folder]));
  const ancestors: string[] = [];
  const seenIds = new Set<string>();
  let current = folderById.get(folderId);

  while (current?.parentId) {
    if (seenIds.has(current.parentId)) break;
    seenIds.add(current.parentId);
    ancestors.unshift(current.parentId);
    current = folderById.get(current.parentId);
  }

  return ancestors;
}
