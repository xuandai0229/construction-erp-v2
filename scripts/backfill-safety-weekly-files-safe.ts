import prisma from "@/lib/prisma";
import { getWeekNumber, getWeekRange } from "@/lib/safety-reporting/date-utils";

export interface BackfillReport {
  totalPlans: number;
  totalAssessments: number;
  certainlyMatched: number;
  orphanPlans: number;
  orphanAssessments: number;
  ambiguousGroups: number;
}

export async function runSafeBackfill(dryRun = true): Promise<BackfillReport> {
  console.log(`[BACKFILL] Starting safe backfill (dryRun: ${dryRun})...`);

  const plans = await prisma.safetyReportPlan.findMany({
    where: { deletedAt: null, status: { not: "CANCELLED" } },
    select: { id: true, periodStart: true, periodEnd: true, createdById: true, officialDocumentNumber: true },
  });

  const reports = await prisma.safetySelfAssessmentReport.findMany({
    where: { deletedAt: null, status: { not: "CANCELLED" } },
    select: { id: true, sourcePlanId: true, periodStart: true, periodEnd: true, createdById: true, officialDocumentNumber: true },
  });

  const report: BackfillReport = {
    totalPlans: plans.length,
    totalAssessments: reports.length,
    certainlyMatched: 0,
    orphanPlans: 0,
    orphanAssessments: 0,
    ambiguousGroups: 0,
  };

  const processedPlanIds = new Set<string>();
  const processedReportIds = new Set<string>();

  // Step 1: Match by explicit sourcePlanId
  for (const rep of reports) {
    if (rep.sourcePlanId) {
      const plan = plans.find((p) => p.id === rep.sourcePlanId);
      if (plan) {
        report.certainlyMatched++;
        processedPlanIds.add(plan.id);
        processedReportIds.add(rep.id);

        if (!dryRun) {
          await prisma.$transaction(async (tx) => {
            const { weekStart, weekEnd } = getWeekRange(plan.periodStart.toISOString());
            const weekInfo = getWeekNumber(weekStart);
            const fileCode = `HS-ATLĐ-${weekInfo.year}-W${String(weekInfo.week).padStart(2, "0")}`;

            let wf = await tx.safetyWeeklyFile.findFirst({
              where: { periodStart: weekStart, deletedAt: null },
            });

            if (!wf) {
              wf = await tx.safetyWeeklyFile.create({
                data: {
                  fileCode,
                  periodStart: weekStart,
                  periodEnd: weekEnd,
                  createdById: plan.createdById,
                  officialDocumentNumber: plan.officialDocumentNumber || rep.officialDocumentNumber,
                },
              });
            }

            await tx.safetyReportPlan.update({
              where: { id: plan.id },
              data: { weeklyFileId: wf.id },
            });

            await tx.safetySelfAssessmentReport.update({
              where: { id: rep.id },
              data: { weeklyFileId: wf.id, sourcePlanId: plan.id },
            });
          });
        }
      }
    }
  }

  // Step 2: For remaining unlinked plans & reports, group by periodStart
  const unlinkedPlans = plans.filter((p) => !processedPlanIds.has(p.id));
  const unlinkedReports = reports.filter((r) => !processedReportIds.has(r.id));

  const periodMap = new Map<string, { plans: typeof unlinkedPlans; reports: typeof unlinkedReports }>();

  for (const p of unlinkedPlans) {
    const key = p.periodStart.toISOString().split("T")[0];
    if (!periodMap.has(key)) periodMap.set(key, { plans: [], reports: [] });
    periodMap.get(key)!.plans.push(p);
  }

  for (const r of unlinkedReports) {
    const key = r.periodStart.toISOString().split("T")[0];
    if (!periodMap.has(key)) periodMap.set(key, { plans: [], reports: [] });
    periodMap.get(key)!.reports.push(r);
  }

  for (const [periodKey, group] of periodMap.entries()) {
    if (group.plans.length === 1 && group.reports.length === 1) {
      // Exactly 1 plan and 1 report in this week -> Safe auto-match!
      const plan = group.plans[0];
      const rep = group.reports[0];
      report.certainlyMatched++;
      processedPlanIds.add(plan.id);
      processedReportIds.add(rep.id);

      if (!dryRun) {
        await prisma.$transaction(async (tx) => {
          const { weekStart, weekEnd } = getWeekRange(plan.periodStart.toISOString());
          const weekInfo = getWeekNumber(weekStart);
          const fileCode = `HS-ATLĐ-${weekInfo.year}-W${String(weekInfo.week).padStart(2, "0")}`;

          let wf = await tx.safetyWeeklyFile.findFirst({
            where: { periodStart: weekStart, deletedAt: null },
          });

          if (!wf) {
            wf = await tx.safetyWeeklyFile.create({
              data: {
                fileCode,
                periodStart: weekStart,
                periodEnd: weekEnd,
                createdById: plan.createdById,
              },
            });
          }

          await tx.safetyReportPlan.update({ where: { id: plan.id }, data: { weeklyFileId: wf.id } });
          await tx.safetySelfAssessmentReport.update({ where: { id: rep.id }, data: { weeklyFileId: wf.id, sourcePlanId: plan.id } });
        });
      }
    } else if (group.plans.length > 1 || group.reports.length > 1) {
      console.warn(`[BACKFILL] Ambiguous group for period ${periodKey}: ${group.plans.length} plans, ${group.reports.length} reports. Marked AMBIGUOUS.`);
      report.ambiguousGroups++;
    } else if (group.plans.length === 1 && group.reports.length === 0) {
      report.orphanPlans++;
      const plan = group.plans[0];
      if (!dryRun) {
        await prisma.$transaction(async (tx) => {
          const { weekStart, weekEnd } = getWeekRange(plan.periodStart.toISOString());
          const weekInfo = getWeekNumber(weekStart);
          const fileCode = `HS-ATLĐ-${weekInfo.year}-W${String(weekInfo.week).padStart(2, "0")}`;
          let wf = await tx.safetyWeeklyFile.findFirst({ where: { periodStart: weekStart, deletedAt: null } });
          if (!wf) {
            wf = await tx.safetyWeeklyFile.create({
              data: { fileCode, periodStart: weekStart, periodEnd: weekEnd, createdById: plan.createdById },
            });
          }
          await tx.safetyReportPlan.update({ where: { id: plan.id }, data: { weeklyFileId: wf.id } });
        });
      }
    } else if (group.plans.length === 0 && group.reports.length === 1) {
      report.orphanAssessments++;
      const rep = group.reports[0];
      if (!dryRun) {
        await prisma.$transaction(async (tx) => {
          const { weekStart, weekEnd } = getWeekRange(rep.periodStart.toISOString());
          const weekInfo = getWeekNumber(weekStart);
          const fileCode = `HS-ATLĐ-${weekInfo.year}-W${String(weekInfo.week).padStart(2, "0")}`;
          let wf = await tx.safetyWeeklyFile.findFirst({ where: { periodStart: weekStart, deletedAt: null } });
          if (!wf) {
            wf = await tx.safetyWeeklyFile.create({
              data: { fileCode, periodStart: weekStart, periodEnd: weekEnd, createdById: rep.createdById },
            });
          }
          await tx.safetySelfAssessmentReport.update({ where: { id: rep.id }, data: { weeklyFileId: wf.id } });
        });
      }
    }
  }

  console.log("[BACKFILL] Summary report:", JSON.stringify(report, null, 2));
  return report;
}
