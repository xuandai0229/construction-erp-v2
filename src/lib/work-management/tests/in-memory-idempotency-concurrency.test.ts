import assert from "node:assert/strict";
import test from "node:test";
import { emptyCoreTaskEffects } from "../application/core-task-effects";
import type { CoreTaskAggregate } from "../application/core-task-executor";
import type { IdempotencyRequest, StableCoreTaskExecutionResult } from "../application/core-task-idempotency";
import { WorkManagementDomainError } from "../errors/codes";
import { InMemoryIdempotencyStore } from "../infrastructure/in-memory-idempotency";

const request = (patch: Partial<IdempotencyRequest> = {}): IdempotencyRequest => ({ action: "START", key: "key", fingerprint: "fingerprint", actorId: "actor", companyId: null, taskId: "task", projectId: "project", ...patch });
const result = (): StableCoreTaskExecutionResult => ({ task: { id: "task", creatorId: "actor", assignedById: "actor", primaryAssigneeId: "actor", projectId: "project", confidentiality: "NORMAL", requiresIndependentReviewer: false, reviewerId: null, approverId: null, participants: [], state: { lifecycle: "IN_PROGRESS", acceptance: "ACCEPTED", execution: "ACTIVE", review: "NOT_SUBMITTED", handover: "NONE", waitingReason: null }, deadlineAt: null, progressPercent: 0, version: 1, activeBlockerId: null, assignmentHistory: [] } satisfies CoreTaskAggregate, effects: emptyCoreTaskEffects() });
const rejects = async (operation: () => Promise<unknown>, code: string): Promise<void> => { await assert.rejects(operation, (error: unknown) => error instanceof WorkManagementDomainError && error.code === code); };

test("concurrent identical begin admits exactly one process-local reservation", async () => {
  const store = new InMemoryIdempotencyStore();
  const attempts = await Promise.allSettled([store.begin(request()), store.begin(request()), store.begin(request())]);
  assert.equal(attempts.filter((attempt) => attempt.status === "fulfilled").length, 1);
  assert.equal(attempts.filter((attempt) => attempt.status === "rejected").length, 2);
  assert.deepEqual(await store.inspect(request()), { status: "IN_PROGRESS" });
});

test("concurrent same-key different identities allow only one owner", async () => {
  const store = new InMemoryIdempotencyStore();
  const first = request();
  const second = request({ actorId: "other-actor" });
  const attempts = await Promise.allSettled([store.begin(first), store.begin(second)]);
  assert.equal(attempts.filter((attempt) => attempt.status === "fulfilled").length, 1);
  assert.equal(attempts.filter((attempt) => attempt.status === "rejected").length, 1);
  const owner = (await store.inspect(first)).status === "IN_PROGRESS" ? first : second;
  const denied = owner === first ? second : first;
  assert.equal((await store.inspect(denied)).status, "CONFLICT");
});

test("identity isolation rejects exactly one changed field across every public operation", async (t) => {
  const cases: readonly [keyof IdempotencyRequest, IdempotencyRequest[keyof IdempotencyRequest]][] = [
    ["action", "PAUSE"], ["actorId", "other-actor"], ["companyId", "company-b"],
    ["taskId", "task-b"], ["projectId", "project-b"], ["fingerprint", "fingerprint-b"],
  ];
  for (const [field, value] of cases) await t.test(`${field} alone conflicts without replacing the owner`, async () => {
    const store = new InMemoryIdempotencyStore();
    const owner = request();
    const other = { ...owner, [field]: value } as IdempotencyRequest;
    const differing = (Object.keys(owner) as (keyof IdempotencyRequest)[]).filter((key) => owner[key] !== other[key]);
    assert.deepEqual(differing, [field]);
    await store.begin(owner);
    assert.equal((await store.inspect(other)).status, "CONFLICT");
    await rejects(() => store.begin(other), "TASK_IDEMPOTENCY_CONFLICT");
    await rejects(() => store.complete(other, result()), "TASK_IDEMPOTENCY_CONFLICT");
    await rejects(() => store.abort(other, "other owner"), "TASK_IDEMPOTENCY_CONFLICT");
    assert.deepEqual(await store.inspect(owner), { status: "IN_PROGRESS" });
  });
});
