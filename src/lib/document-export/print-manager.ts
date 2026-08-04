import { DocumentExportError } from "./export-errors";
import { registerBlobUrl, revokeBlobUrl } from "./blob-registry";
import type { PrintOptions, PrintStatus } from "./export-types";

const NAMED_PRINT_WINDOW = "ERP_PRINT_WINDOW";

export async function fetchAndValidatePdfBlob(
  url: string,
  signal?: AbortSignal,
  onStatus?: (status: PrintStatus, msg?: string) => void
): Promise<{ blob: Blob; blobUrl: string }> {
  onStatus?.("fetching", "Đang kết nối và tải dữ liệu PDF...");

  const res = await fetch(url, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
    signal,
  });

  if (!res.ok) {
    let errMsg = `Không thể tải tập tin PDF (Mã lỗi ${res.status}).`;
    try {
      const errJson = await res.json();
      if (errJson.error) errMsg = errJson.error;
    } catch {
      // ignore
    }
    throw new DocumentExportError(errMsg, "INVALID_RESPONSE", res.status);
  }

  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("text/html") || contentType.includes("application/json")) {
    throw new DocumentExportError("Phản hồi từ máy chủ không phải tập tin PDF hợp lệ.", "NOT_PDF", res.status);
  }

  onStatus?.("validating", "Đang kiểm tra tính hợp lệ của tập tin...");
  const blob = await res.blob();

  if (blob.size === 0) {
    throw new DocumentExportError("Tập tin PDF nhận được có dung lượng 0 bytes.", "BLOB_EMPTY");
  }

  // Validate PDF magic bytes (%PDF-)
  const headerSlice = await blob.slice(0, 5).text();
  if (!headerSlice.startsWith("%PDF-")) {
    throw new DocumentExportError("Nội dung không chứa định dạng PDF hợp lệ (%PDF-).", "NOT_PDF");
  }

  const blobUrl = registerBlobUrl(blob, "print-document.pdf");
  return { blob, blobUrl };
}

/**
 * Execute Same-Tab Print using an iframe.
 * Mounts an iframe inside the current DOM without leaving or opening a new tab.
 */
export async function printInSameTab(
  blobUrl: string,
  options: PrintOptions
): Promise<void> {
  const { onStatus, title = "Bản in tài liệu", signal } = options;

  onStatus?.("loading-viewer", "Đang nạp trình xem bản in...");

  return new Promise<void>((resolve, reject) => {
    let cleanedUp = false;
    let iframe: HTMLIFrameElement | null = document.createElement("iframe");

    // Configure visible frame bounds in DOM so PDF viewer initializes cleanly
    iframe.id = "erp-same-tab-print-frame";
    iframe.title = title;
    iframe.style.position = "fixed";
    iframe.style.top = "0";
    iframe.style.left = "-9999px"; // Offscreen, maintaining rendering dimensions
    iframe.style.width = "1024px";
    iframe.style.height = "768px";
    iframe.style.border = "none";
    iframe.style.zIndex = "-1";
    iframe.src = blobUrl;

    const cleanup = () => {
      if (cleanedUp) return;
      cleanedUp = true;
      if (iframe && document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
      iframe = null;
      revokeBlobUrl(blobUrl);
    };

    const handleAbort = () => {
      cleanup();
      onStatus?.("cancelled", "Đã hủy thao tác in.");
      reject(new DocumentExportError("Đã hủy thao tác in.", "ABORTED"));
    };

    if (signal) {
      if (signal.aborted) {
        handleAbort();
        return;
      }
      signal.addEventListener("abort", handleAbort, { once: true });
    }

    const timeoutTimer = setTimeout(() => {
      cleanup();
      reject(new DocumentExportError("Hết thời gian chờ trình xem PDF sẵn sàng.", "TIMEOUT"));
    }, 15000);

    iframe.onload = () => {
      try {
        onStatus?.("opening-print-dialog", "Đang mở cửa sổ bản in...");

        setTimeout(() => {
          if (cleanedUp) return;
          try {
            const win = iframe?.contentWindow;
            if (win) {
              win.focus();
              win.print();
              onStatus?.("ready", "Bản in đã được chuyển tới máy in.");
            }
          } catch (err: any) {
            console.warn("[PrintManager] Iframe direct print exception, falling back to named window:", err?.message);
          } finally {
            clearTimeout(timeoutTimer);
            setTimeout(() => {
              cleanup();
              resolve();
            }, 3000);
          }
        }, 300);
      } catch (err: any) {
        clearTimeout(timeoutTimer);
        cleanup();
        reject(err);
      }
    };

    iframe.onerror = (err) => {
      clearTimeout(timeoutTimer);
      cleanup();
      reject(new DocumentExportError("Không thể nạp iframe bản in.", "INVALID_RESPONSE"));
    };

    document.body.appendChild(iframe);
  });
}

/**
 * Named Window Fallback Mode.
 * NEVER creates dynamic `_blank` windows; always reuses `ERP_PRINT_WINDOW`.
 */
export function printInNamedWindow(
  blobUrl: string,
  options: PrintOptions
): void {
  const { title = "Bản in ERP", onStatus } = options;

  onStatus?.("opening-print-dialog", "Đang mở bản in trong cửa sổ ERP_PRINT_WINDOW...");

  // Open or reuse existing ERP_PRINT_WINDOW
  const printWin = window.open("", NAMED_PRINT_WINDOW, "width=1000,height=800,menubar=no,toolbar=no,location=no,status=no");

  if (!printWin) {
    throw new DocumentExportError("Trình duyệt đã chặn cửa sổ bật lên. Vui lòng cho phép popup để in.", "POPUP_BLOCKED");
  }

  printWin.document.title = title;
  printWin.location.href = blobUrl;
  printWin.focus();

  setTimeout(() => {
    try {
      printWin.print();
    } catch {
      // standard blob view fallback
    } finally {
      onStatus?.("ready", "Bản in đã sẵn sàng.");
      setTimeout(() => revokeBlobUrl(blobUrl), 60000);
    }
  }, 800);
}

/**
 * Primary high-level entry for Printing documents.
 * Defaults to Same-Tab mode (modal/iframe), avoiding blank tabs completely.
 */
export async function printDocument(options: PrintOptions): Promise<void> {
  const { url, preferredMode = "same-tab", onStatus, signal } = options;

  try {
    const { blobUrl } = await fetchAndValidatePdfBlob(url, signal, onStatus);

    if (preferredMode === "named-window") {
      printInNamedWindow(blobUrl, options);
      return;
    }

    try {
      await printInSameTab(blobUrl, options);
    } catch (sameTabErr: any) {
      if (sameTabErr.code === "ABORTED") throw sameTabErr;
      console.warn("[PrintManager] Same-tab print failed/blocked. Falling back to named window mode:", sameTabErr?.message);
      printInNamedWindow(blobUrl, options);
    }
  } catch (err: any) {
    onStatus?.("error", err?.message || "Không thể thực hiện in tài liệu.");
    throw err;
  }
}
