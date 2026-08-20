const SENSITIVE_KEY_PATTERNS = [
  /password/i,
  /pass_hash/i,
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
 * Sanitizes tool output data before returning to the caller / AI.
 * Strips any sensitive properties recursively.
 */
export function sanitizeToolOutput<T>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeToolOutput(item)) as unknown as T;
  }

  if (typeof data === "object") {
    const sanitizedObj: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(data)) {
      const isSensitive = SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key));
      if (isSensitive) {
        // Strip sensitive field
        continue;
      }

      if (value !== null && typeof value === "object") {
        sanitizedObj[key] = sanitizeToolOutput(value);
      } else {
        sanitizedObj[key] = value;
      }
    }

    return sanitizedObj as T;
  }

  return data;
}
