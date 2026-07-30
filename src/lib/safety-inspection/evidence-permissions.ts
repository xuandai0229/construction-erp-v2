import type {
  Prisma,
  PrismaClient,
  SafetyCorrectiveActionStatus,
  SafetyFindingStatus,
} from "@prisma/client";
import type { SafetyPermission } from "./permissions";
import { safetyProjectScopeAllows } from "./permissions";
import type { SafetyProjectScope } from "./types";

type SafetyEvidencePermission =
  | "safety.evidence.view"
  | "safety.evidence.upload"
  | "safety.evidence.cancel";

export type SafetyEvidenceActorContext = {
  id: string;
  isCommandActor: boolean;
  unitNames: readonly string[];
  projectScope: SafetyProjectScope;
  permissions: ReadonlySet<SafetyPermission>;
};

export type SafetyEvidenceRelationTrace = {
  evidenceId: string | null;
  evidenceProjectId: string;
  findingId: string;
  findingProjectId: string;
  findingStatus: SafetyFindingStatus;
  action: {
    id: string;
    findingId: string;
    projectId: string;
    status: SafetyCorrectiveActionStatus;
    assigneeUserId: string | null;
    assigneeUnit: string | null;
  } | null;
  document: {
    id: string;
    projectId: string;
  } | null;
  cancelledAt: Date | null;
};

export interface SafetyEvidenceTraceRepository {
  findEvidenceTrace(
    evidenceId: string,
  ): Promise<SafetyEvidenceRelationTrace | null>;
  findUploadTrace(
    findingId: string,
    actionId: string | null,
    targetProjectId: string,
    documentId: string | null,
  ): Promise<SafetyEvidenceRelationTrace | null>;
}

export function createPrismaSafetyEvidenceTraceRepository(
  client: PrismaClient | Prisma.TransactionClient,
): SafetyEvidenceTraceRepository {
  return {
    async findEvidenceTrace(evidenceId) {
      const evidence = await client.safetyCorrectiveEvidence.findUnique({
        where: { id: evidenceId },
        select: {
          id: true,
          projectId: true,
          findingId: true,
          actionId: true,
          documentId: true,
          cancelledAt: true,
        },
      });
      if (!evidence) return null;
      const finding = await client.safetyFinding.findUnique({
        where: { id: evidence.findingId },
        select: { projectId: true, status: true },
      });
      if (!finding) return null;
      const action = evidence.actionId
        ? await client.safetyCorrectiveAction.findUnique({
            where: { id: evidence.actionId },
            select: {
              id: true,
              findingId: true,
              projectId: true,
              status: true,
              assigneeUserId: true,
              assigneeUnit: true,
            },
          })
        : null;
      const document = evidence.documentId
        ? await client.document.findUnique({
            where: { id: evidence.documentId },
            select: { id: true, projectId: true },
          })
        : null;
      if (
        (evidence.actionId && !action) ||
        (evidence.documentId && !document)
      ) {
        return null;
      }
      return {
        evidenceId: evidence.id,
        evidenceProjectId: evidence.projectId,
        findingId: evidence.findingId,
        findingProjectId: finding.projectId,
        findingStatus: finding.status,
        action,
        document,
        cancelledAt: evidence.cancelledAt,
      };
    },

    async findUploadTrace(findingId, actionId, targetProjectId, documentId) {
      const finding = await client.safetyFinding.findUnique({
        where: { id: findingId },
        select: { id: true, projectId: true, status: true },
      });
      if (!finding) return null;

      const action = actionId
        ? await client.safetyCorrectiveAction.findUnique({
            where: { id: actionId },
            select: {
              id: true,
              findingId: true,
              projectId: true,
              status: true,
              assigneeUserId: true,
              assigneeUnit: true,
            },
          })
        : null;
      if (actionId && !action) return null;
      const document = documentId
        ? await client.document.findUnique({
            where: { id: documentId },
            select: { id: true, projectId: true },
          })
        : null;
      if (documentId && !document) return null;

      return {
        evidenceId: null,
        evidenceProjectId: targetProjectId,
        findingId: finding.id,
        findingProjectId: finding.projectId,
        findingStatus: finding.status,
        action,
        document,
        cancelledAt: null,
      };
    },
  };
}

