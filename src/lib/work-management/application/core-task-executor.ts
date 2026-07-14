import { WorkManagementDomainError } from "../errors/codes";
import type { TransitionPolicyDecision } from "../domain/transition-policies";
import type { ConfidentialityLevel, TaskSnapshot, TaskState } from "../domain/types";
import type { WorkManagementPermission, WorkManagementScope } from "../permissions/contract";
import { evaluateActorPolicy, type WorkManagementActorRelation } from "./actor-policy";
import { getWorkManagementActionDefinition } from "./action-registry";
import { assertCompletionReadiness, assertReviewSeparation, type CompletionReadinessDecision } from "./result-review-invariants";
import type { CoreTaskEffects } from "./core-task-effects";
import { emptyCoreTaskEffects } from "./core-task-effects";
import type { CoreTaskReadRepository, CoreTaskTransitionPolicyResolver, CoreTaskUnitOfWork } from "./core-task-ports";
import {
  canonicalIdempotencyFingerprint,
  type IdempotencyIntegrationPort,
  type IdempotencyRequest,
  type StableCoreTaskExecutionResult,
} from "./core-task-idempotency";

export const CORE_TASK_ACTIONS = [
  "CREATE_DRAFT", "ASSIGN", "ACCEPT", "REQUEST_CLARIFICATION", "START", "UPDATE_PROGRESS",
  "REQUEST_EXTENSION", "CHANGE_DEADLINE", "PAUSE", "RESUME", "BLOCK", "UNBLOCK",
] as const;
export const RESULT_REVIEW_ACTIONS = ["SUBMIT", "REQUEST_CHANGES", "APPROVE_RESULT", "CONFIRM_COMPLETION"] as const;
export type CoreTaskAction = (typeof CORE_TASK_ACTIONS)[number] | (typeof RESULT_REVIEW_ACTIONS)[number];

export type WorkManagementActorContext = {
  actorType: "USER";
  actorId: string;
  companyId: string | null;
  permissionSet: ReadonlySet<WorkManagementPermission>;
  resolvedScopes: readonly WorkManagementScope[];
  correlationId: string;
  causationId: string | null;
  requestId: string;
};

export type CoreTaskAggregate = TaskSnapshot & {
  version: number;
  deadlineAt: Date | null;
  progressPercent: number;
  title?: string;
  description?: string | null;
  priority?: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  activeBlockerId?: string | null;
  submissions?: readonly CoreTaskSubmission[];
  reviewDecisions?: readonly CoreTaskReviewDecision[];
  currentSubmissionId?: string | null;
  currentSubmissionSequence?: number;
  completedById?: string | null;
  completedAt?: Date | null;
  completionSubmissionId?: string | null;
};
export type CoreTaskSubmission = { id: string; taskId: string; sequence: number; previousSubmissionId: string | null; submittedById: string; submittedAt: Date; summary: string; note: string | null };
export type CoreTaskReviewDecision = { id: string; submissionId: string; decision: "CHANGES_REQUESTED" | "RESULT_APPROVED"; reason: string | null; decidedById: string; decidedAt: Date };
export type { CoreTaskEffects } from "./core-task-effects";

export type AssigneeEligibilityDecision =
  | { eligible: true; projectAccess: true }
  | { eligible: false; reason: "NOT_FOUND" | "INACTIVE" | "NO_PROJECT_ACCESS" | "REVIEWER_CONFLICT" | "APPROVER_CONFLICT" | "NOT_ASSIGNABLE" };
export interface UserEligibilityPort { evaluateAssignee(input: { userId: string; task: CoreTaskAggregate }): Promise<AssigneeEligibilityDecision>; }
export interface ScopeContextPort {
  resolve(task: CoreTaskAggregate, actor: WorkManagementActorContext): Promise<{ scopes: readonly WorkManagementScope[]; relations: readonly WorkManagementActorRelation[]; confidentialAllowed: boolean }>;
  resolveCreate(input: { actor: WorkManagementActorContext; projectId: string | null; departmentId: string | null; confidentiality: ConfidentialityLevel }): Promise<{ projectExists: boolean; projectAccessible: boolean; scopes: readonly WorkManagementScope[]; confidentialAllowed: boolean }>;
}
export interface CompletionReadinessPort { evaluate(task: CoreTaskAggregate): Promise<CompletionReadinessDecision>; }

