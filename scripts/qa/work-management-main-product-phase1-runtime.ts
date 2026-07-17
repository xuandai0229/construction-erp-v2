import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { ProjectRole, UserRole } from "@prisma/client";
import prisma from "@/lib/prisma";
import type { SessionUser } from "@/lib/auth";
import { actorFromSession, createProductCoreTaskExecutor } from "@/lib/work-management/application/product-composition";
import { WorkManagementDomainError } from "@/lib/work-management/errors/codes";
import type { CoreTaskAction } from "@/lib/work-management/application/action-registry";

const prefix = "WM-PHASE1-QA-";
const runId = `${prefix}${randomUUID()}`;

type Fixture = Readonly<{
  manager: SessionUser;
  assignee: SessionUser;
  outsider: SessionUser;
  projectAId: string;
  projectBId: string;
  userIds: readonly string[];
  projectIds: readonly string[];
}>;

const session = (value: { id: string; email: string; username: string | null; name: string; role: UserRole; phone: string | null; isActive: boolean }): SessionUser => value;

async function fixture(): Promise<Fixture> {
  const users: string[] = [];
  const projects: string[] = [];
  try {
    const manager = await prisma.user.create({ data: { email: `${runId}-manager@example.invalid`, username: `${runId}-manager`, password: "qa-only", name: "WM Phase 1 Manager", role: "MANAGER" } });
    users.push(manager.id);
    const assignee = await prisma.user.create({ data: { email: `${runId}-assignee@example.invalid`, username: `${runId}-assignee`, password: "qa-only", name: "WM Phase 1 Assignee", role: "ENGINEER" } });
    users.push(assignee.id);
    const outsider = await prisma.user.create({ data: { email: `${runId}-outsider@example.invalid`, username: `${runId}-outsider`, password: "qa-only", name: "WM Phase 1 Outsider", role: "ENGINEER" } });
    users.push(outsider.id);
    const projectA = await prisma.project.create({ data: { code: `${runId}-A`, name: "WM Phase 1 Project A", status: "ACTIVE" } });
    projects.push(projectA.id);
    const projectB = await prisma.project.create({ data: { code: `${runId}-B`, name: "WM Phase 1 Project B", status: "ACTIVE" } });
    projects.push(projectB.id);
    const memberships: ReadonlyArray<{ projectId: string; userId: string; role: ProjectRole }> = [
      { projectId: projectA.id, userId: manager.id, role: "PROJECT_MANAGER" },
      { projectId: projectA.id, userId: assignee.id, role: "SUPERVISOR" },
      { projectId: projectB.id, userId: manager.id, role: "PROJECT_MANAGER" },
    ];
    await prisma.projectMember.createMany({ data: memberships });
    return {
      manager: session(manager), assignee: session(assignee), outsider: session(outsider),
      projectAId: projectA.id, projectBId: projectB.id,
      userIds: users, projectIds: projects,
    };
  } catch (error) {
    if (projects.length > 0) await prisma.project.deleteMany({ where: { id: { in: projects } } });
    if (users.length > 0) await prisma.user.deleteMany({ where: { id: { in: users } } });
    throw error;
  }
}

async function cleanup(value: Fixture | null): Promise<void> {
  if (!value) return;
  await prisma.workTask.deleteMany({ where: { projectId: { in: value.projectIds } } });
  await prisma.projectMember.deleteMany({ where: { projectId: { in: value.projectIds } } });
  await prisma.project.deleteMany({ where: { id: { in: value.projectIds } } });
  await prisma.user.deleteMany({ where: { id: { in: value.userIds } } });
}

async function execute(user: SessionUser, action: CoreTaskAction, command: unknown, key: string) {
  return createProductCoreTaskExecutor(user).execute({ action, rawCommand: command, actor: actorFromSession(user), idempotencyKey: key });
}

async function expectDomain(code: string, operation: () => Promise<unknown>): Promise<void> {
  await assert.rejects(operation, (error: unknown) => error instanceof WorkManagementDomainError && error.code === code);
}

