export type DocumentPreviewKind = "image" | "pdf" | "details";

const INLINE_IMAGE_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
]);

const GENERIC_BASE_NAMES = new Set([
  "cv",
  "document",
  "file",
  "image",
  "scan",
  "untitled",
]);

function getExtension(fileName: string): string {
  const lastDotIndex = fileName.lastIndexOf(".");
  return lastDotIndex > 0 ? fileName.slice(lastDotIndex) : "";
}

function getBaseName(fileName: string, extension: string): string {
  return extension ? fileName.slice(0, -extension.length) : fileName;
}

export function getDocumentPreviewKind(
  mimeType: string,
  extension: string,
): DocumentPreviewKind {
  const normalizedExtension = extension.toLowerCase();
  const normalizedMimeType = mimeType.toLowerCase();

  if (
    normalizedMimeType === "application/pdf" ||
    normalizedExtension === ".pdf"
  ) {
    return "pdf";
  }

  if (
    normalizedMimeType.startsWith("image/") &&
    INLINE_IMAGE_EXTENSIONS.has(normalizedExtension)
  ) {
    return "image";
  }

  return "details";
}

export function buildDocumentDisplayName(
  requestedName: string,
  originalExtension: string,
): string {
  const name = requestedName.trim();
  const normalizedExtension = originalExtension.startsWith(".")
    ? originalExtension.toLowerCase()
    : `.${originalExtension.toLowerCase()}`;

  if (!name) {
    throw new Error("Tên file không được để trống");
  }

  if (
    name.includes("/") ||
    name.includes("\\") ||
    name.includes("\0") ||
    name.includes("..")
  ) {
    throw new Error("Tên file không hợp lệ");
  }

  const requestedExtension = getExtension(name);
  const baseName = getBaseName(name, requestedExtension).trim();

  if (!baseName) {
    throw new Error("Tên file không được để trống");
  }

  if (
    requestedExtension &&
    requestedExtension.toLowerCase() !== normalizedExtension
  ) {
    throw new Error("Không được thay đổi phần mở rộng của file");
  }

  const displayName = `${baseName}${normalizedExtension}`;
  if (displayName.length > 180) {
    throw new Error("Tên file không được vượt quá 180 ký tự");
  }

  return displayName;
}

export function isPoorDocumentFileName(fileName: string): boolean {
  const extension = getExtension(fileName);
  const baseName = getBaseName(fileName, extension).trim();
  const normalized = baseName.toLowerCase();

  if (GENERIC_BASE_NAMES.has(normalized)) {
    return true;
  }

  if (/^(img|dsc|pxl)[-_]?\d{8,}/i.test(baseName)) {
    return true;
  }

  if (/^z\d{8,}[_-][a-f0-9]{16,}/i.test(baseName)) {
    return true;
  }

  return baseName.length < 4 || /[a-f0-9]{24,}/i.test(baseName);
}

export function hasAllowedDocumentExtension(
  extension: string,
  allowedExtensions: string[],
): boolean {
  const normalizedExtension = extension.toLowerCase();
  return allowedExtensions.some(
    (allowedExtension) =>
      allowedExtension.toLowerCase() === normalizedExtension,
  );
}