function assertEvidenceTraceConsistent(
  trace: SafetyEvidenceRelationTrace,
): string {
  if (trace.evidenceProjectId !== trace.findingProjectId) {
    throw new Error("Không thể truy cập bằng chứng ATLĐ.");
  }
  if (
    trace.action &&
    (trace.action.findingId !== trace.findingId ||
      trace.action.projectId !== trace.findingProjectId)
  ) {
    throw new Error("Không thể truy cập bằng chứng ATLĐ.");
  }
  if (
    trace.document &&
    trace.document.projectId !== trace.findingProjectId
  ) {
    throw new Error("Không thể truy cập bằng chứng ATLĐ.");
  }
  return trace.findingProjectId;
}

function assertEvidencePermission(
  actor: SafetyEvidenceActorContext,
  permission: SafetyEvidencePermission,
  trace: SafetyEvidenceRelationTrace,
): void {
  const projectId = assertEvidenceTraceConsistent(trace);
  if (
    !actor.permissions.has(permission) ||
    !safetyProjectScopeAllows(actor.projectScope, projectId)
  ) {
    throw new Error("Không thể truy cập bằng chứng ATLĐ.");
  }
}

export async function assertCanViewSafetyEvidence(
  repository: SafetyEvidenceTraceRepository,
  input: {
    actor: SafetyEvidenceActorContext;
    evidenceId: string;
  },
): Promise<SafetyEvidenceRelationTrace> {
  const trace = await repository.findEvidenceTrace(input.evidenceId);
  if (!trace || trace.cancelledAt) {
    throw new Error("Không thể truy cập bằng chứng ATLĐ.");
  }
  assertEvidencePermission(input.actor, "safety.evidence.view", trace);
  return trace;
}

export async function assertCanUploadSafetyEvidence(
  repository: SafetyEvidenceTraceRepository,
  input: {
    actor: SafetyEvidenceActorContext;
    findingId: string;
    actionId: string | null;
    targetProjectId: string;
    documentId: string | null;
  },
): Promise<SafetyEvidenceRelationTrace> {
  const trace = await repository.findUploadTrace(
    input.findingId,
    input.actionId,
    input.targetProjectId,
    input.documentId,
  );
  if (!trace) {
    throw new Error("Không thể truy cập bằng chứng ATLĐ.");
  }
  assertEvidencePermission(input.actor, "safety.evidence.upload", trace);
  if (
    trace.findingStatus === "COMPLETED" ||
    trace.findingStatus === "CANCELLED" ||
    (trace.action &&
      (trace.action.status === "ACCEPTED" ||
        trace.action.status === "CANCELLED"))
  ) {
    throw new Error("Không thể truy cập bằng chứng ATLĐ.");
  }
  if (
    input.actor.isCommandActor &&
    (!trace.action ||
      (trace.action.assigneeUserId !== input.actor.id &&
        (!trace.action.assigneeUnit ||
          !input.actor.unitNames.includes(trace.action.assigneeUnit))))
  ) {
    throw new Error("Không thể truy cập bằng chứng ATLĐ.");
  }
  return trace;
}

export async function assertCanCancelSafetyEvidence(
  repository: SafetyEvidenceTraceRepository,
  input: {
    actor: SafetyEvidenceActorContext;
    evidenceId: string;
    reason: string;
    usedInAcceptedReinspection: boolean;
    usedInLockedReport: boolean;
  },
): Promise<SafetyEvidenceRelationTrace> {
  const trace = await repository.findEvidenceTrace(input.evidenceId);
  if (
    !trace ||
    trace.cancelledAt ||
    !input.reason.trim() ||
    input.usedInAcceptedReinspection ||
    input.usedInLockedReport
  ) {
    throw new Error("Không thể truy cập bằng chứng ATLĐ.");
  }
  assertEvidencePermission(input.actor, "safety.evidence.cancel", trace);
  return trace;
}
