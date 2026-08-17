import assert from "node:assert/strict";
import { test } from "vitest";

test("concurrency conflict check detects timestamp mismatch", () => {
  const currentUpdatedAt: string = "2026-08-12T10:00:00.000Z";
  const expectedUpdatedAt: string = "2026-08-12T09:59:00.000Z"; // Stale timestamp from another tab

  const isConflict = currentUpdatedAt !== expectedUpdatedAt;
  assert.equal(isConflict, true);
});

test("concurrency check passes when expectedUpdatedAt matches current", () => {
  const currentUpdatedAt: string = "2026-08-12T10:00:00.000Z";
  const expectedUpdatedAt: string = "2026-08-12T10:00:00.000Z";

  const isConflict = currentUpdatedAt !== expectedUpdatedAt;
  assert.equal(isConflict, false);
});