async function main(): Promise<void> {
  let data: Fixture | null = null;
  try {
    data = await fixture();
    const create = { title: "Persisted lifecycle task", description: "QA runtime flow", projectId: data.projectAId, priority: "NORMAL", confidentiality: "NORMAL" };
    const created = await execute(data.manager, "CREATE_DRAFT", create, "phase1-create");
    const taskId = created.task.id;
    assert.equal(created.task.version, 1);
    const replay = await execute(data.manager, "CREATE_DRAFT", create, "phase1-create");
    assert.equal(replay.task.id, taskId);
    assert.equal(await prisma.workTask.count({ where: { projectId: data.projectAId } }), 1);

    const run = async (user: SessionUser, action: CoreTaskAction, command: Record<string, unknown>, key: string) => execute(user, action, { taskId, expectedVersion: (await prisma.workTask.findUniqueOrThrow({ where: { id: taskId }, select: { version: true } })).version, ...command }, key);
    await run(data.manager, "ASSIGN", { primaryAssigneeId: data.assignee.id, reason: "QA assignment" }, "phase1-assign");
    await run(data.assignee, "ACCEPT", {}, "phase1-accept");
    await run(data.assignee, "START", {}, "phase1-start");
    await run(data.assignee, "UPDATE_PROGRESS", { progressPercent: 100, completedWork: "Completed" }, "phase1-progress");
    const submitted = await run(data.assignee, "SUBMIT", { summary: "Initial result" }, "phase1-submit-1");
    const submissionId = submitted.task.currentSubmissionId;
    assert.ok(submissionId);
    await run(data.manager, "REQUEST_CHANGES", { submissionId, reason: "Clarify evidence" }, "phase1-request-changes");
    const resubmitted = await run(data.assignee, "SUBMIT", { summary: "Corrected result" }, "phase1-submit-2");
    const currentSubmissionId = resubmitted.task.currentSubmissionId;
    assert.ok(currentSubmissionId);
    await run(data.manager, "APPROVE_RESULT", { submissionId: currentSubmissionId, comment: "Approved" }, "phase1-approve");
    await run(data.manager, "CONFIRM_COMPLETION", {}, "phase1-confirm");

    const persisted = await prisma.workTask.findUniqueOrThrow({ where: { id: taskId }, include: { actions: { orderBy: { occurredAt: "asc" } }, outboxMessages: true, idempotencyRows: true } });
    assert.equal(persisted.primaryAssigneeId, data.assignee.id);
    assert.equal(persisted.progressPercent, 100);
    assert.equal(persisted.lifecycle, "COMPLETED");
    assert.deepEqual(persisted.actions.map((row) => row.action), ["CREATE_DRAFT", "ASSIGN", "ACCEPT", "START", "UPDATE_PROGRESS", "SUBMIT", "REQUEST_CHANGES", "SUBMIT", "APPROVE_RESULT", "CONFIRM_COMPLETION"]);
    assert.equal(persisted.actions.length, 10);
    assert.ok(persisted.outboxMessages.length >= 10);
    assert.equal(persisted.idempotencyRows.filter((row) => row.state === "COMPLETED").length, 9);
    assert.equal(await prisma.workTaskIdempotency.count({ where: { actorId: data.manager.id, state: "COMPLETED" } }), 5);

    await expectDomain("TASK_PROJECT_ACCESS_REQUIRED", () => execute(data.outsider, "START", { taskId, expectedVersion: persisted.version }, "outside-start"));
    const isolated = await execute(data.manager, "CREATE_DRAFT", { ...create, projectId: data.projectBId, title: "Same key different project" }, "phase1-create");
    assert.notEqual(isolated.task.id, taskId);
    assert.equal(await prisma.workTask.count({ where: { projectId: { in: [data.projectAId, data.projectBId] } } }), 2);

    const finalVersion = persisted.version;
    await expectDomain("TASK_CONCURRENCY_CONFLICT", () => execute(data.manager, "ARCHIVE", { taskId, expectedVersion: finalVersion - 1 }, "stale-archive"));
    const afterStale = await prisma.workTask.findUniqueOrThrow({ where: { id: taskId }, include: { actions: true, outboxMessages: true } });
    assert.equal(afterStale.version, finalVersion);
    assert.equal(afterStale.actions.length, 10);
    assert.equal(afterStale.outboxMessages.length, persisted.outboxMessages.length);
    process.stdout.write(JSON.stringify({ status: "PASS", lifecycleActions: persisted.actions.length, outboxMessages: persisted.outboxMessages.length }) + "\n");
  } finally {
    await cleanup(data);
    await prisma.$disconnect();
  }
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