export type CoreTaskExecutorDependencies = {
  tasks: CoreTaskReadRepository;
  users: UserEligibilityPort;
  scopes: ScopeContextPort;
  unitOfWork: CoreTaskUnitOfWork;
  idempotency: IdempotencyIntegrationPort;
  clock: { now(): Date };
  idGenerator: { next(): string };
  transitionPolicies: CoreTaskTransitionPolicyResolver;
  completionReadiness: CompletionReadinessPort;
};

const cloneState = <T>(value: T): T => structuredClone(value);
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
function parsedObject(schema: { safeParse(value: unknown): { success: boolean; data?: unknown } }, raw: unknown): Record<string, unknown> {
  const parsed = schema.safeParse(raw);
  if (!parsed.success || !isRecord(parsed.data)) throw new WorkManagementDomainError("TASK_COMMAND_INVALID");
  return parsed.data;
}
function assertPermission(actor: WorkManagementActorContext, permission: WorkManagementPermission): void {
  if (!actor.permissionSet.has(permission)) throw new WorkManagementDomainError("TASK_ACCESS_DENIED");
}
function assertScope(scopes: readonly WorkManagementScope[], allowed: readonly WorkManagementScope[]): void {
  if (!allowed.some((scope) => scopes.includes(scope))) throw new WorkManagementDomainError("TASK_PROJECT_ACCESS_REQUIRED");
}
function stateForDraft(): TaskState { return { lifecycle: "DRAFT", acceptance: "NOT_REQUIRED", execution: "ACTIVE", review: "NOT_SUBMITTED", handover: "NONE", waitingReason: null }; }
function normalizedKey(value: string | undefined): string {
  const key = value?.trim() ?? "";
  if (!key) throw new WorkManagementDomainError("TASK_IDEMPOTENCY_KEY_REQUIRED");
  return key;
}
function confidentialityFrom(command: Readonly<Record<string, unknown>>): ConfidentialityLevel {
  const value = command.confidentiality;
  if (value === undefined) return "NORMAL";
  if (["NORMAL", "DEPARTMENT_INTERNAL", "PROJECT_INTERNAL", "RESTRICTED", "CONFIDENTIAL", "EXECUTIVE"].includes(String(value))) return value as ConfidentialityLevel;
  throw new WorkManagementDomainError("TASK_COMMAND_INVALID");
}
function assertDecision(expectedEvent: string, decision: TransitionPolicyDecision): TaskState {
  if (!decision.allowed || !decision.nextState) throw new WorkManagementDomainError(decision.errorCode ?? "TASK_INVALID_TRANSITION");
  if (!decision.intents.some((intent) => intent.type === expectedEvent)) throw new WorkManagementDomainError("TASK_INVALID_TRANSITION");
  return decision.nextState;
}
function eligibilityError(reason: Exclude<AssigneeEligibilityDecision, { eligible: true }> ["reason"]): WorkManagementDomainError {
  if (reason === "INACTIVE") return new WorkManagementDomainError("TASK_ASSIGNEE_INACTIVE");
  if (reason === "NOT_FOUND") return new WorkManagementDomainError("TASK_ASSIGNEE_NOT_FOUND");
  if (reason === "NO_PROJECT_ACCESS") return new WorkManagementDomainError("TASK_ASSIGNEE_PROJECT_ACCESS");
  if (reason === "REVIEWER_CONFLICT") return new WorkManagementDomainError("TASK_REVIEWER_CONFLICT");
  if (reason === "APPROVER_CONFLICT") return new WorkManagementDomainError("TASK_APPROVER_CONFLICT");
  return new WorkManagementDomainError("TASK_ASSIGNEE_NOT_ASSIGNABLE");
}
function sameIdempotencyIdentity(left: IdempotencyRequest, right: IdempotencyRequest): boolean {
  return left.key === right.key && left.action === right.action && left.actorId === right.actorId
    && left.companyId === right.companyId && left.taskId === right.taskId
    && left.projectId === right.projectId && left.fingerprint === right.fingerprint;
}

export class CoreTaskExecutor {
  constructor(private readonly dependencies: CoreTaskExecutorDependencies) {}

