import { z, ZodError } from "zod";

export interface InputValidationResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

/**
 * Validates tool arguments against the tool's strict Zod schema.
 * Rejects extra fields or invalid types (TOOL_INPUT_INVALID).
 */
export function validateToolInput<T>(
  schema: z.ZodType<T>,
  rawInput: unknown
): InputValidationResult<T> {
  let sanitizedInput = rawInput;
  if (!sanitizedInput || typeof sanitizedInput !== "object") {
    sanitizedInput = {};
  } else if (!Array.isArray(sanitizedInput)) {
    // Strip explicit null values so optional Zod fields with defaults parse cleanly
    sanitizedInput = Object.fromEntries(
      Object.entries(sanitizedInput).filter(([_, v]) => v !== null && v !== undefined)
    );
  }

  const result = schema.safeParse(sanitizedInput);

  if (result.success) {
    return {
      success: true,
      data: result.data,
    };
  }

  const zodError = result.error as ZodError;
  const flatErrors = zodError.flatten();
  const errorMessage = zodError.issues
    .map((issue) => `${issue.path.join(".") || "root"}: ${issue.message}`)
    .join("; ");

  return {
    success: false,
    error: `Tham số đầu vào không hợp lệ (TOOL_INPUT_INVALID): ${errorMessage}`,
    fieldErrors: flatErrors.fieldErrors,
  };
}
