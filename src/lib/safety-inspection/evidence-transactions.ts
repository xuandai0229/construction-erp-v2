import { Prisma, PrismaClient } from "@prisma/client";
import {
  assertCanCancelSafetyEvidence,
  createPrismaSafetyEvidenceTraceRepository,
} from "./evidence-permissions";
import type { SafetyServerActor } from "./mutation-actor";

export async function cancelSafetyEvidence(
  client: PrismaClient,
  actor: SafetyServerActor,
  input: {
    evidenceId: string;
    expectedVersion: number;
    reason: string;
    clientMutationId: string;
  },
): Promise<void> {
  await client.$transaction(
    async (tx) => {
      const evidence = await tx.safetyCorrectiveEvidence.findUnique({
        where: { id: input.evidenceId },
        select: { id: true, projectId: true, findingId: true },
      });
      if (!evidence) throw new Error("Không thể truy cập bằng chứng ATLĐ.");
      const finding = await tx.safetyFinding.findUnique({
        where: { id: evidence.findingId },
        select: { sessionId: true },
      });
      if (!finding) throw new Error("Không thể truy cập bằng chứng ATLĐ.");
      const acceptedReinspectionCount = await tx.safetyReinspection.count({
        where: {
          findingId: evidence.findingId,
          decision: "ACCEPT_COMPLETION",
        },
      });
      const lockedReport = await tx.safetyWeeklyReportEntry.findFirst({
        where: {
          sessionId: finding.sessionId,
          cancelledAt: null,
          report: { status: "LOCKED" },
        },
        select: { id: true },
      });

      const repository = createPrismaSafetyEvidenceTraceRepository(tx);
      await assertCanCancelSafetyEvidence(repository, {
        actor,
        evidenceId: input.evidenceId,
        reason: input.reason,
        usedInAcceptedReinspection:
          acceptedReinspectionCount > 0,
        usedInLockedReport: lockedReport !== null,
      });
      const updated = await tx.safetyCorrectiveEvidence.updateMany({
        where: {
          id: input.evidenceId,
          version: input.expectedVersion,
          cancelledAt: null,
        },
        data: {
          cancelledAt: new Date(),
          cancelledById: actor.id,
          cancelReason: input.reason.trim(),
          version: { increment: 1 },
        },
      });
      if (updated.count !== 1) {
        throw new Error("Bằng chứng đã thay đổi, vui lòng tải lại.");
      }
      await tx.safetyAuditLog.create({
        data: {
          projectId: evidence.projectId,
          aggregateType: "EVIDENCE",
          aggregateId: evidence.id,
          action: "CANCEL_EVIDENCE",
          beforeData: { evidenceId: evidence.id },
          afterData: {
            evidenceId: evidence.id,
            reason: input.reason.trim(),
          },
          actorId: actor.id,
          correlationId: input.clientMutationId,
        },
      });
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}
