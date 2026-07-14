import "dotenv/config";
import { assertSafeQaDatabase } from "./qa/assert-safe-qa-database";
import { createSafeQaPrismaClient } from "./qa/create-safe-qa-prisma-client";

const APPLY_CONFIRMATION = "REPAIR_MATERIAL_APPROVAL_SOURCE_IDS";
const args = new Set(process.argv.slice(2));
const shouldApply = args.has("--apply");
const confirmed = args.has("--confirm") && process.argv.includes(APPLY_CONFIRMATION);

async function main() {
  const safety = await assertSafeQaDatabase();
  if (!safety.safe || !process.env.QA_DATABASE_URL) throw new Error("QA safety guard chưa đạt; không chạy repair.");
  const { prisma, close } = createSafeQaPrismaClient(process.env.QA_DATABASE_URL);
  try {
  if (shouldApply && !confirmed) {
    throw new Error(`Apply mode requires: --apply --confirm ${APPLY_CONFIRMATION}`);
  }

  const requests = await prisma.materialRequest.findMany({
    where: { deletedAt: null },
    select: { id: true, requestNo: true, projectId: true },
  });
  const requestIds = new Set(requests.map((request) => request.id));
  const requestByNo = new Map(requests.map((request) => [request.requestNo, request]));

  const approvals = await prisma.approvalRequest.findMany({
    where: { sourceType: "MATERIAL_REQUEST", type: "MATERIAL", deletedAt: null },
    select: {
      id: true,
      code: true,
      sourceId: true,
      status: true,
      projectId: true,
      decidedById: true,
      decidedAt: true,
      decisionNote: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const canonicalByRequestId = new Map<string, typeof approvals>();
  for (const approval of approvals) {
    if (!approval.sourceId || !requestIds.has(approval.sourceId)) continue;
    canonicalByRequestId.set(approval.sourceId, [...(canonicalByRequestId.get(approval.sourceId) || []), approval]);
  }

  const repairCandidates = approvals
    .filter((approval) => approval.sourceId && !requestIds.has(approval.sourceId))
    .map((approval) => ({ approval, request: approval.sourceId ? requestByNo.get(approval.sourceId) : undefined }))
    .filter((item) => item.request);

  const unresolved = approvals
    .filter((approval) => approval.sourceId && !requestIds.has(approval.sourceId) && !requestByNo.has(approval.sourceId))
    .map((approval) => ({
      approvalId: approval.id,
      code: approval.code,
      sourceId: approval.sourceId,
      status: approval.status,
      projectId: approval.projectId,
    }));

  const repaired: Array<{ approvalId: string; code: string; oldSourceId: string | null; newSourceId: string }> = [];
  const softDeletedDuplicates: Array<{ approvalId: string; code: string; sourceId: string | null }> = [];
  const warnings: string[] = [];

  if (shouldApply) {
    await prisma.$transaction(async (tx) => {
      for (const { approval, request } of repairCandidates) {
        if (!request) continue;
        const canonicalApprovals = canonicalByRequestId.get(request.id) || [];
        for (const duplicate of canonicalApprovals) {
          const hasDecision = Boolean(duplicate.decidedById || duplicate.decidedAt || duplicate.decisionNote);
          if (hasDecision || duplicate.status !== "PENDING") {
            warnings.push(`Canonical approval ${duplicate.code} for ${request.requestNo} has decision/history; left active.`);
            continue;
          }
          await tx.approvalRequest.update({
            where: { id: duplicate.id },
            data: { deletedAt: new Date(), status: "CANCELLED", decisionNote: "Superseded by legacy approval sourceId repair." },
          });
          softDeletedDuplicates.push({ approvalId: duplicate.id, code: duplicate.code, sourceId: duplicate.sourceId });
        }

        await tx.approvalRequest.update({
          where: { id: approval.id },
          data: { sourceId: request.id },
        });
        repaired.push({
          approvalId: approval.id,
          code: approval.code,
          oldSourceId: approval.sourceId,
          newSourceId: request.id,
        });
      }
    });
  }

  console.log(
    JSON.stringify(
      {
        mode: shouldApply ? "APPLY" : "DRY_RUN",
        confirmationRequired: APPLY_CONFIRMATION,
        totals: {
          activeMaterialApprovals: approvals.length,
          repairCandidates: repairCandidates.length,
          unresolved: unresolved.length,
          repaired: repaired.length,
          softDeletedDuplicates: softDeletedDuplicates.length,
          warnings: warnings.length,
        },
        candidates: repairCandidates.map(({ approval, request }) => ({
          approvalId: approval.id,
          code: approval.code,
          oldSourceId: approval.sourceId,
          newSourceId: request?.id,
          requestNo: request?.requestNo,
          projectId: request?.projectId,
          canonicalDuplicates: request ? (canonicalByRequestId.get(request.id) || []).map((item) => item.code) : [],
        })),
        repaired,
        softDeletedDuplicates,
        unresolved,
        warnings,
        conclusion: unresolved.length > 0 ? "UNRESOLVED_ORPHANS" : repairCandidates.length === 0 ? "NOOP" : "REPAIR_READY",
      },
      null,
      2,
    ),
  );

    if (unresolved.length > 0) process.exitCode = 1;
  } finally {
    await close();
  }
}

main()
  .catch(() => {
    console.error("QA material approval source repair failed.");
    process.exitCode = 1;
  });
