import assert from "node:assert/strict";
import test from "node:test";
import { TaskApplicationService } from "../application/services";
import { WorkManagementDomainError } from "../errors/codes";
import { activeState, now, task } from "./fixtures";

function createService(options?: { version?: number; save?: boolean }) {
  const calls = { transaction: 0, find: 0, save: 0, activity: 0, audit: 0, notification: 0 };
  const service = new TaskApplicationService({
    transactions: { run: async <T>(operation: () => Promise<T>) => { calls.transaction += 1; return operation(); } },
    tasks: { findById: async () => { calls.find += 1; return { task: task(activeState()), version: options?.version ?? 3 }; }, save: async () => { calls.save += 1; return options?.save ?? true; } },
    activities: { append: async () => { calls.activity += 1; } }, audit: { record: async () => { calls.audit += 1; } }, notifications: { enqueue: async () => { calls.notification += 1; } },
  });
  return { service, calls };
}
const actor = (permissions: readonly "task.submit"[] | readonly [], scopes: readonly "OWN"[] | readonly [] = ["OWN"]) => ({ userId: "assignee", permissions, scopes, projectMemberships: ["project-1"], delegations: [], currentTime: now });
const command = { taskId: "task-1", action: "SUBMIT" as const, expectedVersion: 3, idempotencyKey: "work-management:submit:request-1" };
test("application service checks permission before persistence and emits intents in a transaction", async () => { const { service, calls } = createService(); const result = await service.execute(actor(["task.submit"]), command); assert.equal(result.decision.nextState?.lifecycle, "SUBMITTED"); assert.deepEqual(calls, { transaction: 1, find: 1, save: 1, activity: 1, audit: 1, notification: 1 }); });
test("denied permission does not call mutation repositories or side-effect ports", async () => { const { service, calls } = createService(); await assert.rejects(() => service.execute(actor([]), command), (error: unknown) => error instanceof WorkManagementDomainError && error.code === "TASK_ACCESS_DENIED"); assert.deepEqual({ save: calls.save, activity: calls.activity, audit: calls.audit, notification: calls.notification }, { save: 0, activity: 0, audit: 0, notification: 0 }); });
test("denied scope does not call mutation repositories or side-effect ports", async () => { const { service, calls } = createService(); await assert.rejects(() => service.execute(actor(["task.submit"], []), command), (error: unknown) => error instanceof WorkManagementDomainError && error.code === "TASK_ACCESS_DENIED"); assert.deepEqual({ save: calls.save, activity: calls.activity, audit: calls.audit, notification: calls.notification }, { save: 0, activity: 0, audit: 0, notification: 0 }); });
test("expected version mismatch reports concurrency conflict before mutation", async () => { const { service, calls } = createService({ version: 4 }); await assert.rejects(() => service.execute(actor(["task.submit"]), command), (error: unknown) => error instanceof WorkManagementDomainError && error.code === "TASK_CONCURRENCY_CONFLICT"); assert.equal(calls.save, 0); });
test("failed compare-and-save reports concurrency conflict", async () => { const { service } = createService({ save: false }); await assert.rejects(() => service.execute(actor(["task.submit"]), command), (error: unknown) => error instanceof WorkManagementDomainError && error.code === "TASK_CONCURRENCY_CONFLICT"); });
