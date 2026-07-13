export type FolderTreeItem = {
  id: string;
  parentId: string | null;
};

const FOLDER_DISPLAY_NAME_MAP: Record<string, string> = {
  "02_Ban_ve_Thiet_ke": "02. Bản vẽ thiết kế",
  "03_Bien_ban_Nghiem_thu": "03. Biên bản nghiệm thu",
  "04_Vat_tu_Thiet_bi": "04. Vật tư thiết bị",
  "05_Hinh_anh_Tien_do": "05. Hình ảnh tiến độ",
  "06_Bao_cao_Hien_truong": "06. Báo cáo hiện trường",
  // Custom technical-folder mappings
  "01_Kien_truc": "01. Kiến trúc",
  "02_Ket_cau": "02. Kết cấu",
  "03_MEP": "03. MEP",
  "04_PCCC": "04. PCCC",
  "05_Shopdrawing": "05. Shop drawing",
};

export function formatDocumentFolderName(name: string): string {
  if (FOLDER_DISPLAY_NAME_MAP[name]) {
    return FOLDER_DISPLAY_NAME_MAP[name];
  }

  // Fallback parsing for unmatched names
  let formatted = name.replace(/_/g, " ");
  // Match things like "01 " and change to "01. "
  formatted = formatted.replace(/^(\d+)\s/, "$1. ");
  
  return formatted;
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
