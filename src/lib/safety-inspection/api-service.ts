import type { PrismaClient } from "@prisma/client";
import prisma from "@/lib/prisma";
import {
  decideSafetyPlanApproval,
  submitSafetyPlanForApproval,
} from "./approval-adapter";
import { SafetyApiError } from "./errors";
import {
  assertSafetyActorPermission,
  assertSafetyActorProjectScope,
} from "./mutation-actor";
import { filterSafetyPlanForActor, type SafetyPlanProjection } from "./plan-dto";
import {
  cancelSafetyScheduleWithScope,
  createSafetyScheduleWithScope,
  updateSafetyScheduleWithScope,
  type SafetyScheduleMutationData,
} from "./scope-transactions";
import {
  createSafetyInspectionSession,
} from "./session-transactions";
import {
  safetyActorForProject,
  safetyActorFromContext,
  type SafetyServerActorContext,
} from "./server-actor-context";
import {
  recordSafetyReinspection,
  saveInspectionResultWithFinding,
} from "./transactions";
import { validateSafetyWeek } from "./week";
import type { SafetyConstructionType } from "./types";

function assertPermission(
  context: SafetyServerActorContext,
  permission: Parameters<typeof assertSafetyActorPermission>[1],
): void {
  assertSafetyActorPermission(safetyActorFromContext(context), permission);
}

function planProjection(
  plan: Awaited<ReturnType<typeof loadPlans>>[number],
): SafetyPlanProjection {
  return {
    id: plan.id,
    documentYear: plan.documentYear,
    documentNumber: plan.documentNumber,
    weekStart: plan.weekStart,
    weekEnd: plan.weekEnd,
    status: plan.status,
    version: plan.version,
    schedules: plan.schedules.map((schedule) => ({
      id: schedule.id,
      projectId: schedule.projectId,
      projectName: schedule.project.name,
      scheduledDate: schedule.scheduledDate,
      shift: schedule.shift,
      status: schedule.status,
      collaborators: schedule.collaborators.map((item) => ({
        id: item.userId,
        name: item.displayNameSnapshot,
      })),
      checklistItems: schedule.checklistItems.map((item) => ({
        id: item.checklistItemId,
        label:
          item.checklistItem.normalizedLabel ??
          item.checklistItem.sourceText,
      })),
    })),
  };
}

function loadPlans(client: PrismaClient, planId?: string) {
  return client.safetyInspectionPlan.findMany({
    where: planId ? { id: planId } : undefined,
    orderBy: { weekStart: "desc" },
    include: {
      schedules: {
        where: { status: { not: "CANCELLED" } },
        orderBy: [
          { scheduledDate: "asc" },
          { shift: "asc" },
          { sortOrder: "asc" },
        ],
        include: {
          project: { select: { name: true } },
          collaborators: true,
          checklistItems: {
            include: {
              checklistItem: {
                select: {
                  sourceText: true,
                  normalizedLabel: true,
                },
              },
            },
          },
        },
      },
    },
  });
}

export async function getActiveSafetyChecklist(
  context: SafetyServerActorContext,
  constructionType: SafetyConstructionType,
) {
  assertPermission(context, "safety.view");
  const template = await prisma.safetyChecklistTemplate.findFirst({
    where: {
      code: "SAFETY_COMPANY_V1",
      isActive: true,
      isLocked: true,
    },
    orderBy: { version: "desc" },
    include: {
      sections: {
        where: { constructionTypes: { has: constructionType } },
        orderBy: { sortOrder: "asc" },
        include: {
          items: {
            where: {
              isActive: true,
              constructionTypes: { has: constructionType },
            },
            orderBy: { sortOrder: "asc" },
          },
        },
      },
    },
  });
  if (!template) {
    throw new SafetyApiError(
      "SAFETY_TEMPLATE_UNAVAILABLE",
      "Chưa có checklist ATLĐ phù hợp đang hiệu lực.",
    );
  }
  return {
    id: template.id,
    code: template.code,
    version: template.version,
    canonicalHash: template.canonicalHash,
    sections: template.sections.map((section) => ({
      id: section.id,
      code: section.code,
      title: section.title,
      items: section.items.map((item) => ({
        id: item.id,
        code: item.code,
        sourceText: item.sourceText,
        normalizedLabel: item.normalizedLabel,
        requiresFindingWhenFail: item.requiresFindingWhenFail,
        sourceDocument: item.sourceDocument,
        sourceReference: item.sourceReference,
        reportItemNumbers: item.reportItemNumbers,
      })),
    })),
  };
}

