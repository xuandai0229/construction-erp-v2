import assert from "node:assert/strict";
import test from "node:test";
import { getDeadlineStatus } from "../domain/workflow";

const local = (day: number, hour: number, minute = 0) => new Date(2026, 6, day, hour, minute);
test("deadline condition covers no deadline, boundary and completion", () => {
  const now = local(14, 8); assert.equal(getDeadlineStatus({ dueAt: null, now }), "NO_DEADLINE"); assert.equal(getDeadlineStatus({ dueAt: local(17, 8, 1), now }), "NOT_DUE"); assert.equal(getDeadlineStatus({ dueAt: local(16, 8), now }), "DUE_SOON"); assert.equal(getDeadlineStatus({ dueAt: local(14, 23), now }), "DUE_TODAY"); assert.equal(getDeadlineStatus({ dueAt: local(14, 7, 59), now }), "OVERDUE"); assert.equal(getDeadlineStatus({ dueAt: local(14, 9), completedAt: local(14, 9), now }), "COMPLETED_ON_TIME"); assert.equal(getDeadlineStatus({ dueAt: local(14, 9), completedAt: local(14, 9, 1), now }), "COMPLETED_LATE");
});
test("deadline uses caller-provided instant without hidden clock", () => { const utcNow = new Date("2026-07-14T16:00:00.000Z"); assert.equal(getDeadlineStatus({ dueAt: new Date("2026-07-14T15:59:59.999Z"), now: utcNow }), "OVERDUE"); });
