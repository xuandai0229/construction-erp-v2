import { createHash } from "node:crypto";
import {
  Prisma,
  PrismaClient,
  type SafetyReinspectionDecision,
  type SafetyResultStatus,
  type SafetySeverity,
} from "@prisma/client";
import {
  deriveSafetyReinspectionTransition,
  resolveSafetyReinspectionPolicy,
} from "./finding-domain";
import {
  assertChecklistItemEligibleForSession,
  assertCompletedAtMatchesFindingStatus,
  assertInspectionResultTransition,
  assertSafetySessionMutable,
} from "./inspection-domain";
import type { SafetyMutationIdentity } from "./idempotency";
import {
  assertSafetyActorPermission,
  assertSafetyActorProjectScope,
  type SafetyServerActor,
} from "./mutation-actor";

function mutationHash(value: object): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

async function lockMutationIdentity(
  tx: Prisma.TransactionClient,
  identity: SafetyMutationIdentity,
): Promise<void> {
  const lockKey = [
    identity.actorId,
    identity.aggregateType,
    identity.aggregateId,
    identity.clientMutationId,
  ].join(":");
  await tx.$queryRaw`
    SELECT pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))::text AS "locked"
  `;
}

async function findIdempotency(
  tx: Prisma.TransactionClient,
  identity: SafetyMutationIdentity,
) {
  return tx.safetyIdempotency.findUnique({
    where: {
      actorId_aggregateType_aggregateId_clientMutationId: {
        actorId: identity.actorId,
        aggregateType: identity.aggregateType,
        aggregateId: identity.aggregateId,
        clientMutationId: identity.clientMutationId,
      },
    },
  });
}

function assertSameRequestHash(existingHash: string, incomingHash: string): void {
  if (existingHash !== incomingHash) {
    throw new Error(
      "Mã thao tác đã được dùng cho một nội dung khác. Vui lòng đồng bộ lại.",
    );
  }
}

function throwSafeConcurrencyError(error: unknown): never {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    (error.code === "P2002" || error.code === "P2034")
  ) {
    throw new Error(
      "Dữ liệu đã được thiết bị khác cập nhật, vui lòng đồng bộ và thử lại.",
    );
  }
  throw error;
}

function isJsonObject(
  value: Prisma.JsonValue | null,
): value is Prisma.JsonObject {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function readString(value: Prisma.JsonValue | undefined): string | null {
  return typeof value === "string" ? value : null;
}

function readStringArray(value: Prisma.JsonValue | undefined): string[] | null {
  return Array.isArray(value) && value.every((item) => typeof item === "string")
    ? value
    : null;
}

export type SafetyFindingDraft = {
  localReference: string | null;
  description: string;
  severity: SafetySeverity;
  violationGroup: string | null;
  location: string | null;
  workSuspended: boolean;
  temporaryMeasure: string | null;
  responsibleUnit: string | null;
  responsibleUserId: string | null;
  dueAt: Date | null;
};

export type SaveInspectionResultInput = {
  clientMutationId: string;
  expectedSessionVersion: number;
  expectedResultVersion: number | null;
  sessionId: string;
  checklistItemId: string;
  status: SafetyResultStatus;
  note: string | null;
  notApplicableReason: string | null;
  inspectedAt: Date;
  findings: readonly SafetyFindingDraft[];
};

export type SaveInspectionResultResponse = {
  resultId: string;
  findingIds: string[];
  findingCodes: string[];
  replayed: boolean;
};

function readSaveResultReceipt(
  resultData: Prisma.JsonValue | null,
): Omit<SaveInspectionResultResponse, "replayed"> {
  if (!isJsonObject(resultData)) {
    throw new Error("Biên nhận đồng bộ kết quả kiểm tra không hợp lệ.");
  }
  const resultId = readString(resultData.resultId);
  const findingIds = readStringArray(resultData.findingIds);
  const findingCodes = readStringArray(resultData.findingCodes);
  if (!resultId || !findingIds || !findingCodes) {
    throw new Error("Biên nhận đồng bộ kết quả kiểm tra không hợp lệ.");
  }
  return { resultId, findingIds, findingCodes };
}

function safetyBusinessYear(value: Date): number {
  return Number(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Ho_Chi_Minh",
      year: "numeric",
    }).format(value),
  );
}

