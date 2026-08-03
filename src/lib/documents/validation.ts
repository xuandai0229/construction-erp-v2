import path from "path";

export interface SystemSettingsMock {
  maxUploadSizeMb: number;
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
  settings: SystemSettingsMock,
): ValidationResult {
  const maxBytes = settings.maxUploadSizeMb * 1024 * 1024;
  if (!Number.isSafeInteger(file.size) || file.size <= 0) {
    return { valid: false, error: "Dung lượng tệp không hợp lệ.", reason: "size_invalid" };
  }
  if (file.size > maxBytes) {
    return {
      valid: false,
      error: `Tệp vượt quá dung lượng tối đa ${settings.maxUploadSizeMb} MB.`,
      reason: "size_limit",
      meta: { maxUploadSizeMb: settings.maxUploadSizeMb, receivedBytes: file.size },
    };
  }

  const fileExtension = path.extname(file.name).toLowerCase();
  const extClean = fileExtension.replace(/^\./, "");
  const allowedExts = settings.allowedExtensions
    .split(",")
    .map((extension) => extension.trim().toLowerCase().replace(/^\./, ""));
  const dangerExts = ["exe", "bat", "cmd", "sh", "js", "msi", "ps1", "vbs", "php", "asp", "aspx", "cgi", "pl", "py"];

  if (!extClean || !allowedExts.includes(extClean) || dangerExts.includes(extClean)) {
    return {
      valid: false,
      error: `Định dạng ${fileExtension || "không xác định"} không được phép. Các định dạng hợp lệ: ${settings.allowedExtensions}`,
      reason: "extension",
      meta: { extension: extClean },
    };
  }

  if (settings.enforceNamingConvention) {
    const nameWithoutExt = path.basename(file.name, fileExtension);
    if (nameWithoutExt.length < 3) {
      return {
        valid: false,
        error: "Tên tệp tin quá ngắn. Yêu cầu đặt tên rõ ràng.",
        reason: "naming_short",
      };
    }
    const genericNames = ["camera", "chat", "image", "untitled", "new document", "document"];
    if (genericNames.some((generic) => nameWithoutExt.toLowerCase().includes(generic))) {
      return {
        valid: false,
        error: "Tên tệp tin quá chung chung (camera, image,...). Vui lòng đặt tên mô tả đúng nội dung.",
        reason: "naming_generic",
      };
    }
    if (/[\\/:]/.test(file.name) || file.name.includes("..")) {
      return {
        valid: false,
        error: "Tên tệp tin chứa ký tự không hợp lệ hoặc đường dẫn giả mạo.",
        reason: "naming_traversal",
      };
    }
  }

  return { valid: true };
}
