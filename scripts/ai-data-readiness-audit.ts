import dotenv from "dotenv";

dotenv.config({ path: ".env.local", quiet: true });
dotenv.config({ path: ".env", quiet: true, override: false });

type MatrixRow = {
  domain: string;
  records: number;
  freshness: string;
  completeness: string;
  aiUsable: boolean;
  reason: string;
};

function freshness(value: Date | null | undefined, asOf: Date): string {
  if (!value) return "NO_DATA";
  const days = Math.max(0, Math.floor((asOf.getTime() - value.getTime()) / 86_400_000));
  return `${days}d (${value.toISOString()})`;
}

async function main() {
  const { default: prisma } = await import("../src/lib/prisma");
  const asOf = new Date();
  const [
    projects,
    wbs,
    wbsFresh,
    progressItems,
    progressDesigned,
    progressEntries,
    progressApproved,
    progressFresh,
    reports,
    reportsWithNarrative,
    reportLines,
    reportFresh,
    materialCatalog,
    materialStocks,
    materialMovements,
    materialFresh,
    approvals,
    pendingApprovals,
    approvalFresh,
    documents,
    documentFresh,
    findings,
    openFindings,
    safetyPlans,
    safetyAssessments,
  ] = await Promise.all([
    prisma.project.count({ where: { deletedAt: null } }),
    prisma.wBSItem.count({ where: { deletedAt: null } }),
    prisma.wBSItem.aggregate({ where: { deletedAt: null }, _max: { updatedAt: true } }),
    prisma.fieldProgressItem.count({ where: { itemType: "WORK", deletedAt: null } }),
    prisma.fieldProgressItem.count({ where: { itemType: "WORK", deletedAt: null, designQuantity: { not: null } } }),
    prisma.fieldProgressEntry.count({ where: { deletedAt: null } }),
    prisma.fieldProgressEntry.count({ where: { deletedAt: null, status: "APPROVED" } }),
    prisma.fieldProgressEntry.aggregate({ where: { deletedAt: null, status: "APPROVED" }, _max: { approvedAt: true } }),
    prisma.siteReport.count({ where: { deletedAt: null } }),
    prisma.siteReport.count({
      where: {
        deletedAt: null,
        OR: [
          { summary: { not: null } },
          { issues: { not: null } },
          { recommendations: { not: null } },
          { quality: { not: null } },
        ],
      },
    }),
    prisma.siteReportLine.count({ where: { deletedAt: null } }),
    prisma.siteReport.aggregate({ where: { deletedAt: null }, _max: { updatedAt: true } }),
    prisma.materialItem.count({ where: { isActive: true } }),
    prisma.projectMaterialStock.count(),
    prisma.materialMovement.count(),
    prisma.projectMaterialStock.aggregate({ _max: { lastUpdated: true } }),
    prisma.approvalRequest.count({ where: { deletedAt: null } }),
    prisma.approvalRequest.count({ where: { deletedAt: null, status: "PENDING" } }),
    prisma.approvalRequest.aggregate({ where: { deletedAt: null }, _max: { updatedAt: true } }),
    prisma.document.count({ where: { deletedAt: null } }),
    prisma.document.aggregate({ where: { deletedAt: null }, _max: { updatedAt: true } }),
    prisma.supervisionFinding.count(),
    prisma.supervisionFinding.count({ where: { status: "OPEN" } }),
    prisma.safetyReportPlan.count({ where: { deletedAt: null } }),
    prisma.safetySelfAssessmentReport.count({ where: { deletedAt: null } }),
  ]);

  const rows: MatrixRow[] = [
    {
      domain: "Projects",
      records: projects,
      freshness: "See per-project updatedAt",
      completeness: `${projects} active/non-deleted records`,
      aiUsable: projects > 0,
      reason: projects > 0 ? "Usable for identity, status and schedule dates." : "No project records.",
    },
    {
      domain: "WBS",
      records: wbs,
      freshness: freshness(wbsFresh._max.updatedAt, asOf),
      completeness: wbs > 0 ? "WBS records exist; actual progress uses FieldProgress instead." : "0 records",
      aiUsable: wbs > 0,
      reason: wbs > 0 ? "Usable only for supported WBS signals after a dedicated tool exists." : "No WBS evidence.",
    },
    {
      domain: "Progress",
      records: progressEntries,
      freshness: freshness(progressFresh._max.approvedAt, asOf),
      completeness: `${progressItems} work items; ${progressDesigned} with design quantity; ${progressApproved}/${progressEntries} entries approved`,
      aiUsable: progressItems > 0 && progressDesigned === progressItems && progressApproved > 0,
      reason: progressItems > 0 && progressDesigned === progressItems && progressApproved > 0
        ? "Approved actual/design aggregate can be computed."
        : "Insufficient approved/design data for a trustworthy actual-progress percentage.",
    },
    {
      domain: "SiteReport",
      records: reports,
      freshness: freshness(reportFresh._max.updatedAt, asOf),
      completeness: `${reportsWithNarrative}/${reports} with narrative; ${reportLines} report lines`,
      aiUsable: reports > 0 && (reportsWithNarrative > 0 || reportLines > 0),
      reason: reports > 0 ? "Usable only where narrative or lines are present." : "No field reports.",
    },
    {
      domain: "Material stock/movement",
      records: materialStocks + materialMovements,
      freshness: freshness(materialFresh._max.lastUpdated, asOf),
      completeness: `${materialCatalog} catalog items; ${materialStocks} stock rows; ${materialMovements} movements`,
      aiUsable: materialStocks > 0,
      reason: materialStocks > 0 ? "Project stock is queryable; movement history may still be partial." : "Catalog is not accepted as stock evidence.",
    },
    {
      domain: "Approvals",
      records: approvals,
      freshness: freshness(approvalFresh._max.updatedAt, asOf),
      completeness: `${pendingApprovals} pending of ${approvals}`,
      aiUsable: approvals > 0,
      reason: approvals > 0 ? "ApprovalRequest workflow is usable; does not cover every work queue." : "No approval records.",
    },
    {
      domain: "Documents/contracts",
      records: documents,
      freshness: freshness(documentFresh._max.updatedAt, asOf),
      completeness: `${documents} document metadata records; content extraction not in AI-01`,
      aiUsable: false,
      reason: "RAG/document content is explicitly out of scope.",
    },
    {
      domain: "Issues/quality",
      records: findings + reportLines,
      freshness: freshness(reportFresh._max.updatedAt, asOf),
      completeness: `${openFindings} open supervision findings; quality/issue text may exist on reports/lines`,
      aiUsable: reportsWithNarrative > 0 || reportLines > 0,
      reason: reportsWithNarrative > 0 || reportLines > 0
        ? "Only report-grounded issue/quality text is exposed by current tools."
        : "No exposed report content for issue/quality briefing.",
    },
    {
      domain: "Safety",
      records: safetyPlans + safetyAssessments,
      freshness: "Not queried by current 5-tool allowlist",
      completeness: `${safetyPlans} plans; ${safetyAssessments} self-assessments`,
      aiUsable: false,
      reason: "Safety models exist but no AI-01 read tool exposes them; assistant must refuse conclusions.",
    },
  ];

  process.stdout.write(JSON.stringify({ asOf: asOf.toISOString(), rows }, null, 2));
  await prisma.$disconnect();
}

main().catch((error) => {
  process.stderr.write(`AI data-readiness audit failed: ${error instanceof Error ? error.message : "unknown error"}\n`);
  process.exitCode = 1;
});