export async function listSafetyPlans(context: SafetyServerActorContext) {
  assertPermission(context, "safety.view");
  const plans = await loadPlans(prisma);
  return plans
    .map((plan) =>
      filterSafetyPlanForActor(planProjection(plan), context.projectScope),
    )
    .filter((plan) => plan !== null);
}

export async function getSafetyPlan(
  context: SafetyServerActorContext,
  planId: string,
) {
  assertPermission(context, "safety.view");
  const [plan] = await loadPlans(prisma, planId);
  const dto = plan
    ? filterSafetyPlanForActor(planProjection(plan), context.projectScope)
    : null;
  if (!dto) {
    throw new SafetyApiError(
      "SAFETY_FORBIDDEN_OR_NOT_FOUND",
      "Không thể truy cập dữ liệu ATLĐ được yêu cầu.",
    );
  }
  return dto;
}

export async function createSafetyPlan(
  context: SafetyServerActorContext,
  input: {
    clientMutationId: string;
    documentYear: number;
    sequenceNumber?: number | null;
    documentNumber?: string | null;
    weekStart: Date;
    weekEnd: Date;
    isWeekException: boolean;
    weekExceptionReason?: string | null;
    createdDate: Date;
    legalBases: string[];
    purpose?: string | null;
    recipients: string[];
    note?: string | null;
  },
) {
  assertPermission(context, "safety.plan.create");
  validateSafetyWeek({
    weekStart: input.weekStart.toISOString().slice(0, 10),
    weekEnd: input.weekEnd.toISOString().slice(0, 10),
    isException: input.isWeekException,
    exceptionReason: input.weekExceptionReason ?? null,
  });
  return prisma.$transaction(async (tx) => {
    const plan = await tx.safetyInspectionPlan.create({
      data: {
        documentYear: input.documentYear,
        sequenceNumber: input.sequenceNumber,
        documentNumber: input.documentNumber,
        weekStart: input.weekStart,
        weekEnd: input.weekEnd,
        isWeekException: input.isWeekException,
        weekExceptionReason: input.weekExceptionReason,
        createdDate: input.createdDate,
        legalBases: input.legalBases,
        purpose: input.purpose,
        recipients: input.recipients,
        note: input.note,
        createdById: context.actorId,
      },
    });
    await tx.safetyAuditLog.create({
      data: {
        aggregateType: "PLAN",
        aggregateId: plan.id,
        action: "CREATE_PLAN_DRAFT",
        actorId: context.actorId,
        correlationId: context.correlationId,
        afterData: { version: 1, clientMutationId: input.clientMutationId },
      },
    });
    return { id: plan.id, version: plan.version, status: plan.status };
  });
}

