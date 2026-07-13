import assert from "node:assert/strict";
import { sanitizeAuditData } from "../src/lib/audit";

const sanitized = sanitizeAuditData({
  password: "secret",
  nested: {
    passwordHash: "hash",
    clientSecret: "secret",
    accessToken: "token",
    signedUrl: "https://signed.example/file",
    allowed: "kept",
  },
  items: [{ refreshToken: "refresh" }, { note: "kept" }],
}) as Record<string, unknown>;

assert.equal(sanitized.password, "[REDACTED]");
assert.deepEqual(sanitized.nested, {
  passwordHash: "[REDACTED]",
  clientSecret: "[REDACTED]",
  accessToken: "[REDACTED]",
  signedUrl: "[REDACTED]",
  allowed: "kept",
});
assert.deepEqual(sanitized.items, [{ refreshToken: "[REDACTED]" }, { note: "kept" }]);

console.log("PASS - Audit sanitization redacts password, token and signed URL fields without removing safe fields.");
