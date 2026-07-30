import type { PrismaClient } from "@prisma/client";
import { SafetyApiError } from "./errors";
import {
  assertSafetyActorPermission,
  assertSafetyActorProjectScope,
  type SafetyServerActor,
} from "./mutation-actor";

export const SAFETY_PLAN_APPROVAL_SOURCE_TYPE =
  "SAFETY_INSPECTION_PLAN" as const;

function approvalCode(planId: string, projectId: string): string {
  return `SAFETY-PLAN-${planId}-${projectId}`;
}

export async function submitSafetyPlanForApproval(
  client: PrismaClient,
  actor: SafetyServerActor,
  input: {
    planId: string;
    expectedVersion: number;
    clientMutationId: string;
  },
): Promise<{ planId: string; version: number }> {
  assertSafetyActorPermission(actor, "safety.plan.update");
  return client.$transaction(async (tx) => {
    const plan = await tx.safetyInspectionPlan.findUnique({
      where: { id: input.planId },
      include: { projects: true },
    });
    if (!plan) throw new Error("Kế hoạch không tồn tại.");
    if (!["DRAFT", "REVISION_REQUIRED"].includes(plan.status)) {
      throw new Error("Trạng thái kế hoạch không cho phép trình duyệt.");
    }
    if (plan.createdById !== actor.id) {
      throw new Error("Chỉ người lập kế hoạch được trình duyệt.");
    }
    if (plan.projects.length === 0) {
      throw new Error("Kế hoạch chưa có công trình để trình duyệt.");
    }
    for (const project of plan.projects) {
      assertSafetyActorProjectScope(actor, project.projectId);
    }
    const updated = await tx.safetyInspectionPlan.updateMany({
      where: { id: plan.id, version: input.expectedVersion },
      data: {
        status: "PENDING_APPROVAL",
        version: { increment: 1 },
      },
    });
    if (updated.count !== 1) {
      throw new Error("Phiên bản kế hoạch đã thay đổi.");
    }

    for (const project of plan.projects) {
      const envelope = await tx.approvalRequest.upsert({
        where: { code: approvalCode(plan.id, project.projectId) },
        update: {
          status: "PENDING",
          requesterId: actor.id,
          decidedById: null,
          decidedAt: null,
          decisionNote: null,
          deletedAt: null,
        },
        create: {
          code: approvalCode(plan.id, project.projectId),
          projectId: project.projectId,
          title: `Duyệt kế hoạch ATLĐ ${plan.documentNumber ?? plan.id}`,
          description: "Envelope phê duyệt kế hoạch ATLĐ.",
          type: "SAFETY",
          status: "PENDING",
          requesterId: actor.id,
          sourceType: SAFETY_PLAN_APPROVAL_SOURCE_TYPE,
          sourceId: plan.id,
          entityType: "SafetyInspectionPlan",
          entityId: plan.id,
        },
      });
      await tx.safetyApprovalHistory.create({
        data: {
          projectId: project.projectId,
          aggregateType: "PLAN",
          aggregateId: plan.id,
          fromStatus: plan.status,
          toStatus: "PENDING_APPROVAL",
          actorId: actor.id,
          approvalRequestId: envelope.id,
        },
      });
    }
    await tx.safetyAuditLog.create({
      data: {
        aggregateType: "PLAN",
        aggregateId: plan.id,
        action: "SUBMIT_PLAN",
        actorId: actor.id,
        correlationId: input.clientMutationId,
        beforeData: { status: plan.status, version: plan.version },
        afterData: {
          status: "PENDING_APPROVAL",
          version: input.expectedVersion + 1,
        },
      },
    });
    return { planId: plan.id, version: input.expectedVersion + 1 };
  });
}

export async function decideSafetyPlanApproval(
  client: PrismaClient,
  actor: SafetyServerActor,
  input: {
    planId: string;
    expectedVersion: number;
    clientMutationId: string;
    decision: "APPROVE" | "RETURN";
    reason: string | null;
  },
): Promise<{ planId: string; status: "APPROVED" | "REVISION_REQUIRED"; version: number }> {
  assertSafetyActorPermission(
    actor,
    input.decision === "APPROVE"
      ? "safety.plan.approve"
      : actor.permissions.has("safety.plan.review")
        ? "safety.plan.review"
        : "safety.plan.approve",
  );
  if (input.decision === "RETURN" && !input.reason?.trim()) {
    throw new Error("Trả lại kế hoạch phải có lý do.");
  }

  return client.$transaction(async (tx) => {
    const plan = await tx.safetyInspectionPlan.findUnique({
      where: { id: input.planId },
      include: { projects: true },
    });
    if (!plan) throw new Error("Kế hoạch không tồn tại.");
    if (plan.status !== "PENDING_APPROVAL") {
      throw new Error("Kế hoạch không ở trạng thái chờ duyệt.");
    }
    for (const project of plan.projects) {
      assertSafetyActorProjectScope(actor, project.projectId);
    }
    const targetStatus =
      input.decision === "APPROVE" ? "APPROVED" : "REVISION_REQUIRED";
    const updated = await tx.safetyInspectionPlan.updateMany({
      where: { id: plan.id, version: input.expectedVersion },
      data: {
        status: targetStatus,
        approvedById:
          input.decision === "APPROVE" ? actor.id : null,
        approvedAt:
          input.decision === "APPROVE" ? new Date() : null,
        version: { increment: 1 },
      },
    });
    if (updated.count !== 1) {
      throw new Error("Phiên bản kế hoạch đã thay đổi.");
    }
    const envelopes = await tx.approvalRequest.findMany({
      where: {
        sourceType: SAFETY_PLAN_APPROVAL_SOURCE_TYPE,
        sourceId: plan.id,
        status: "PENDING",
        deletedAt: null,
      },
    });
    const expectedProjects = new Set(
      plan.projects.map((project) => project.projectId),
    );
    const envelopeProjects = new Set(
      envelopes.map((envelope) => envelope.projectId),
    );
    if (
      envelopes.length !== expectedProjects.size ||
      [...expectedProjects].some(
        (projectId) => !envelopeProjects.has(projectId),
      )
    ) {
      throw new SafetyApiError(
        "SAFETY_STATE_CONFLICT",
        "Hồ sơ duyệt đa công trình chưa đầy đủ; không thể duyệt một phần.",
      );
    }
    for (const envelope of envelopes) {
      await tx.approvalRequest.update({
        where: { id: envelope.id },
        data: {
          status:
            input.decision === "APPROVE" ? "APPROVED" : "REJECTED",
          decidedById: actor.id,
          decidedAt: new Date(),
          decisionNote: input.reason,
        },
      });
      await tx.safetyApprovalHistory.create({
        data: {
          projectId: envelope.projectId,
          aggregateType: "PLAN",
          aggregateId: plan.id,
          fromStatus: plan.status,
          toStatus: targetStatus,
          actorId: actor.id,
          reason: input.reason,
          approvalRequestId: envelope.id,
        },
      });
    }
    await tx.safetyAuditLog.create({
      data: {
        aggregateType: "PLAN",
        aggregateId: plan.id,
        action:
          input.decision === "APPROVE" ? "APPROVE_PLAN" : "RETURN_PLAN",
        actorId: actor.id,
        correlationId: input.clientMutationId,
        beforeData: { status: plan.status, version: plan.version },
        afterData: {
          status: targetStatus,
          version: input.expectedVersion + 1,
          reason: input.reason,
        },
      },
    });
    return {
      planId: plan.id,
      status: targetStatus,
      version: input.expectedVersion + 1,
    };
  });
}