export async function updateSafetyPlan(
  context: SafetyServerActorContext,
  planId: string,
  input: {
    clientMutationId: string;
    expectedVersion: number;
    documentNumber?: string | null;
    weekStart?: Date;
    weekEnd?: Date;
    isWeekException?: boolean;
    weekExceptionReason?: string | null;
    legalBases?: string[];
    purpose?: string | null;
    recipients?: string[];
    note?: string | null;
  },
) {
  assertPermission(context, "safety.plan.update");
  return prisma.$transaction(async (tx) => {
    const plan = await tx.safetyInspectionPlan.findUnique({
      where: { id: planId },
      include: { projects: true },
    });
    if (!plan || plan.createdById !== context.actorId) {
      throw new SafetyApiError(
        "SAFETY_FORBIDDEN_OR_NOT_FOUND",
        "Không thể truy cập dữ liệu ATLĐ được yêu cầu.",
      );
    }
    if (!["DRAFT", "REVISION_REQUIRED"].includes(plan.status)) {
      throw new SafetyApiError(
        "SAFETY_RESOURCE_LOCKED",
        "Kế hoạch đã khóa trạng thái chỉnh sửa.",
      );
    }
    for (const item of plan.projects) {
      assertSafetyActorProjectScope(
        safetyActorForProject(context, item.projectId),
        item.projectId,
      );
    }
    const weekStart = input.weekStart ?? plan.weekStart;
    const weekEnd = input.weekEnd ?? plan.weekEnd;
    const isException = input.isWeekException ?? plan.isWeekException;
    const reason =
      input.weekExceptionReason === undefined
        ? plan.weekExceptionReason
        : input.weekExceptionReason;
    validateSafetyWeek({
      weekStart: weekStart.toISOString().slice(0, 10),
      weekEnd: weekEnd.toISOString().slice(0, 10),
      isException,
      exceptionReason: reason,
    });
    const updated = await tx.safetyInspectionPlan.updateMany({
      where: { id: plan.id, version: input.expectedVersion },
      data: {
        documentNumber: input.documentNumber,
        weekStart,
        weekEnd,
        isWeekException: isException,
        weekExceptionReason: reason,
        legalBases: input.legalBases,
        purpose: input.purpose,
        recipients: input.recipients,
        note: input.note,
        version: { increment: 1 },
      },
    });
    if (updated.count !== 1) {
      throw new SafetyApiError(
        "SAFETY_VERSION_CONFLICT",
        "Dữ liệu đã được cập nhật ở thiết bị khác.",
      );
    }
    await tx.safetyAuditLog.create({
      data: {
        aggregateType: "PLAN",
        aggregateId: plan.id,
        action: "UPDATE_PLAN",
        actorId: context.actorId,
        correlationId: context.correlationId,
        beforeData: { version: plan.version },
        afterData: {
          version: input.expectedVersion + 1,
          clientMutationId: input.clientMutationId,
        },
      },
    });
    return { id: plan.id, version: input.expectedVersion + 1 };
  });
}

export async function mutateSafetySchedule(
  context: SafetyServerActorContext,
  input:
    | {
        mode: "CREATE";
        planId: string;
        expectedPlanVersion: number;
        clientMutationId: string;
        data: SafetyScheduleMutationData;
      }
    | {
        mode: "UPDATE";
        scheduleId: string;
        expectedScheduleVersion: number;
        expectedPlanVersion: number;
        clientMutationId: string;
        data: SafetyScheduleMutationData;
      }
    | {
        mode: "CANCEL";
        scheduleId: string;
        expectedScheduleVersion: number;
        expectedPlanVersion: number;
        clientMutationId: string;
        reason: string;
      },
) {
  if (input.mode === "CREATE") {
    return createSafetyScheduleWithScope(
      prisma,
      safetyActorForProject(context, input.data.projectId),
      input,
    );
  }
  if (input.mode === "UPDATE") {
    await updateSafetyScheduleWithScope(
      prisma,
      safetyActorForProject(context, input.data.projectId),
      input,
    );
    return { scheduleId: input.scheduleId };
  }
  const schedule = await prisma.safetyInspectionSchedule.findUnique({
    where: { id: input.scheduleId },
    select: { projectId: true },
  });
  if (!schedule) {
    throw new SafetyApiError(
      "SAFETY_FORBIDDEN_OR_NOT_FOUND",
      "Không thể truy cập dữ liệu ATLĐ được yêu cầu.",
    );
  }
  await cancelSafetyScheduleWithScope(
    prisma,
    safetyActorForProject(context, schedule.projectId),
    input,
  );
  return { scheduleId: input.scheduleId };
}