  async execute(input: { action: CoreTaskAction; rawCommand: unknown; actor: WorkManagementActorContext; idempotencyKey?: string }): Promise<StableCoreTaskExecutionResult> {
    const definition = getWorkManagementActionDefinition(input.action);
    const command = parsedObject(definition.commandSchema, input.rawCommand);
    const key = normalizedKey(input.idempotencyKey);
    const taskId = typeof command.taskId === "string" ? command.taskId : null;
    const projectId = typeof command.projectId === "string" ? command.projectId : null;
    const request: IdempotencyRequest = {
      action: input.action,
      key,
      actorId: input.actor.actorId,
      companyId: input.actor.companyId,
      taskId,
      projectId,
      fingerprint: canonicalIdempotencyFingerprint({ action: input.action, command, actorId: input.actor.actorId, companyId: input.actor.companyId, taskId, projectId }),
    };
    const inspection = await this.dependencies.idempotency.inspect(request);
    if (inspection.status === "REPLAY") {
      if (!sameIdempotencyIdentity(request, inspection.identity)) throw new WorkManagementDomainError("TASK_IDEMPOTENCY_CONFLICT");
      return inspection.result;
    }
    if (inspection.status === "CONFLICT") throw new WorkManagementDomainError("TASK_IDEMPOTENCY_CONFLICT");
    if (inspection.status === "IN_PROGRESS") throw new WorkManagementDomainError("TASK_IDEMPOTENCY_IN_PROGRESS");
    const now = this.dependencies.clock.now();

    if (input.action === "CREATE_DRAFT") {
      return this.createDraft(input, command, request, now);
    }
    if (!taskId) throw new WorkManagementDomainError("TASK_NOT_FOUND");
    assertPermission(input.actor, definition.requiredPermission);
    const current = await this.dependencies.tasks.findById(taskId);
    if (!current) throw new WorkManagementDomainError("TASK_NOT_FOUND");
    const scope = await this.dependencies.scopes.resolve(current, input.actor);
    assertScope(scope.scopes, definition.allowedScopes);
    if (!evaluateActorPolicy(definition.actorPolicy, { actorType: input.actor.actorType, actorRelations: scope.relations, resolvedScopes: scope.scopes })) throw new WorkManagementDomainError("TASK_ACCESS_DENIED");
    if (current.confidentiality !== "NORMAL" && !scope.confidentialAllowed) throw new WorkManagementDomainError("TASK_CONFIDENTIAL_ACCESS_DENIED");
    if (definition.concurrencyPolicy === "EXPECTED_VERSION_REQUIRED" && (typeof command.expectedVersion !== "number" || current.version !== command.expectedVersion)) throw new WorkManagementDomainError("TASK_CONCURRENCY_CONFLICT");
    const policy = this.dependencies.transitionPolicies.resolve(definition.transitionPolicyKey);
    const next = cloneState(current);
    next.state = assertDecision(definition.eventType, policy.evaluate({ action: input.action, currentState: current.state, command, taskId: current.id, now }));
    next.version = current.version + 1;
    const effects = await this.applyAction(input.action, next, current, command, input.actor, now);
    return this.persist(current, next, effects, request);
  }

