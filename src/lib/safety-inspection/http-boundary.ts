import { ZodError, type ZodType } from "zod";
import { SafetyApiError } from "./errors";

export const SAFETY_JSON_BODY_LIMIT_BYTES = 256 * 1024;

export async function parseSafetyJsonBody<T>(
  request: Request,
  schema: ZodType<T>,
  maxBytes = SAFETY_JSON_BODY_LIMIT_BYTES,
): Promise<T> {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.startsWith("application/json")) {
    throw new SafetyApiError(
      "SAFETY_VALIDATION_FAILED",
      "Yêu cầu phải sử dụng định dạng JSON.",
      { httpStatus: 415 },
    );
  }
  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw new SafetyApiError(
      "SAFETY_VALIDATION_FAILED",
      "Dữ liệu gửi lên vượt quá dung lượng cho phép.",
      { httpStatus: 413 },
    );
  }
  const text = await request.text();
  if (!text.trim()) {
    throw new SafetyApiError(
      "SAFETY_VALIDATION_FAILED",
      "Nội dung yêu cầu không được để trống.",
      { httpStatus: 400 },
    );
  }
  if (new TextEncoder().encode(text).byteLength > maxBytes) {
    throw new SafetyApiError(
      "SAFETY_VALIDATION_FAILED",
      "Dữ liệu gửi lên vượt quá dung lượng cho phép.",
      { httpStatus: 413 },
    );
  }
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new SafetyApiError(
      "SAFETY_VALIDATION_FAILED",
      "Nội dung JSON không đúng cú pháp.",
      { httpStatus: 400 },
    );
  }
  try {
    return schema.parse(value);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new SafetyApiError(
        "SAFETY_VALIDATION_FAILED",
        "Dữ liệu ATLĐ gửi lên không hợp lệ.",
        { httpStatus: 400 },
      );
    }
    throw error;
  }
}

export function assertSafetySameOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = forwardedHost ?? request.headers.get("host");
  if (!origin || !host) {
    throw new SafetyApiError(
      "SAFETY_FORBIDDEN_OR_NOT_FOUND",
      "Không thể xác thực nguồn gửi yêu cầu ATLĐ.",
      { httpStatus: 403 },
    );
  }
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    throw new SafetyApiError(
      "SAFETY_FORBIDDEN_OR_NOT_FOUND",
      "Không thể xác thực nguồn gửi yêu cầu ATLĐ.",
      { httpStatus: 403 },
    );
  }
  if (originHost.toLowerCase() !== host.toLowerCase()) {
    throw new SafetyApiError(
      "SAFETY_FORBIDDEN_OR_NOT_FOUND",
      "Không thể xác thực nguồn gửi yêu cầu ATLĐ.",
      { httpStatus: 403 },
    );
  }
}
