import assert from "node:assert/strict";
import test from "node:test";

import { assignResponsibility } from "../application/responsibility-assignment";

test("responsibility register remains independent from the operational assignee projection", () => {
  const result = assignResponsibility({ snapshot: { taskId: "task-1", version: 0, assignments: [] }, id: "a1", responsibilityCode: "TASK_OWNER", responsibleUserId: "accountable-user", actorId: "manager", at: new Date("2026-07-20T00:00:00.000Z"), reason: "explicit" });
  assert.equal("primaryAssigneeId" in result.snapshot, false);
  assert.equal(result.snapshot.assignments[0]?.responsibleUserId, "accountable-user");
});

test("ProjectMember participant reviewer approver notification recipient and current assignee are not implicit responsibility assignments", () => {
  const result = assignResponsibility({ snapshot: { taskId: "task-1", version: 0, assignments: [] }, id: "a1", responsibilityCode: "TASK_CONTRIBUTOR", responsibleUserId: "explicit-user", actorId: "manager", at: new Date("2026-07-20T00:00:00.000Z"), reason: "explicit" });
  assert.deepEqual(result.snapshot.assignments.map((record) => record.responsibleUserId), ["explicit-user"]);
});
