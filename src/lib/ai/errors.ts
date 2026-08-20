export type AIErrorCode =
  | "UNAUTHENTICATED"
  | "INVALID_REQUEST"
  | "INVALID_INPUT_LENGTH"
  | "PROVIDER_UNAVAILABLE"
  | "PROVIDER_UNAUTHORIZED"
  | "PROVIDER_RATE_LIMITED"
  | "PROVIDER_TIMEOUT"
  | "PROVIDER_FAILED"
  | "PROVIDER_MALFORMED_RESPONSE"
  | "RATE_LIMITED"
  | "PROJECT_NOT_FOUND"
  | "PROJECT_AMBIGUOUS"
  | "PROJECT_SCOPE_DENIED"
  | "PROJECT_REQUIRED"
  | "DATA_UNAVAILABLE"
  | "TOOL_FAILED"
  | "GROUNDING_REQUIRED"
  | "FEATURE_DISABLED"
  | "PILOT_RESTRICTED"
  | "READ_ONLY_REFUSAL"
  | "SECURITY_REFUSAL"
  | "MODEL_NOT_ALLOWED"
  | "REASONING_EFFORT_NOT_ALLOWED"
  | "INTERNAL_ERROR";

export class AIApplicationError extends Error {
  constructor(
    public readonly code: AIErrorCode,
    message: string,
    public readonly httpStatus = 500,
    public readonly details?: {
      retryAfterSeconds?: number;
      requestId?: string;
      candidates?: Array<{ id: string; code: string; name: string }>;
    },
  ) {
    super(message);
    this.name = "AIApplicationError";
  }
}

export function asAIApplicationError(error: unknown): AIApplicationError {
  if (error instanceof AIApplicationError) return error;
  return new AIApplicationError(
    "INTERNAL_ERROR",
    "Không thể hoàn thành yêu cầu AI lúc này. Vui lòng thử lại sau.",
    500,
  );
}
