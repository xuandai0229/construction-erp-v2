import path from "path";

export type DocumentUploadRequestMetadata = {
  projectId: string;
  folderId: string;
  originalName: string;
  requestedDisplayName: string | null;
  documentType: string | null;
  note: string | null;
  contentType: string;
  size: number;
};

function getRequiredSearchParam(url: URL, key: string): string {
  const value = url.searchParams.get(key)?.trim();
  if (!value) {
    throw new Error(`Thiếu ${key}`);
  }
  return value;
}

function assertSafeFileName(fileName: string) {
  const base = path.basename(fileName);
  if (
    !base ||
    base !== fileName ||
    fileName.includes("..") ||
    fileName.includes("/") ||
    fileName.includes("\\") ||
    fileName.includes("\0")
  ) {
    throw new Error("Tên file không hợp lệ");
  }
}

export function parseDocumentUploadRequest(
  request: Pick<Request, "url" | "headers">,
): DocumentUploadRequestMetadata {
  const url = new URL(request.url);
  const projectId = getRequiredSearchParam(url, "projectId");
  const folderId = getRequiredSearchParam(url, "folderId");
  const originalName = getRequiredSearchParam(url, "fileName");
  assertSafeFileName(originalName);

  const contentLength = request.headers.get("content-length");
  const size = contentLength ? Number(contentLength) : Number.NaN;
  if (!Number.isSafeInteger(size) || size <= 0) {
    throw new Error("Dung lượng tệp tải lên không hợp lệ hoặc thiếu thông tin dung lượng.");
  }

  return {
    projectId,
    folderId,
    originalName,
    requestedDisplayName: url.searchParams.get("displayName"),
    documentType: url.searchParams.get("documentType"),
    note: url.searchParams.get("note"),
    contentType:
      request.headers.get("content-type")?.split(";")[0]?.trim() ||
      "application/octet-stream",
    size,
  };
}