  private async createDraft(input: { action: CoreTaskAction; actor: WorkManagementActorContext }, command: Record<string, unknown>, request: IdempotencyRequest, now: Date): Promise<StableCoreTaskExecutionResult> {
    const definition = getWorkManagementActionDefinition("CREATE_DRAFT");
    assertPermission(input.actor, definition.requiredPermission);
    const projectId = typeof command.projectId === "string" ? command.projectId : null;
    const confidentiality = confidentialityFrom(command);
    const createScope = await this.dependencies.scopes.resolveCreate({ actor: input.actor, projectId, departmentId: null, confidentiality });
    if (projectId && !createScope.projectExists) throw new WorkManagementDomainError("TASK_PROJECT_NOT_FOUND");
    if (projectId && !createScope.projectAccessible) throw new WorkManagementDomainError("TASK_PROJECT_ACCESS_REQUIRED");
    assertScope(createScope.scopes, definition.allowedScopes);
    if (confidentiality !== "NORMAL" && !createScope.confidentialAllowed) throw new WorkManagementDomainError("TASK_CONFIDENTIAL_ACCESS_DENIED");
    const policy = this.dependencies.transitionPolicies.resolve(definition.transitionPolicyKey);
    const task: CoreTaskAggregate = {
      id: this.dependencies.idGenerator.next(), creatorId: input.actor.actorId, assignedById: null, primaryAssigneeId: null,
      projectId, confidentiality, requiresIndependentReviewer: false, reviewerId: null, approverId: null, participants: [],
      state: stateForDraft(), deadlineAt: command.currentDueAt instanceof Date ? command.currentDueAt : null, progressPercent: 0,
      version: 1, title: String(command.title), description: typeof command.description === "string" ? command.description : null,
      priority: command.priority === "LOW" || command.priority === "HIGH" || command.priority === "URGENT" ? command.priority : "NORMAL", activeBlockerId: null,
    };
    task.state = assertDecision(definition.eventType, policy.evaluate({ action: "CREATE_DRAFT", currentState: task.state, command, taskId: task.id, now }));
    const effects = this.effectsFor("CREATE_DRAFT", task, null, command, input.actor, now, emptyCoreTaskEffects());
    return this.persistCreate(task, effects, request);
  }

