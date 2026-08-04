export type ExportErrorCode =
  | "INVALID_RESPONSE"
  | "BLOB_EMPTY"
  | "NOT_PDF"
  | "NETWORK_ERROR"
  | "POPUP_BLOCKED"
  | "ABORTED"
  | "TIMEOUT"
  | "SERVER_ERROR";

export class DocumentExportError extends Error {
  public readonly code: ExportErrorCode;
  public readonly statusCode?: number;

  constructor(message: string, code: ExportErrorCode, statusCode?: number) {
    super(message);
    this.name = "DocumentExportError";
    this.code = code;
    this.statusCode = statusCode;
  }
}
