export const SAFETY_ERROR_CODES = [
  "SAFETY_UNAUTHENTICATED",
  "SAFETY_FORBIDDEN_OR_NOT_FOUND",
  "SAFETY_VALIDATION_FAILED",
  "SAFETY_STATE_CONFLICT",
  "SAFETY_VERSION_CONFLICT",
  "SAFETY_IDEMPOTENCY_CONFLICT",
  "SAFETY_RESOURCE_LOCKED",
  "SAFETY_TEMPLATE_UNAVAILABLE",
  "SAFETY_INTERNAL_ERROR",
] as const;

export type SafetyErrorCode = (typeof SAFETY_ERROR_CODES)[number];

export class SafetyApiError extends Error {
  readonly code: SafetyErrorCode;
  readonly httpStatus?: number;

  constructor(
    code: SafetyErrorCode,
    message: string,
    options?: { httpStatus?: number },
  ) {
    super(message);
    this.name = "SafetyApiError";
    this.code = code;
    this.httpStatus = options?.httpStatus;
  }
}

export type SafetyErrorDto = {
  code: SafetyErrorCode;
  message: string;
  correlationId: string;
};

const DEFAULT_MESSAGES: Record<SafetyErrorCode, string> = {
  SAFETY_UNAUTHENTICATED: "Vui lòng đăng nhập để tiếp tục.",
  SAFETY_FORBIDDEN_OR_NOT_FOUND:
    "Không thể truy cập dữ liệu ATLĐ được yêu cầu.",
  SAFETY_VALIDATION_FAILED: "Dữ liệu ATLĐ gửi lên không hợp lệ.",
  SAFETY_STATE_CONFLICT: "Trạng thái nghiệp vụ không cho phép thao tác này.",
  SAFETY_VERSION_CONFLICT:
    "Dữ liệu đã được cập nhật ở thiết bị khác. Vui lòng tải lại.",
  SAFETY_IDEMPOTENCY_CONFLICT:
    "Mã thao tác đã được sử dụng cho một nội dung khác.",
  SAFETY_RESOURCE_LOCKED: "Dữ liệu đã khóa và không thể chỉnh sửa.",
  SAFETY_TEMPLATE_UNAVAILABLE:
    "Chưa có checklist ATLĐ phù hợp đang hiệu lực.",
  SAFETY_INTERNAL_ERROR: "Không thể xử lý yêu cầu ATLĐ lúc này.",
};

export function safetyErrorHttpStatus(code: SafetyErrorCode): number {
  switch (code) {
    case "SAFETY_UNAUTHENTICATED":
      return 401;
    case "SAFETY_FORBIDDEN_OR_NOT_FOUND":
      return 404;
    case "SAFETY_VALIDATION_FAILED":
      return 400;
    case "SAFETY_STATE_CONFLICT":
    case "SAFETY_VERSION_CONFLICT":
    case "SAFETY_IDEMPOTENCY_CONFLICT":
    case "SAFETY_RESOURCE_LOCKED":
      return 409;
    case "SAFETY_TEMPLATE_UNAVAILABLE":
      return 503;
    case "SAFETY_INTERNAL_ERROR":
      return 500;
  }
}

export function safetyErrorStatus(error: unknown, code: SafetyErrorCode): number {
  return error instanceof SafetyApiError && error.httpStatus
    ? error.httpStatus
    : safetyErrorHttpStatus(code);
}

export function mapSafetyError(
  error: unknown,
  correlationId: string,
): SafetyErrorDto {
  if (error instanceof SafetyApiError) {
    return {
      code: error.code,
      message: error.message || DEFAULT_MESSAGES[error.code],
      correlationId,
    };
  }

  if (error instanceof Error) {
    const message = error.message;
    const normalizedMessage = message.toLocaleLowerCase("vi");
    if (
      normalizedMessage.includes("không có quyền") ||
      normalizedMessage.includes("không thuộc phạm vi") ||
      normalizedMessage.includes("không tồn tại")
    ) {
      return {
        code: "SAFETY_FORBIDDEN_OR_NOT_FOUND",
        message: DEFAULT_MESSAGES.SAFETY_FORBIDDEN_OR_NOT_FOUND,
        correlationId,
      };
    }
    if (normalizedMessage.includes("khóa")) {
      return {
        code: "SAFETY_RESOURCE_LOCKED",
        message: DEFAULT_MESSAGES.SAFETY_RESOURCE_LOCKED,
        correlationId,
      };
    }
    if (
      normalizedMessage.includes("phiên kiểm tra") ||
      normalizedMessage.includes("trạng thái") ||
      normalizedMessage.includes("đã hoàn thành") ||
      normalizedMessage.includes("đã hủy")
    ) {
      return {
        code: "SAFETY_STATE_CONFLICT",
        message: DEFAULT_MESSAGES.SAFETY_STATE_CONFLICT,
        correlationId,
      };
    }
    if (
      normalizedMessage.includes("phiên bản") ||
      normalizedMessage.includes("thiết bị khác") ||
      normalizedMessage.includes("đã thay đổi")
    ) {
      return {
        code: "SAFETY_VERSION_CONFLICT",
        message: DEFAULT_MESSAGES.SAFETY_VERSION_CONFLICT,
        correlationId,
      };
    }
    if (
      normalizedMessage.includes("mutation id") ||
      normalizedMessage.includes("mã thao tác") ||
      normalizedMessage.includes("nội dung khác")
    ) {
      return {
        code: "SAFETY_IDEMPOTENCY_CONFLICT",
        message: DEFAULT_MESSAGES.SAFETY_IDEMPOTENCY_CONFLICT,
        correlationId,
      };
    }
  }

  return {
    code: "SAFETY_INTERNAL_ERROR",
    message: DEFAULT_MESSAGES.SAFETY_INTERNAL_ERROR,
    correlationId,
  };
}
