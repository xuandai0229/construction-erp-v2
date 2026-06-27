import path from "path";

export interface SystemSettingsMock {
  allowedExtensions: string;
  enforceNamingConvention: boolean;
}

export interface FileMetaMock {
  name: string;
  size: number;
}

export type ValidationResult = 
  | { valid: true }
  | { valid: false; error: string; reason: string; meta?: any };

export function validateDocumentUploadPolicy(
  file: FileMetaMock,
  settings: SystemSettingsMock
): ValidationResult {
  // 1. Extension
  const fileExtension = path.extname(file.name).toLowerCase();
  const extClean = fileExtension.replace(/^\./, "");
  
  const allowedExts = settings.allowedExtensions.split(",").map(e => e.trim().toLowerCase().replace(/^\./, ""));
  const dangerExts = ["exe", "bat", "cmd", "sh", "js", "msi", "ps1", "vbs"];
  
  if (!allowedExts.includes(extClean) || dangerExts.includes(extClean)) {
    return {
      valid: false,
      error: `Định dạng ${fileExtension || "không xác định"} không được phép. Các định dạng hợp lệ: ${settings.allowedExtensions}`,
      reason: "extension",
      meta: { extension: extClean }
    };
  }

  // 3. Naming Convention
  if (settings.enforceNamingConvention) {
    const nameWithoutExt = path.basename(file.name, fileExtension);
    if (nameWithoutExt.length < 3) {
      return { valid: false, error: "Tên tệp tin quá ngắn. Yêu cầu đặt tên rõ ràng.", reason: "naming_short" };
    }
    const genericNames = ["camera", "chat", "image", "untitled", "new document", "document"];
    if (genericNames.some(g => nameWithoutExt.toLowerCase().includes(g))) {
      return { valid: false, error: "Tên tệp tin quá chung chung (camera, image,...). Vui lòng đặt tên mô tả đúng nội dung.", reason: "naming_generic" };
    }
    if (/[\\/:]/.test(file.name) || file.name.includes("..")) {
      return { valid: false, error: "Tên tệp tin chứa ký tự không hợp lệ hoặc đường dẫn giả mạo.", reason: "naming_traversal" };
    }
  }

  return { valid: true };
}