export async function configureSafetySchedule(
  context: SafetyServerActorContext,
  scheduleId: string,
  input: {
    expectedVersion: number;
    clientMutationId: string;
    collaboratorUserIds: string[];
    checklistItemIds: string[];
  },
) {
  return prisma.$transaction(async (tx) => {
    const schedule = await tx.safetyInspectionSchedule.findUnique({
      where: { id: scheduleId },
      include: { plan: true },
    });
    if (!schedule) {
      throw new SafetyApiError(
        "SAFETY_FORBIDDEN_OR_NOT_FOUND",
        "Không thể truy cập dữ liệu ATLĐ được yêu cầu.",
      );
    }
    const actor = safetyActorForProject(context, schedule.projectId);
    assertSafetyActorPermission(actor, "safety.plan.update");
    assertSafetyActorProjectScope(actor, schedule.projectId);
    if (!["DRAFT", "REVISION_REQUIRED"].includes(schedule.plan.status)) {
      throw new SafetyApiError(
        "SAFETY_RESOURCE_LOCKED",
        "Kế hoạch đã khóa trạng thái chỉnh sửa.",
      );
    }
    const users = await tx.user.findMany({
      where: { id: { in: input.collaboratorUserIds }, deletedAt: null },
      select: { id: true, name: true, role: true },
    });
    if (users.length !== new Set(input.collaboratorUserIds).size) {
      throw new SafetyApiError(
        "SAFETY_VALIDATION_FAILED",
        "Người phối hợp không hợp lệ.",
      );
    }
    const template = await tx.safetyChecklistTemplate.findFirst({
      where: { code: "SAFETY_COMPANY_V1", isActive: true, isLocked: true },
      select: { id: true },
    });
    const items = template
      ? await tx.safetyChecklistItem.findMany({
          where: {
            id: { in: input.checklistItemIds },
            section: { templateId: template.id },
            constructionTypes: { has: schedule.constructionType },
          },
          select: { id: true },
        })
      : [];
    if (items.length !== new Set(input.checklistItemIds).size) {
      throw new SafetyApiError(
        "SAFETY_VALIDATION_FAILED",
        "Checklist dự kiến không thuộc template/loại công trình.",
      );
    }
    const updated = await tx.safetyInspectionSchedule.updateMany({
      where: { id: schedule.id, version: input.expectedVersion },
      data: { version: { increment: 1 } },
    });
    if (updated.count !== 1) {
      throw new SafetyApiError(
        "SAFETY_VERSION_CONFLICT",
        "Dữ liệu đã được cập nhật ở thiết bị khác.",
      );
    }
    await tx.safetyInspectionScheduleCollaborator.deleteMany({
      where: { scheduleId },
    });
    await tx.safetyInspectionScheduleChecklistItem.deleteMany({
      where: { scheduleId },
    });
    if (users.length) {
      await tx.safetyInspectionScheduleCollaborator.createMany({
        data: users.map((user) => ({
          scheduleId,
          userId: user.id,
          displayNameSnapshot: user.name,
          roleSnapshot: user.role,
        })),
      });
    }
    if (items.length) {
      await tx.safetyInspectionScheduleChecklistItem.createMany({
        data: items.map((item, index) => ({
          scheduleId,
          checklistItemId: item.id,
          sortOrder: index,
        })),
      });
    }
    await tx.safetyAuditLog.create({
      data: {
        projectId: schedule.projectId,
        aggregateType: "SCHEDULE",
        aggregateId: schedule.id,
        action: "CONFIGURE_SCHEDULE",
        actorId: context.actorId,
        correlationId: context.correlationId,
        afterData: {
          collaboratorCount: users.length,
          checklistItemCount: items.length,
          clientMutationId: input.clientMutationId,
        },
      },
    });
    return { scheduleId, version: input.expectedVersion + 1 };
  });
}

