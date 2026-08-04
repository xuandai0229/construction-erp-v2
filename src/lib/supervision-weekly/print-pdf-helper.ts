import { printDocument, type PrintStatus } from "@/lib/document-export/document-export-client";

/**
 * Helper to trigger browser printing of a pure PDF document binary.
 * Delegates to the unified global Document Export Service (`printDocument`),
 * enforcing same-tab printing without opening blank tabs.
 */
export async function printPdfFromUrl(
  pdfUrl: string,
  onStatusChange?: (status: PrintStatus, message?: string) => void,
  signal?: AbortSignal
): Promise<void> {
  await printDocument({
    url: pdfUrl,
    title: "Báo cáo Giám sát Tuần",
    preferredMode: "same-tab",
    signal,
    onStatus: (status, message) => {
      onStatusChange?.(status, message);
    },
  });
}
