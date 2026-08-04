import { DocumentExportError } from "./export-errors";
import { registerBlobUrl, revokeBlobUrl } from "./blob-registry";
import type { DownloadOptions } from "./export-types";

export async function downloadDocument(options: DownloadOptions): Promise<void> {
  const { url, filename, expectedType, signal } = options;

  try {
    const res = await fetch(url, {
      method: "GET",
      credentials: "include",
      cache: "no-store",
      signal,
    });

    if (!res.ok) {
      let errMsg = `Tải tập tin thất bại (Mã lỗi ${res.status}).`;
      try {
        const json = await res.json();
        if (json.error) errMsg = json.error;
      } catch {
        // ignore
      }
      throw new DocumentExportError(errMsg, "INVALID_RESPONSE", res.status);
    }

    const contentType = res.headers.get("content-type") || "";
    if (expectedType && !contentType.toLowerCase().includes(expectedType.toLowerCase())) {
      if (contentType.includes("application/json") || contentType.includes("text/html")) {
        throw new DocumentExportError("Máy chủ trả về phản hồi không hợp lệ.", "NOT_PDF", res.status);
      }
    }

    const blob = await res.blob();
    if (blob.size === 0) {
      throw new DocumentExportError("Tập tin tải về rỗng (0 bytes).", "BLOB_EMPTY");
    }

    // Determine target filename from options or Content-Disposition header
    let targetFilename = filename;
    if (!targetFilename) {
      const disposition = res.headers.get("content-disposition") || "";
      const match = disposition.match(/filename\*?=['"]?(?:UTF-8'')?([^;'"]+)['"]?/i);
      if (match && match[1]) {
        targetFilename = decodeURIComponent(match[1]);
      } else {
        targetFilename = "document";
      }
    }

    const blobUrl = registerBlobUrl(blob, targetFilename);

    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = targetFilename;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();

    setTimeout(() => {
      if (document.body.contains(a)) {
        document.body.removeChild(a);
      }
      revokeBlobUrl(blobUrl);
    }, 1000);
  } catch (err: any) {
    if (err.name === "AbortError") {
      throw new DocumentExportError("Đã hủy tải tập tin.", "ABORTED");
    }
    if (err instanceof DocumentExportError) {
      throw err;
    }
    throw new DocumentExportError(err?.message || "Không thể kết nối đến máy chủ.", "NETWORK_ERROR");
  }
}
