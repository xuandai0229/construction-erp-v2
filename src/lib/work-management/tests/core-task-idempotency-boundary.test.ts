import assert from "node:assert/strict";
import test from "node:test";
import { canonicalIdempotencyFingerprint } from "../application/core-task-idempotency";

test("idempotency fingerprint is canonical for key order and Date values", () => {
  const first = canonicalIdempotencyFingerprint({ action: "START", actorId: "actor", companyId: null, taskId: "task", projectId: "project", command: { taskId: "task", expectedVersion: 3, at: new Date("2026-07-14T08:00:00.000Z") } });
  const second = canonicalIdempotencyFingerprint({ action: "START", actorId: "actor", companyId: null, taskId: "task", projectId: "project", command: { at: new Date("2026-07-14T08:00:00.000Z"), expectedVersion: 3, taskId: "task" } });
  const changed = canonicalIdempotencyFingerprint({ action: "START", actorId: "actor", companyId: null, taskId: "task", projectId: "project", command: { taskId: "task", expectedVersion: 4, at: new Date("2026-07-14T08:00:00.000Z") } });
  assert.equal(first, second); assert.notEqual(first, changed);
});