async function allocateSafetyFindingCode(
  tx: Prisma.TransactionClient,
  occurredAt: Date,
): Promise<string> {
  const businessYear = safetyBusinessYear(occurredAt);
  const rows = await tx.$queryRaw<Array<{ allocatedNumber: number }>>`
    INSERT INTO "SafetyFindingSequence" ("businessYear", "nextNumber", "updatedAt")
    VALUES (${businessYear}, 2, NOW())
    ON CONFLICT ("businessYear") DO UPDATE
      SET "nextNumber" = "SafetyFindingSequence"."nextNumber" + 1,
          "updatedAt" = NOW()
    RETURNING "nextNumber" - 1 AS "allocatedNumber"
  `;
  const allocatedNumber = rows[0]?.allocatedNumber;
  if (!Number.isInteger(allocatedNumber) || allocatedNumber < 1) {
    throw new Error("Không thể cấp mã tồn tại ATLĐ.");
  }
  return `ATLD-${businessYear}-${String(allocatedNumber).padStart(6, "0")}`;
}

export async function saveInspectionResultWithFinding(
  client: PrismaClient,
  actor: SafetyServerActor,
  input: SaveInspectionResultInput,
): Promise<SaveInspectionResultResponse> {
  assertSafetyActorPermission(actor, "safety.session.start");
  if (input.status === "FAIL") {
    assertSafetyActorPermission(actor, "safety.finding.create");
  }

  const aggregateId = `${input.sessionId}:${input.checklistItemId}`;
  const identity: SafetyMutationIdentity = {
    actorId: actor.id,
    aggregateType: "RESULT",
    aggregateId,
    clientMutationId: input.clientMutationId,
  };
  const requestHash = mutationHash(input);

  try {
    return await client.$transaction(
      async (tx) => {
      await lockMutationIdentity(tx, identity);
      const receipt = await findIdempotency(tx, identity);
      if (receipt) {
        assertSameRequestHash(receipt.requestHash, requestHash);
        return {
          ...readSaveResultReceipt(receipt.resultData),
          replayed: true,
        };
      }

      const session = await tx.safetyInspectionSession.findUnique({
        where: { id: input.sessionId },
      });
      if (!session) throw new Error("Phiên kiểm tra không tồn tại.");
      assertSafetySessionMutable(session.status);
      assertSafetyActorProjectScope(actor, session.projectId);
      if (session.version !== input.expectedSessionVersion) {
        throw new Error("Phiên kiểm tra đã thay đổi, vui lòng tải lại dữ liệu.");
      }
      const selectedOnSchedule = session.scheduleId
        ? (await tx.safetyInspectionScheduleChecklistItem.count({
            where: {
              scheduleId: session.scheduleId,
              checklistItemId: input.checklistItemId,
            },
          })) === 1
        : false;

      const checklistItem = await tx.safetyChecklistItem.findUnique({
        where: { id: input.checklistItemId },
        select: {
          isActive: true,
          section: { select: { templateId: true } },
        },
      });
      if (!checklistItem) throw new Error("Mục kiểm tra không tồn tại.");
      assertChecklistItemEligibleForSession({
        sessionTemplateId: session.checklistTemplateId,
        itemTemplateId: checklistItem.section.templateId,
        scheduleId: session.scheduleId,
        selectedOnSchedule,
        itemActive: checklistItem.isActive,
      });

      const existing = await tx.safetyInspectionResult.findUnique({
        where: {
          sessionId_checklistItemId: {
            sessionId: input.sessionId,
            checklistItemId: input.checklistItemId,
          },
        },
      });
      const existingFindings = existing
        ? await tx.safetyFinding.findMany({
            where: { inspectionResultId: existing.id },
            orderBy: { createdAt: "asc" },
            select: { id: true, code: true },
          })
        : [];
      if (
        (existing === null && input.expectedResultVersion !== null) ||
        (existing !== null &&
          input.expectedResultVersion !== existing.version)
      ) {
        throw new Error(
          "Kết quả kiểm tra đã thay đổi, vui lòng tải lại dữ liệu.",
        );
      }
      assertInspectionResultTransition({
        currentStatus: existing?.status ?? null,
        nextStatus: input.status,
        existingFindingCount: existingFindings.length,
        newFindingCount: input.findings.length,
        notApplicableReason: input.notApplicableReason,
      });

      let resultId: string;
      if (existing) {
        const updated = await tx.safetyInspectionResult.updateMany({
          where: { id: existing.id, version: input.expectedResultVersion! },
          data: {
            status: input.status,
            note: input.note,
            notApplicableReason: input.notApplicableReason,
            inspectedAt: input.inspectedAt,
            inspectedById: actor.id,
            version: { increment: 1 },
          },
        });
        if (updated.count !== 1) {
          throw new Error(
            "Kết quả kiểm tra đã thay đổi, vui lòng tải lại dữ liệu.",
          );
        }
        resultId = existing.id;
      } else {
        const created = await tx.safetyInspectionResult.create({
          data: {
            sessionId: input.sessionId,
            projectId: session.projectId,
            checklistItemId: input.checklistItemId,
            status: input.status,
            note: input.note,
            notApplicableReason: input.notApplicableReason,
            inspectedAt: input.inspectedAt,
            inspectedById: actor.id,
          },
        });
        resultId = created.id;
      }

      const newFindingIds: string[] = [];
      const newFindingCodes: string[] = [];
      for (const finding of input.findings) {
        const code = await allocateSafetyFindingCode(tx, input.inspectedAt);
        const created = await tx.safetyFinding.create({
          data: {
            projectId: session.projectId,
            sessionId: input.sessionId,
            inspectionResultId: resultId,
            code,
            localReference: finding.localReference,
            description: finding.description,
            severity: finding.severity,
            violationGroup: finding.violationGroup,
            location: finding.location,
            workSuspended: finding.workSuspended,
            temporaryMeasure: finding.temporaryMeasure,
            responsibleUnit: finding.responsibleUnit,
            responsibleUserId: finding.responsibleUserId,
            originalDueAt: finding.dueAt,
            effectiveDueAt: finding.dueAt,
            status: "NEW",
            createdById: actor.id,
          },
          select: { id: true, code: true },
        });
        newFindingIds.push(created.id);
        newFindingCodes.push(created.code);
      }
      const findingIds = [
        ...existingFindings.map((finding) => finding.id),
        ...newFindingIds,
      ];
      const existingFindingCodes = existingFindings.map(
        (finding) => finding.code,
      );
      const findingCodes = [...existingFindingCodes, ...newFindingCodes];

      const sessionUpdate = await tx.safetyInspectionSession.updateMany({
        where: {
          id: input.sessionId,
          version: input.expectedSessionVersion,
        },
        data: { version: { increment: 1 } },
      });
      if (sessionUpdate.count !== 1) {
        throw new Error("Phiên kiểm tra đã thay đổi, vui lòng tải lại dữ liệu.");
      }

      const immutableResult = { resultId, findingIds, findingCodes };
      await tx.safetyAuditLog.create({
        data: {
          projectId: session.projectId,
          aggregateType: "RESULT",
          aggregateId: resultId,
          action:
            input.status === "FAIL"
              ? "SAVE_FAIL_WITH_FINDINGS"
              : "SAVE_RESULT",
          afterData: {
            status: input.status,
            findingIds,
          },
          actorId: actor.id,
          occurredAt: input.inspectedAt,
          correlationId: input.clientMutationId,
        },
      });
      await tx.safetyIdempotency.create({
        data: {
          actorId: actor.id,
          aggregateType: "RESULT",
          aggregateId,
          clientMutationId: input.clientMutationId,
          requestHash,
          resultData: immutableResult,
          completedAt: new Date(),
        },
      });
      return { ...immutableResult, replayed: false };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
    );
  } catch (error) {
    throwSafeConcurrencyError(error);
  }
}

export type RecordReinspectionInput = {
  clientMutationId: string;
  expectedFindingVersion: number;
  expectedActionVersion: number;
  findingId: string;
  actionId: string;
  decision: SafetyReinspectionDecision;
  conclusion: string;
  reason: string | null;
  inspectedAt: Date;
  newDueAt: Date | null;
  newSeverity: SafetySeverity | null;
  suspensionReason: string | null;
};

function readReinspectionReceipt(
  resultData: Prisma.JsonValue | null,
): string {
  if (!isJsonObject(resultData)) {
    throw new Error("Biên nhận kiểm tra lại không hợp lệ.");
  }
  const reinspectionId = readString(resultData.reinspectionId);
  if (!reinspectionId) throw new Error("Biên nhận kiểm tra lại không hợp lệ.");
  return reinspectionId;
}

export async function recordSafetyReinspection(
  client: PrismaClient,
  actor: SafetyServerActor,
  input: RecordReinspectionInput,
): Promise<{ reinspectionId: string; replayed: boolean }> {
  assertSafetyActorPermission(actor, "safety.reinspection.decide");
  const identity: SafetyMutationIdentity = {
    actorId: actor.id,
    aggregateType: "REINSPECTION",
    aggregateId: input.findingId,
    clientMutationId: input.clientMutationId,
  };
  const requestHash = mutationHash(input);

  try {
    return await client.$transaction(
      async (tx) => {
      await lockMutationIdentity(tx, identity);
      const receipt = await findIdempotency(tx, identity);
      if (receipt) {
        assertSameRequestHash(receipt.requestHash, requestHash);
        return {
          reinspectionId: readReinspectionReceipt(receipt.resultData),
          replayed: true,
        };
      }

      const action = await tx.safetyCorrectiveAction.findUnique({
        where: { id: input.actionId },
        include: { finding: true },
      });
      if (!action || action.findingId !== input.findingId) {
        throw new Error("Yêu cầu khắc phục không thuộc tồn tại.");
      }
      assertSafetyActorProjectScope(actor, action.projectId);
      if (action.projectId !== action.finding.projectId) {
        throw new Error("Yêu cầu khắc phục không cùng công trình với tồn tại.");
      }
      if (action.finding.version !== input.expectedFindingVersion) {
        throw new Error("Tồn tại đã thay đổi, vui lòng tải lại dữ liệu.");
      }
      if (action.version !== input.expectedActionVersion) {
        throw new Error("Yêu cầu khắc phục đã thay đổi, vui lòng tải lại dữ liệu.");
      }

      const policy = resolveSafetyReinspectionPolicy({
        actorId: actor.id,
        remediationSubmittedById: action.submittedById,
        permissions: actor.permissions,
      });
      const transition = deriveSafetyReinspectionTransition({
        findingStatus: action.finding.status,
        actionStatus: action.status,
        findingCompletedAt: action.finding.completedAt,
        effectiveDueAt: action.finding.effectiveDueAt,
        currentSeverity: action.finding.severity,
        decision: input.decision,
        conclusion: input.conclusion,
        reason: input.reason,
        newDueAt: input.newDueAt,
        newSeverity: input.newSeverity,
        suspensionReason: input.suspensionReason,
        canSuspendWork: policy.canSuspendWork,
        inspectedAt: input.inspectedAt,
      });
      assertCompletedAtMatchesFindingStatus(
        transition.findingStatus,
        transition.completedAt,
      );

      const findingUpdate = await tx.safetyFinding.updateMany({
        where: {
          id: input.findingId,
          version: input.expectedFindingVersion,
        },
        data: {
          status: transition.findingStatus,
          completedAt: transition.completedAt,
          effectiveDueAt: transition.effectiveDueAt,
          severity: transition.severity,
          workSuspended:
            action.finding.workSuspended || transition.workSuspended,
          version: { increment: 1 },
        },
      });
      const actionUpdate = await tx.safetyCorrectiveAction.updateMany({
        where: {
          id: input.actionId,
          version: input.expectedActionVersion,
        },
        data: {
          status: transition.actionStatus,
          version: { increment: 1 },
        },
      });
      if (findingUpdate.count !== 1 || actionUpdate.count !== 1) {
        throw new Error("Dữ liệu kiểm tra lại đã thay đổi, vui lòng tải lại.");
      }

      const reinspection = await tx.safetyReinspection.create({
        data: {
          projectId: action.projectId,
          findingId: input.findingId,
          actionId: input.actionId,
          inspectorId: actor.id,
          decision: input.decision,
          conclusion: input.conclusion.trim(),
          reason: input.reason?.trim() || null,
          inspectedAt: input.inspectedAt,
          previousDueAt: action.finding.effectiveDueAt,
          newDueAt:
            input.decision === "EXTEND_DUE_DATE" ? input.newDueAt : null,
          extensionReason:
            input.decision === "EXTEND_DUE_DATE"
              ? input.reason?.trim() || null
              : null,
          previousSeverity: action.finding.severity,
          newSeverity:
            input.decision === "ESCALATE_SEVERITY"
              ? input.newSeverity
              : null,
          suspensionReason:
            input.decision === "SUSPEND_WORK"
              ? input.suspensionReason?.trim() || null
              : null,
        },
      });
      await tx.safetyAuditLog.create({
        data: {
          projectId: action.projectId,
          aggregateType: "REINSPECTION",
          aggregateId: input.findingId,
          action: input.decision,
          beforeData: {
            findingStatus: action.finding.status,
            actionStatus: action.status,
            effectiveDueAt: action.finding.effectiveDueAt,
            severity: action.finding.severity,
          },
          afterData: {
            findingStatus: transition.findingStatus,
            actionStatus: transition.actionStatus,
            effectiveDueAt: transition.effectiveDueAt,
            severity: transition.severity,
            workSuspended: transition.workSuspended,
          },
          actorId: actor.id,
          occurredAt: input.inspectedAt,
          correlationId: input.clientMutationId,
        },
      });
      await tx.safetyIdempotency.create({
        data: {
          actorId: actor.id,
          aggregateType: "REINSPECTION",
          aggregateId: input.findingId,
          clientMutationId: input.clientMutationId,
          requestHash,
          resultData: { reinspectionId: reinspection.id },
          completedAt: new Date(),
        },
      });
      return { reinspectionId: reinspection.id, replayed: false };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
    );
  } catch (error) {
    throwSafeConcurrencyError(error);
  }
}
