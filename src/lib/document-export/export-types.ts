export type PrintStatus =
  | "idle"
  | "preparing"
  | "fetching"
  | "validating"
  | "loading-viewer"
  | "opening-print-dialog"
  | "ready"
  | "cancelled"
  | "error";

export interface PrintOptions {
  url: string;
  title?: string;
  filename?: string;
  preferredMode?: "same-tab" | "named-window";
  fallbackMode?: "named-window";
  signal?: AbortSignal;
  onStatus?: (status: PrintStatus, message?: string) => void;
}

export interface DownloadOptions {
  url: string;
  filename?: string;
  expectedType?: string;
  signal?: AbortSignal;
  onProgress?: (percent: number) => void;
}

export interface ExportMetrics {
  totalDurationMs: number;
  fetchDurationMs: number;
  renderDurationMs: number;
  blobSize: number;
  mode: "same-tab" | "named-window";
}