  private async applyAction(action: CoreTaskAction, next: CoreTaskAggregate, current: CoreTaskAggregate, command: Record<string, unknown>, actor: WorkManagementActorContext, now: Date): Promise<CoreTaskEffects> {
    let intents = emptyCoreTaskEffects();
    if (action === "ASSIGN") {
      const assigneeId = command.primaryAssigneeId;
      if (typeof assigneeId !== "string") throw new WorkManagementDomainError("TASK_ASSIGNEE_REQUIRED");
      if (assigneeId === current.primaryAssigneeId) throw new WorkManagementDomainError("TASK_PRIMARY_ASSIGNEE_CONFLICT");
      if (current.requiresIndependentReviewer && assigneeId === current.reviewerId) throw new WorkManagementDomainError("TASK_REVIEWER_CONFLICT");
      if (current.approverId && assigneeId === current.approverId) throw new WorkManagementDomainError("TASK_APPROVER_CONFLICT");
      const eligibility = await this.dependencies.users.evaluateAssignee({ userId: assigneeId, task: current });
      if (!eligibility.eligible) throw eligibilityError(eligibility.reason);
      next.primaryAssigneeId = assigneeId;
      next.assignedById = actor.actorId;
      intents = { ...intents, assignmentIntents: [{ taskId: next.id, previousAssigneeId: current.primaryAssigneeId, newAssigneeId: assigneeId, assignedById: actor.actorId, reason: typeof command.reason === "string" ? command.reason || null : null, effectiveAt: now, occurredAt: now }] };
    }
    if (action === "UPDATE_PROGRESS") {
      const progress = command.progressPercent;
      if (typeof progress !== "number" || progress < current.progressPercent) throw new WorkManagementDomainError("TASK_PROGRESS_INVALID");
      next.progressPercent = progress;
    }
    if (action === "REQUEST_CLARIFICATION") intents = { ...intents, clarificationIntents: [{ taskId: next.id, reason: String(command.reason), actorId: actor.actorId, occurredAt: now }] };
    if (action === "REQUEST_EXTENSION") {
      const requested = command.requestedDueAt;
      if (!(requested instanceof Date) || requested <= now || (current.deadlineAt && requested <= current.deadlineAt)) throw new WorkManagementDomainError("TASK_DATE_RANGE_INVALID");
      intents = { ...intents, extensionRequestIntents: [{ taskId: next.id, requestedDueAt: requested, reason: String(command.reason), actorId: actor.actorId, occurredAt: now }] };
    }
    if (action === "CHANGE_DEADLINE") {
      const newDeadline = command.currentDueAt;
      const reason = typeof command.reason === "string" ? command.reason.trim() : "";
      if (!(newDeadline instanceof Date) || !reason) throw new WorkManagementDomainError("TASK_DEADLINE_REASON_REQUIRED");
      if (current.deadlineAt?.getTime() === newDeadline.getTime()) throw new WorkManagementDomainError("TASK_DATE_RANGE_INVALID");
      next.deadlineAt = newDeadline;
      intents = { ...intents, deadlineHistoryIntents: [{ taskId: next.id, oldDeadlineAt: current.deadlineAt, newDeadlineAt: newDeadline, reason, changedById: actor.actorId, changedAt: now }] };
    }
    if (action === "PAUSE" || action === "RESUME") intents = { ...intents, executionHistoryIntents: [{ taskId: next.id, previousExecution: current.state.execution, newExecution: next.state.execution, reason: typeof command.reason === "string" ? command.reason : null, actorId: actor.actorId, occurredAt: now }] };
    if (action === "BLOCK") {
      if (current.activeBlockerId) throw new WorkManagementDomainError("TASK_INVALID_TRANSITION");
      const blockerId = `blocker:${this.dependencies.idGenerator.next()}`;
      next.activeBlockerId = blockerId;
      intents = { ...intents, blockerIntents: [{ blockerId, taskId: next.id, status: "OPEN", reason: String(command.reason), actorId: actor.actorId, occurredAt: now }] };
    }
    if (action === "UNBLOCK") {
      if (!current.activeBlockerId) throw new WorkManagementDomainError("TASK_INVALID_TRANSITION");
      next.activeBlockerId = null;
      intents = { ...intents, blockerIntents: [{ blockerId: current.activeBlockerId, taskId: next.id, status: "RESOLVED", reason: String(command.resolution), actorId: actor.actorId, occurredAt: now }] };
    }
    if (action === "SUBMIT") {
      const existing = current.submissions ?? [];
      if (current.state.execution !== "ACTIVE") throw new WorkManagementDomainError("TASK_INVALID_TRANSITION");
      if (current.state.review === "PENDING") throw new WorkManagementDomainError("TASK_SUBMISSION_ALREADY_PENDING");
      const sequence = (current.currentSubmissionSequence ?? 0) + 1;
      const submission = { id: `submission:${this.dependencies.idGenerator.next()}`, taskId: next.id, sequence, previousSubmissionId: current.currentSubmissionId ?? null, submittedById: actor.actorId, submittedAt: now, summary: String(command.summary), note: typeof command.remainingIssue === "string" ? command.remainingIssue : null };
      next.submissions = [...existing, submission]; next.currentSubmissionId = submission.id; next.currentSubmissionSequence = sequence;
      intents = { ...intents, submissionIntents: [{ submissionId: submission.id, taskId: next.id, sequence, submittedById: actor.actorId, submittedAt: now, summary: submission.summary, note: submission.note, previousSubmissionId: current.currentSubmissionId ?? null, aggregateVersion: next.version }] };
    }
    if (action === "REQUEST_CHANGES" || action === "APPROVE_RESULT") {
      const submissionId = command.submissionId;
      if (typeof submissionId !== "string") throw new WorkManagementDomainError("TASK_SUBMISSION_REQUIRED");
      const submission = (current.submissions ?? []).find((value) => value.id === submissionId);
      if (!submission) throw new WorkManagementDomainError("TASK_SUBMISSION_REQUIRED");
      if (submission.taskId !== current.id || submissionId !== current.currentSubmissionId) throw new WorkManagementDomainError("TASK_SUBMISSION_NOT_CURRENT");
      if (current.state.review === "RESULT_APPROVED") throw new WorkManagementDomainError("TASK_SUBMISSION_ALREADY_APPROVED");
      assertReviewSeparation({ actorId: actor.actorId, primaryAssigneeId: current.primaryAssigneeId, submissionAuthorId: submission.submittedById, requiresIndependentReviewer: current.requiresIndependentReviewer });
      const decision = action === "REQUEST_CHANGES" ? "CHANGES_REQUESTED" : "RESULT_APPROVED";
      const record = { id: `review:${this.dependencies.idGenerator.next()}`, submissionId, decision, reason: action === "REQUEST_CHANGES" ? String(command.reason) : null, decidedById: actor.actorId, decidedAt: now } as const;
      next.reviewDecisions = [...(current.reviewDecisions ?? []), record];
      intents = { ...intents, reviewDecisionIntents: [{ decisionId: record.id, taskId: next.id, submissionId, decision, reason: record.reason, decidedById: actor.actorId, decidedAt: now, aggregateVersion: next.version }] };
    }
    if (action === "CONFIRM_COMPLETION") {
      if (!current.currentSubmissionId) throw new WorkManagementDomainError("TASK_SUBMISSION_REQUIRED");
      if (current.state.review !== "RESULT_APPROVED") throw new WorkManagementDomainError("TASK_REVIEW_NOT_APPROVED");
      if (!(current.reviewDecisions ?? []).some((decision) => decision.submissionId === current.currentSubmissionId && decision.decision === "RESULT_APPROVED")) throw new WorkManagementDomainError("TASK_REVIEW_NOT_APPROVED");
      if (current.state.lifecycle === "COMPLETED") throw new WorkManagementDomainError("TASK_ALREADY_COMPLETED");
      await this.assertCompletion(current);
      next.completedById = actor.actorId; next.completedAt = now; next.completionSubmissionId = current.currentSubmissionId;
      intents = { ...intents, completionIntents: [{ taskId: next.id, submissionId: current.currentSubmissionId, completedById: actor.actorId, completedAt: now, previousLifecycle: "SUBMITTED", newLifecycle: "COMPLETED", aggregateVersion: next.version }] };
    }
    return this.effectsFor(action, next, current, command, actor, now, intents);
  }