export async function decideSafetyPlan(
  context: SafetyServerActorContext,
  planId: string,
  input: {
    expectedVersion: number;
    clientMutationId: string;
    decision: "SUBMIT" | "APPROVE" | "RETURN";
    reason?: string | null;
  },
) {
  const actor = safetyActorFromContext(context);
  return input.decision === "SUBMIT"
    ? submitSafetyPlanForApproval(prisma, actor, {
        planId,
        expectedVersion: input.expectedVersion,
        clientMutationId: input.clientMutationId,
      })
    : decideSafetyPlanApproval(prisma, actor, {
        planId,
        expectedVersion: input.expectedVersion,
        clientMutationId: input.clientMutationId,
        decision: input.decision,
        reason: input.reason ?? null,
      });
}

export async function startSafetySession(
  context: SafetyServerActorContext,
  input:
    | {
        kind: "SCHEDULED";
        scheduleId: string;
        expectedVersion: number;
        clientMutationId: string;
        occurredAt: Date;
        shift: "MORNING" | "AFTERNOON" | "EVENING";
        location?: string | null;
      }
    | {
        kind: "UNPLANNED";
        projectId: string;
        constructionType: SafetyConstructionType;
        reason: string;
        clientMutationId: string;
        occurredAt: Date;
        shift: "MORNING" | "AFTERNOON" | "EVENING";
        location?: string | null;
      },
) {
  const source =
    input.kind === "SCHEDULED"
      ? await prisma.safetyInspectionSchedule.findUnique({
          where: { id: input.scheduleId },
          select: { projectId: true, constructionType: true },
        })
      : { projectId: input.projectId, constructionType: input.constructionType };
  if (!source) {
    throw new SafetyApiError(
      "SAFETY_FORBIDDEN_OR_NOT_FOUND",
      "Không thể truy cập dữ liệu ATLĐ được yêu cầu.",
    );
  }
  const template = await prisma.safetyChecklistTemplate.findFirst({
    where: {
      code: "SAFETY_COMPANY_V1",
      isActive: true,
      isLocked: true,
      sections: {
        some: { constructionTypes: { has: source.constructionType } },
      },
    },
    select: { id: true },
  });
  if (!template) {
    throw new SafetyApiError(
      "SAFETY_TEMPLATE_UNAVAILABLE",
      "Chưa có checklist ATLĐ phù hợp đang hiệu lực.",
    );
  }
  return createSafetyInspectionSession(
    prisma,
    safetyActorForProject(context, source.projectId),
    {
      clientMutationId: input.clientMutationId,
      checklistTemplateId: template.id,
      occurredAt: input.occurredAt,
      shift: input.shift,
      location: input.location ?? null,
      source:
        input.kind === "SCHEDULED"
          ? {
              kind: "SCHEDULED",
              scheduleId: input.scheduleId,
              expectedScheduleVersion: input.expectedVersion,
            }
          : {
              kind: "UNPLANNED",
              projectId: input.projectId,
              constructionType: input.constructionType,
              reason: input.reason,
            },
    },
  );
}

