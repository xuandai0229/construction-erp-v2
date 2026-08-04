const SENSITIVE_AUDIT_KEYS = [
  "password",
  "passwordhash",
  "token",
  "secret",
  "cookie",
  "authorization",
  "resettoken",
  "accesstoken",
  "refreshtoken",
  "signedurl",
  "apikey",
  "clientsecret",
  "privatekey",
  "sessiontoken",
  "csrftoken",
  "otp",
  "mfasecret",
  "webhooksecret",
  "credential",
  "credentials",
  "setcookie",
  "proxyauthorization",
];
const MAX_DEPTH = 8;
const MAX_COLLECTION_ITEMS = 100;
const MAX_STRING_LENGTH = 4096;

function isSensitiveAuditKey(key: string) {
  const normalized = key.replace(/[^a-z0-9]/gi, "").toLowerCase();
  return SENSITIVE_AUDIT_KEYS.some((needle) => normalized === needle || normalized.includes(needle));
}

function redactSensitiveString(value: string) {
  const credentialRedacted = value
    .replace(/\b(Bearer|Basic)\s+[^\s,;]+/gi, "$1 [REDACTED]")
    .replace(/([?&](?:token|access_token|signature|sig|x-amz-signature)=[^&#\s]*)/gi, (match) => `${match.split("=")[0]}=[REDACTED]`);
  return credentialRedacted.length > MAX_STRING_LENGTH ? `${credentialRedacted.slice(0, MAX_STRING_LENGTH)}[TRUNCATED]` : credentialRedacted;
}

/** Redacts credentials recursively before an audit JSON payload is persisted. Does not mutate its input. */
export function sanitizeAuditData(value: unknown, depth = 0, seen = new WeakSet<object>()): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === "string") return redactSensitiveString(value);
  if (typeof value === "bigint") return value.toString();
  if (typeof value !== "object") return value;
  if (value instanceof Date) return value.toISOString();
  if (depth >= MAX_DEPTH) return "[TRUNCATED_DEPTH]";
  if (seen.has(value)) return "[CIRCULAR]";
  seen.add(value);

  if (Array.isArray(value)) return value.slice(0, MAX_COLLECTION_ITEMS).map((item) => sanitizeAuditData(item, depth + 1, seen));
  const entries = Object.entries(value as Record<string, unknown>).slice(0, MAX_COLLECTION_ITEMS);
  return Object.fromEntries(entries.map(([key, item]) => [key, isSensitiveAuditKey(key) ? "[REDACTED]" : sanitizeAuditData(item, depth + 1, seen)]));
}

/** Utility to pick only explicitly allowlisted keys into a clean new object */
function pickAllowlist(raw: unknown, allowlist: string[]): Record<string, unknown> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {};
  }
  const result: Record<string, unknown> = {};
  const src = raw as Record<string, unknown>;

  for (const key of allowlist) {
    if (key in src && src[key] !== undefined) {
      const val = src[key];
      if (val instanceof Date) {
        result[key] = val.toISOString();
      } else if (typeof val === "object" && val !== null) {
        // Redact any nested objects unless explicitly handled
        result[key] = sanitizeAuditData(val);
      } else {
        result[key] = val;
      }
    }
  }
  return result;
}

/** Allowlist sanitizer for Organization Unit Audit Payload */
export function sanitizeOrganizationUnitAudit(raw: unknown): Record<string, unknown> {
  const allowlist = ["id", "code", "name", "parentId", "orderIndex", "isActive", "description", "result"];
  return pickAllowlist(raw, allowlist);
}

/** Allowlist sanitizer for Position Audit Payload */
export function sanitizePositionAudit(raw: unknown): Record<string, unknown> {
  const allowlist = ["id", "code", "title", "description", "level", "isActive", "result"];
  return pickAllowlist(raw, allowlist);
}

/** Allowlist sanitizer for Manager Assignment Audit Payload */
export function sanitizeManagerAssignmentAudit(raw: unknown): Record<string, unknown> {
  const allowlist = [
    "id",
    "organizationUnitId",
    "employeeId",
    "startDate",
    "endDate",
    "isPrimary",
    "decisionNo",
    "result",
  ];
  return pickAllowlist(raw, allowlist);
}

/** Allowlist sanitizer for Employee Transfer Audit Payload */
export function sanitizeEmployeeTransferAudit(raw: unknown): Record<string, unknown> {
  const allowlist = [
    "employeeId",
    "previousOrganizationUnitId",
    "newOrganizationUnitId",
    "previousPositionId",
    "newPositionId",
    "effectiveDate",
    "decisionNumber",
    "result",
  ];
  return pickAllowlist(raw, allowlist);
}