  private async assertCompletion(current: CoreTaskAggregate): Promise<void> {
    if (current.progressPercent !== 100) throw new WorkManagementDomainError("TASK_COMPLETION_PROGRESS_INCOMPLETE");
    if (current.activeBlockerId) throw new WorkManagementDomainError("TASK_COMPLETION_BLOCKED");
    if (current.state.execution !== "ACTIVE") throw new WorkManagementDomainError("TASK_COMPLETION_EXECUTION_NOT_ACTIVE");
    if (["PENDING_TO_USER", "PENDING_APPROVAL", "APPROVED"].includes(current.state.handover)) throw new WorkManagementDomainError("TASK_COMPLETION_HANDOVER_PENDING");
    assertCompletionReadiness(await this.dependencies.completionReadiness.evaluate(current));
  }

  private effectsFor(action: CoreTaskAction, task: CoreTaskAggregate, current: CoreTaskAggregate | null, command: Readonly<Record<string, unknown>>, actor: WorkManagementActorContext, now: Date, intents: CoreTaskEffects): CoreTaskEffects {
    const definition = getWorkManagementActionDefinition(action);
    const payload = this.payloadFor(action, task, current, command, actor);
    return {
      ...intents,
      domainEvents: [{ type: definition.eventType, aggregateId: task.id, aggregateVersion: task.version, actorId: actor.actorId, occurredAt: now, correlationId: actor.correlationId, causationId: actor.causationId, payload }],
      activities: [{ type: definition.activityType, taskId: task.id, actorId: actor.actorId, occurredAt: now, payload }],
      audits: [{ action: definition.auditType, taskId: task.id, actorId: actor.actorId, occurredAt: now, correlationId: actor.correlationId, causationId: actor.causationId, payload }],
      notifications: definition.notificationPolicy === "OUTBOX_REQUIRED" ? [{ eventType: definition.eventType, taskId: task.id, aggregateVersion: task.version, correlationId: actor.correlationId, confidentiality: task.confidentiality, preview: null }] : [],
    };
  }