export async function getSafetySession(
  context: SafetyServerActorContext,
  sessionId: string,
) {
  const session = await prisma.safetyInspectionSession.findUnique({
    where: { id: sessionId },
    include: {
      project: { select: { id: true, code: true, name: true } },
      checklistTemplate: {
        include: {
          sections: {
            orderBy: { sortOrder: "asc" },
            include: {
              items: {
                where: { isActive: true },
                orderBy: { sortOrder: "asc" },
              },
            },
          },
        },
      },
      results: { include: { findings: true } },
    },
  });
  if (!session) {
    throw new SafetyApiError(
      "SAFETY_FORBIDDEN_OR_NOT_FOUND",
      "Không thể truy cập dữ liệu ATLĐ được yêu cầu.",
    );
  }
  const actor = safetyActorForProject(context, session.projectId);
  assertSafetyActorProjectScope(actor, session.projectId);
  assertSafetyActorPermission(actor, "safety.view");
  return {
    id: session.id,
    project: session.project,
    status: session.status,
    version: session.version,
    occurredAt: session.occurredAt.toISOString(),
    shift: session.shift,
    constructionType: session.constructionType,
    template: {
      id: session.checklistTemplate.id,
      code: session.checklistTemplate.code,
      version: session.checklistTemplate.version,
      sections: session.checklistTemplate.sections
        .filter((section) =>
          section.constructionTypes.includes(session.constructionType),
        )
        .map((section) => ({
          id: section.id,
          code: section.code,
          title: section.title,
          items: section.items
            .filter((item) =>
              item.constructionTypes.includes(session.constructionType),
            )
            .map((item) => ({
              id: item.id,
              code: item.code,
              sourceText: item.sourceText,
              normalizedLabel: item.normalizedLabel,
            })),
        })),
    },
    results: session.results.map((result) => ({
      id: result.id,
      checklistItemId: result.checklistItemId,
      status: result.status,
      note: result.note,
      notApplicableReason: result.notApplicableReason,
      version: result.version,
      findings: result.findings.map((finding) => ({
        id: finding.id,
        code: finding.code,
        status: finding.status,
        severity: finding.severity,
      })),
    })),
  };
}

export async function saveSafetySessionResult(
  context: SafetyServerActorContext,
  sessionId: string,
  input: Omit<
    Parameters<typeof saveInspectionResultWithFinding>[2],
    "sessionId"
  >,
) {
  const session = await prisma.safetyInspectionSession.findUnique({
    where: { id: sessionId },
    select: { projectId: true },
  });
  if (!session) {
    throw new SafetyApiError(
      "SAFETY_FORBIDDEN_OR_NOT_FOUND",
      "Không thể truy cập dữ liệu ATLĐ được yêu cầu.",
    );
  }
  return saveInspectionResultWithFinding(
    prisma,
    safetyActorForProject(context, session.projectId),
    { ...input, sessionId },
  );
}

export async function completeSafetySession(
  context: SafetyServerActorContext,
  sessionId: string,
  input: {
    expectedVersion: number;
    clientMutationId: string;
  },
) {
  return prisma.$transaction(async (tx) => {
    const session = await tx.safetyInspectionSession.findUnique({
      where: { id: sessionId },
      include: { results: true },
    });
    if (!session) {
      throw new SafetyApiError(
        "SAFETY_FORBIDDEN_OR_NOT_FOUND",
        "Không thể truy cập dữ liệu ATLĐ được yêu cầu.",
      );
    }
    const actor = safetyActorForProject(context, session.projectId);
    assertSafetyActorPermission(actor, "safety.session.complete");
    assertSafetyActorProjectScope(actor, session.projectId);
    if (!["DRAFT", "IN_PROGRESS"].includes(session.status)) {
      throw new SafetyApiError(
        "SAFETY_STATE_CONFLICT",
        "Phiên kiểm tra không còn ở trạng thái có thể hoàn tất.",
      );
    }
    if (
      session.results.length === 0 ||
      session.results.some((result) => result.status === "NOT_INSPECTED")
    ) {
      throw new SafetyApiError(
        "SAFETY_VALIDATION_FAILED",
        "Còn nội dung chưa được kiểm tra.",
      );
    }
    const updated = await tx.safetyInspectionSession.updateMany({
      where: { id: session.id, version: input.expectedVersion },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        version: { increment: 1 },
      },
    });
    if (updated.count !== 1) {
      throw new SafetyApiError(
        "SAFETY_VERSION_CONFLICT",
        "Dữ liệu đã được cập nhật ở thiết bị khác.",
      );
    }
    await tx.safetyAuditLog.create({
      data: {
        projectId: session.projectId,
        aggregateType: "SESSION",
        aggregateId: session.id,
        action: "COMPLETE_SESSION",
        actorId: context.actorId,
        correlationId: context.correlationId,
        afterData: {
          version: input.expectedVersion + 1,
          clientMutationId: input.clientMutationId,
        },
      },
    });
    return { sessionId, version: input.expectedVersion + 1 };
  });
}

