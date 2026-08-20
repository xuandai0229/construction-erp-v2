const SENSITIVE_PARAM_PATTERNS = [
  /password/i,
  /passwordhash/i,
  /token/i,
  /secret/i,
  /apikey/i,
  /api_key/i,
  /auth_session/i,
  /authorization/i,
  /cookie/i,
  /creditcard/i,
  /bankaccount/i,
  /identitynumberencrypted/i,
  /identitynumberblindindex/i,
];

/**
 * Strips all sensitive values before logging to the AI audit trail.
 */
export function sanitizeAuditPayload(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== "object") {
    return {};
  }

  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    const isSensitive = SENSITIVE_PARAM_PATTERNS.some((pattern) => pattern.test(key));
    if (isSensitive) {
      result[key] = "[REDACTED]";
      continue;
    }

    if (value !== null && typeof value === "object") {
      if (Array.isArray(value)) {
        result[key] = value.map((item) => (typeof item === "object" ? sanitizeAuditPayload(item) : item));
      } else {
        result[key] = sanitizeAuditPayload(value);
      }
    } else {
      result[key] = value;
    }
  }

  return result;
}
