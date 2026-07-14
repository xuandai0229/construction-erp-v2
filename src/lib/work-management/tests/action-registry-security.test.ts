import assert from "node:assert/strict";
import test from "node:test";
import {
  WORK_MANAGEMENT_ACTION_REGISTRY,
  type WorkManagementCommandSchemaKey,
} from "../application/action-registry";
import { TASK_ACTIONS } from "../domain/types";

const maliciousMetadata = {
  actorId: "forged-user-id",
  createdById: "forged-user-id",
  assignedById: "forged-user-id",
  approvedById: "forged-user-id",
  completedById: "forged-user-id",
  nextStatus: "COMPLETED",
  status: "COMPLETED",
  newVersion: 999,
  requiredPermission: "task.admin",
  allowedScopes: ["COMPANY"],
  eventType: "TaskCompleted",
  activityType: "TASK_COMPLETED",
  auditType: "TASK_COMPLETE",
  notificationPolicy: "NONE",
  transactionPolicy: "NONE",
  actorType: "SYSTEM",
  systemActor: true,
  confidentialAccess: true,
} as const;

function validPayload(key: WorkManagementCommandSchemaKey): Record<string, unknown> {
  const versionedTask = { taskId: "task-1", expectedVersion: 0 };

  switch (key) {
    case "createTask": return { title: "Valid task" };
    case "assignTask": return { ...versionedTask, primaryAssigneeId: "user-2" };
    case "acceptTask":
    case "startTask":
    case "archiveTask": return versionedTask;
    case "clarification": return { ...versionedTask, reason: "Need a drawing" };
    case "progressUpdate": return { ...versionedTask, progressPercent: 50 };
    case "extensionRequest": return { ...versionedTask, requestedDueAt: new Date("2026-08-01"), reason: "Awaiting material" };
    case "changeDeadline": return { ...versionedTask, currentDueAt: new Date("2026-08-01"), reason: "Approved change" };
    case "pauseTask":
    case "blockTask":
    case "reopenTask":
    case "cancelTask": return { ...versionedTask, reason: "Valid operational reason" };
    case "resumeTask":
    case "restoreTask": return { ...versionedTask, reason: "Valid note" };
    case "unblockTask": return { ...versionedTask, resolution: "Issue resolved" };
    case "submission": return { ...versionedTask, summary: "Result submitted" };
    case "changesRequest": return { ...versionedTask, submissionId: "submission-1", reason: "Add evidence" };
    case "approveSubmission": return { ...versionedTask, submissionId: "submission-1" };
    case "completeTask": return versionedTask;
    case "handoverRequest": return { ...versionedTask, fromUserId: "user-1", toUserId: "user-2", effectiveAt: new Date("2026-08-01"), reason: "Leave coverage" };
    case "acceptHandover": return { handoverId: "handover-1", expectedVersion: 0 };
    case "rejectHandover": return { handoverId: "handover-1", expectedVersion: 0, reason: "Unavailable" };
    case "approveHandover": return { handoverId: "handover-1", expectedVersion: 0 };
    case "executeHandover": return { ...versionedTask, handoverId: "handover-1" };
  }
}

test("every public action schema rejects malicious client-controlled metadata", async (t) => {
  for (const action of TASK_ACTIONS) {
    const definition = WORK_MANAGEMENT_ACTION_REGISTRY[action];
    const payload = validPayload(definition.commandSchemaKey);

    await t.test(`${action} accepts its valid payload`, () => {
      assert.equal(definition.commandSchema.safeParse(payload).success, true);
    });

    for (const [field, value] of Object.entries(maliciousMetadata)) {
      await t.test(`${action} rejects ${field}`, () => {
        assert.equal(
          definition.commandSchema.safeParse({ ...payload, [field]: value }).success,
          false,
        );
      });
    }
  }
});