export async function listSafetyFindings(
  context: SafetyServerActorContext,
  projectId?: string,
) {
  assertPermission(context, "safety.view");
  if (projectId) {
    assertSafetyActorProjectScope(
      safetyActorForProject(context, projectId),
      projectId,
    );
  }
  const allowedProjectIds =
    context.projectScope.kind === "PROJECT_IDS"
      ? [...context.projectScope.projectIds]
      : context.projectScope.kind === "NO_PROJECTS"
        ? []
        : null;
  return prisma.safetyFinding.findMany({
    where: {
      ...(projectId
        ? { projectId }
        : allowedProjectIds
          ? { projectId: { in: allowedProjectIds } }
          : {}),
    },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      projectId: true,
      code: true,
      description: true,
      severity: true,
      status: true,
      effectiveDueAt: true,
      completedAt: true,
      version: true,
    },
  });
}

export async function getSafetyFinding(
  context: SafetyServerActorContext,
  findingId: string,
) {
  const finding = await prisma.safetyFinding.findUnique({
    where: { id: findingId },
    include: {
      actions: {
        select: {
          id: true,
          status: true,
          assigneeUserId: true,
          assigneeUnit: true,
          requestText: true,
          submittedResult: true,
          version: true,
        },
      },
      reinspections: {
        select: {
          id: true,
          decision: true,
          conclusion: true,
          inspectedAt: true,
        },
      },
    },
  });
  if (!finding) {
    throw new SafetyApiError(
      "SAFETY_FORBIDDEN_OR_NOT_FOUND",
      "Không thể truy cập dữ liệu ATLĐ được yêu cầu.",
    );
  }
  const actor = safetyActorForProject(context, finding.projectId);
  assertSafetyActorProjectScope(actor, finding.projectId);
  assertSafetyActorPermission(actor, "safety.view");
  return finding;
}

export async function assignSafetyFinding(
  context: SafetyServerActorContext,
  findingId: string,
  input: {
    expectedVersion: number;
    clientMutationId: string;
    assigneeUserId?: string | null;
    assigneeUnit: string;
    requestText: string;
    requestedDueAt?: Date | null;
  },
) {
  return prisma.$transaction(async (tx) => {
    const finding = await tx.safetyFinding.findUnique({
      where: { id: findingId },
    });
    if (!finding) {
      throw new SafetyApiError(
        "SAFETY_FORBIDDEN_OR_NOT_FOUND",
        "Không thể truy cập dữ liệu ATLĐ được yêu cầu.",
      );
    }
    const actor = safetyActorForProject(context, finding.projectId);
    assertSafetyActorPermission(actor, "safety.finding.update");
    assertSafetyActorProjectScope(actor, finding.projectId);
    if (["COMPLETED", "CANCELLED"].includes(finding.status)) {
      throw new SafetyApiError(
        "SAFETY_STATE_CONFLICT",
        "Tồn tại không còn ở trạng thái có thể giao xử lý.",
      );
    }
    const action = await tx.safetyCorrectiveAction.create({
      data: {
        findingId,
        projectId: finding.projectId,
        requestText: input.requestText,
        assigneeUserId: input.assigneeUserId,
        assigneeUnit: input.assigneeUnit,
        requestedDueAtSnapshot: input.requestedDueAt,
        createdById: context.actorId,
      },
    });
    const updated = await tx.safetyFinding.updateMany({
      where: { id: findingId, version: input.expectedVersion },
      data: {
        status: "ASSIGNED",
        assignedAt: new Date(),
        responsibleUserId: input.assigneeUserId,
        responsibleUnit: input.assigneeUnit,
        originalDueAt: input.requestedDueAt,
        effectiveDueAt: input.requestedDueAt,
        version: { increment: 1 },
      },
    });
    if (updated.count !== 1) {
      throw new SafetyApiError(
        "SAFETY_VERSION_CONFLICT",
        "Dữ liệu đã được cập nhật ở thiết bị khác.",
      );
    }
    await tx.safetyAuditLog.create({
      data: {
        projectId: finding.projectId,
        aggregateType: "CORRECTIVE_ACTION",
        aggregateId: action.id,
        action: "ASSIGN_CORRECTIVE_ACTION",
        actorId: context.actorId,
        correlationId: context.correlationId,
        afterData: {
          findingId,
          clientMutationId: input.clientMutationId,
        },
      },
    });
    return { actionId: action.id, findingVersion: input.expectedVersion + 1 };
  });
}

