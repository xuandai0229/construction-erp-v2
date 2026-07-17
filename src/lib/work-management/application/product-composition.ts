import { randomUUID } from "node:crypto";
import { UserRole } from "@prisma/client";
import prisma from "@/lib/prisma";
import { getSession, type SessionUser } from "@/lib/auth";
import { canAccessProject, isCompanyWideUser } from "@/lib/rbac";
import { WorkManagementDomainError } from "../errors/codes";
import { resolveTransitionPolicy } from "../domain/transition-policies";
import { WORK_MANAGEMENT_PERMISSIONS, type WorkManagementPermission, type WorkManagementScope } from "../permissions/contract";
import { CoreTaskExecutor, type CoreTaskAggregate, type WorkManagementActorContext } from "./core-task-executor";
import { PrismaCoreTaskIdempotency, PrismaCoreTaskRepository, PrismaCoreTaskUnitOfWork } from "../infrastructure/prisma-core-task";

const companyWide = new Set<UserRole>(["ADMIN", "DIRECTOR", "DEPUTY_DIRECTOR"]);
const operationalPermissions = new Set<WorkManagementPermission>([
  "task.create.personal", "task.accept", "task.request_clarification", "task.update_progress", "task.submit",
  "task.review", "task.approve", "task.complete", "task.pause", "task.resume",
]);

function permissionsFor(role: UserRole): ReadonlySet<WorkManagementPermission> {
  if (companyWide.has(role) || role === "MANAGER") return new Set(WORK_MANAGEMENT_PERMISSIONS);
  if (role === "STAFF" || role === "ENGINEER" || role === "CHIEF_COMMANDER") return new Set(operationalPermissions);
  return new Set(["task.view.own"]);
}

function relations(task: CoreTaskAggregate, actorId: string): Array<"CREATOR" | "ASSIGNED_BY" | "PRIMARY_ASSIGNEE" | "REVIEWER" | "APPROVER"> {
  const value: Array<"CREATOR" | "ASSIGNED_BY" | "PRIMARY_ASSIGNEE" | "REVIEWER" | "APPROVER"> = [];
  if (task.creatorId === actorId) value.push("CREATOR");
  if (task.assignedById === actorId) value.push("ASSIGNED_BY");
  if (task.primaryAssigneeId === actorId) value.push("PRIMARY_ASSIGNEE");
  if (task.reviewerId === actorId) value.push("REVIEWER");
  if (task.approverId === actorId) value.push("APPROVER");
  return value;
}

export async function getTrustedWorkManagementActor(): Promise<WorkManagementActorContext> {
  const session = await getSession();
  if (!session) throw new WorkManagementDomainError("TASK_ACCESS_DENIED");
  return actorFromSession(session);
}

export function actorFromSession(session: SessionUser): WorkManagementActorContext {
  return {
    actorType: "USER",
    actorId: session.id,
    // The legacy ERP schema has no company entity. Null is explicit server-owned context,
    // never a client-selected company ID.
    companyId: null,
    permissionSet: permissionsFor(session.role),
    resolvedScopes: [],
    correlationId: randomUUID(),
    causationId: null,
    requestId: randomUUID(),
  };
}

export function createProductCoreTaskExecutor(session: SessionUser): CoreTaskExecutor {
  return new CoreTaskExecutor({
    tasks: new PrismaCoreTaskRepository(prisma),
    users: {
      evaluateAssignee: async ({ userId, task }) => {
        const user = await prisma.user.findUnique({ where: { id: userId }, select: { isActive: true, deletedAt: true, role: true } });
        if (!user) return { eligible: false, reason: "NOT_FOUND" };
        if (!user.isActive || user.deletedAt) return { eligible: false, reason: "INACTIVE" };
        if (task.projectId && !(await canAccessProject({ id: userId, role: user.role }, task.projectId))) return { eligible: false, reason: "NO_PROJECT_ACCESS" };
        return { eligible: true, projectAccess: true };
      },
    },
    scopes: {
      resolve: async (task, currentActor) => {
        const value: WorkManagementScope[] = [];
        const actorRelations = relations(task, currentActor.actorId);
        if (actorRelations.includes("CREATOR") || actorRelations.includes("PRIMARY_ASSIGNEE")) value.push("OWN");
        if (actorRelations.includes("PRIMARY_ASSIGNEE")) value.push("ASSIGNED_SCOPE");
        if (actorRelations.includes("REVIEWER") || actorRelations.includes("APPROVER")) value.push("PARTICIPATING");
        const hasProjectAccess = task.projectId ? await canAccessProject(session, task.projectId) : false;
        if (hasProjectAccess && (isCompanyWideUser(session) || session.role === "MANAGER" || session.role === "CHIEF_COMMANDER")) value.push("PROJECT");
        if (isCompanyWideUser(session)) value.push("COMPANY");
        return { scopes: value, relations: actorRelations, confidentialAllowed: hasProjectAccess || isCompanyWideUser(session) };
      },
      resolveCreate: async ({ projectId, confidentiality }) => {
        if (!projectId) return { projectExists: false, projectAccessible: false, scopes: [], confidentialAllowed: false };
        const project = await prisma.project.findFirst({ where: { id: projectId, deletedAt: null }, select: { id: true } });
        const projectAccessible = Boolean(project) && await canAccessProject(session, projectId);
        return { projectExists: Boolean(project), projectAccessible, scopes: projectAccessible ? ["OWN"] : [], confidentialAllowed: confidentiality === "NORMAL" || projectAccessible };
      },
    },
    unitOfWork: new PrismaCoreTaskUnitOfWork(prisma),
    idempotency: new PrismaCoreTaskIdempotency(prisma),
    clock: { now: () => new Date() },
    idGenerator: { next: () => randomUUID() },
    transitionPolicies: { resolve: resolveTransitionPolicy },
    completionReadiness: { evaluate: async () => ({ ready: true }) },
  });
}

export async function executeProductTaskAction(input: { action: Parameters<CoreTaskExecutor["execute"]>[0]["action"]; command: unknown; idempotencyKey: string }) {
  const session = await getSession();
  if (!session) throw new WorkManagementDomainError("TASK_ACCESS_DENIED");
  return createProductCoreTaskExecutor(session).execute({
    action: input.action,
    rawCommand: input.command,
    actor: actorFromSession(session),
    idempotencyKey: input.idempotencyKey,
  });
}