  private payloadFor(action: CoreTaskAction, next: CoreTaskAggregate, current: CoreTaskAggregate | null, command: Readonly<Record<string, unknown>>, actor: WorkManagementActorContext): Readonly<Record<string, unknown>> {
    const base = { action, taskId: next.id };
    if (action === "CREATE_DRAFT") return { ...base, title: next.title ?? "", projectId: next.projectId, confidentiality: next.confidentiality };
    if (!current) return base;
    if (action === "ASSIGN") return { ...base, previousAssigneeId: current.primaryAssigneeId, newAssigneeId: next.primaryAssigneeId, assignedById: actor.actorId };
    if (action === "ACCEPT") return { ...base, assigneeId: current.primaryAssigneeId, previousAcceptance: current.state.acceptance, newAcceptance: next.state.acceptance };
    if (action === "REQUEST_CLARIFICATION") return { ...base, reason: command.reason };
    if (action === "START") return { ...base, previousLifecycle: current.state.lifecycle, newLifecycle: next.state.lifecycle, previousExecution: current.state.execution, newExecution: next.state.execution };
    if (action === "UPDATE_PROGRESS") return { ...base, oldProgressPercent: current.progressPercent, newProgressPercent: next.progressPercent };
    if (action === "REQUEST_EXTENSION") return { ...base, currentDeadlineAt: current.deadlineAt, requestedDeadlineAt: command.requestedDueAt, reason: command.reason };
    if (action === "CHANGE_DEADLINE") return { ...base, oldDeadlineAt: current.deadlineAt, newDeadlineAt: next.deadlineAt, reason: command.reason };
    if (action === "PAUSE" || action === "RESUME") return { ...base, previousExecution: current.state.execution, newExecution: next.state.execution, reason: command.reason ?? null };
    if (action === "BLOCK") return { ...base, blockerId: next.activeBlockerId, reason: command.reason, previousExecution: current.state.execution, newExecution: next.state.execution };
    if (action === "SUBMIT") return { ...base, submissionId: next.currentSubmissionId, submissionSequence: next.currentSubmissionSequence, previousSubmissionId: current.currentSubmissionId ?? null, submittedById: actor.actorId, summary: command.summary, previousReviewState: current.state.review, newReviewState: next.state.review };
    if (action === "REQUEST_CHANGES") return { ...base, decisionId: next.reviewDecisions?.at(-1)?.id, submissionId: command.submissionId, reason: command.reason, decidedById: actor.actorId, previousReviewState: current.state.review, newReviewState: next.state.review };
    if (action === "APPROVE_RESULT") return { ...base, decisionId: next.reviewDecisions?.at(-1)?.id, submissionId: command.submissionId, approvedById: actor.actorId, previousReviewState: current.state.review, newReviewState: next.state.review };
    if (action === "CONFIRM_COMPLETION") return { ...base, submissionId: next.completionSubmissionId, completedById: next.completedById, completedAt: next.completedAt, previousLifecycle: current.state.lifecycle, newLifecycle: next.state.lifecycle, reviewState: next.state.review, progressPercent: next.progressPercent };
    return { ...base, blockerId: current.activeBlockerId, resolution: command.resolution, previousExecution: current.state.execution, newExecution: next.state.execution };
  }

  private async persist(current: CoreTaskAggregate, next: CoreTaskAggregate, effects: CoreTaskEffects, request: IdempotencyRequest): Promise<StableCoreTaskExecutionResult> {
    let started = false;
    try {
      await this.dependencies.idempotency.begin(request);
      started = true;
      return await this.dependencies.unitOfWork.run(async (transaction) => {
        if (!(await transaction.tasks.compareAndSave(current.id, current.version, next))) throw new WorkManagementDomainError("TASK_CONCURRENCY_CONFLICT");
        await transaction.effects.stage(effects);
        const result = { task: next, effects };
        await transaction.idempotency.complete(request, result);
        return result;
      });
    } catch (error) {
      if (started) {
        try { await this.dependencies.idempotency.abort(request, error instanceof Error ? error.message : "TASK_TRANSACTION_FAILED"); } catch { /* Preserve the transaction error; abort diagnostics belong to the adapter. */ }
      }
      throw error;
    }
  }

  private async persistCreate(task: CoreTaskAggregate, effects: CoreTaskEffects, request: IdempotencyRequest): Promise<StableCoreTaskExecutionResult> {
    let started = false;
    try {
      await this.dependencies.idempotency.begin(request);
      started = true;
      return await this.dependencies.unitOfWork.run(async (transaction) => {
        if (!(await transaction.tasks.create(task))) throw new WorkManagementDomainError("TASK_CONCURRENCY_CONFLICT");
        await transaction.effects.stage(effects);
        const result = { task, effects };
        await transaction.idempotency.complete(request, result);
        return result;
      });
    } catch (error) {
      if (started) {
        try { await this.dependencies.idempotency.abort(request, error instanceof Error ? error.message : "TASK_TRANSACTION_FAILED"); } catch { /* Preserve the transaction error; abort diagnostics belong to the adapter. */ }
      }
      throw error;
    }
  }
}