export async function submitSafetyRemediation(
  context: SafetyServerActorContext,
  findingId: string,
  input: {
    actionId: string;
    expectedVersion: number;
    expectedActionVersion: number;
    clientMutationId: string;
    resultText: string;
  },
) {
  return prisma.$transaction(async (tx) => {
    const action = await tx.safetyCorrectiveAction.findUnique({
      where: { id: input.actionId },
      include: { finding: true },
    });
    if (!action || action.findingId !== findingId) {
      throw new SafetyApiError(
        "SAFETY_FORBIDDEN_OR_NOT_FOUND",
        "Không thể truy cập dữ liệu ATLĐ được yêu cầu.",
      );
    }
    const actor = safetyActorForProject(context, action.projectId);
    assertSafetyActorPermission(actor, "safety.remediation.submit");
    assertSafetyActorProjectScope(actor, action.projectId);
    if (
      action.assigneeUserId &&
      action.assigneeUserId !== context.actorId
    ) {
      throw new SafetyApiError(
        "SAFETY_FORBIDDEN_OR_NOT_FOUND",
        "Không thể truy cập dữ liệu ATLĐ được yêu cầu.",
      );
    }
    const actionUpdated = await tx.safetyCorrectiveAction.updateMany({
      where: { id: action.id, version: input.expectedActionVersion },
      data: {
        status: "SUBMITTED",
        submittedResult: input.resultText,
        submittedById: context.actorId,
        submittedAt: new Date(),
        version: { increment: 1 },
      },
    });
    const findingUpdated = await tx.safetyFinding.updateMany({
      where: { id: findingId, version: input.expectedVersion },
      data: {
        status: "WAITING_REINSPECTION",
        version: { increment: 1 },
      },
    });
    if (actionUpdated.count !== 1 || findingUpdated.count !== 1) {
      throw new SafetyApiError(
        "SAFETY_VERSION_CONFLICT",
        "Dữ liệu đã được cập nhật ở thiết bị khác.",
      );
    }
    await tx.safetyAuditLog.create({
      data: {
        projectId: action.projectId,
        aggregateType: "CORRECTIVE_ACTION",
        aggregateId: action.id,
        action: "SUBMIT_REMEDIATION",
        actorId: context.actorId,
        correlationId: context.correlationId,
        afterData: { clientMutationId: input.clientMutationId },
      },
    });
    return {
      actionId: action.id,
      actionVersion: input.expectedActionVersion + 1,
      findingVersion: input.expectedVersion + 1,
    };
  });
}

export async function reinspectSafetyFinding(
  context: SafetyServerActorContext,
  findingId: string,
  input: Omit<
    Parameters<typeof recordSafetyReinspection>[2],
    "findingId"
  >,
) {
  const finding = await prisma.safetyFinding.findUnique({
    where: { id: findingId },
    select: { projectId: true },
  });
  if (!finding) {
    throw new SafetyApiError(
      "SAFETY_FORBIDDEN_OR_NOT_FOUND",
      "Không thể truy cập dữ liệu ATLĐ được yêu cầu.",
    );
  }
  return recordSafetyReinspection(
    prisma,
    safetyActorForProject(context, finding.projectId),
    { ...input, findingId },
  );
}
