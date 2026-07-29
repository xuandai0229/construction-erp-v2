/**
 * Read-only evidence collector for Dashboard actual-progress parity.
 * It is pinned to QA_DATABASE_URL and fails before querying if that target is
 * not a distinct, locally verified QA database.
 */
import "dotenv/config";
import { assertSafeQaDatabase } from "./assert-safe-qa-database";
import { createSafeQaPrismaClient, verifyQaPrismaFingerprint } from "./create-safe-qa-prisma-client";
import { calculateProjectActualProgress, deriveCompletenessCategory } from "@/lib/dashboard/project-progress-aggregate";
import { calculatePlannedProgress } from "@/lib/dashboard/progress-utils";
import { getWorkDateRange, todayWorkDate } from "@/lib/date/work-date";

type EvidenceRow = {
  projectCode: string;
  projectName: string;
  activeTemplateCount: number;
  validDesignQuantity: number | null;
  approvedActualQuantity: number | null;
  entryCounts: Record<string, number>;
  plannedProgressPercent: number | null;
  actualProgressPercent: number | null;
  actualProgressDataStatus: string;
  completenessCategory: string;
  lastActualProgressAt: string | null;
};

async function main() {
  const safeTarget = assertSafeQaDatabase();
  const qaDatabaseUrl = process.env.QA_DATABASE_URL;
  if (!qaDatabaseUrl) throw new Error("QA_DATABASE_URL is required");

  const { prisma, close } = createSafeQaPrismaClient(qaDatabaseUrl);
  try {
    await verifyQaPrismaFingerprint(prisma, safeTarget.qaDatabase);
    const projects = await prisma.project.findMany({
      where: { deletedAt: null },
      select: { id: true, code: true, name: true, startDate: true, endDate: true },
      orderBy: { updatedAt: "desc" },
    });
    const projectIds = projects.map((project) => project.id);
    const asOf = new Date(getWorkDateRange(todayWorkDate()).end.getTime() - 1);
    const [templates, items, entries] = await Promise.all([
      prisma.fieldProgressTemplate.findMany({ where: { projectId: { in: projectIds }, deletedAt: null }, select: { id: true, projectId: true } }),
      prisma.fieldProgressItem.findMany({
        where: { projectId: { in: projectIds }, deletedAt: null, itemType: "WORK", template: { deletedAt: null } },
        select: { id: true, projectId: true, itemType: true, designQuantity: true, deletedAt: true },
      }),
      prisma.fieldProgressEntry.findMany({
        where: { projectId: { in: projectIds }, deletedAt: null, entryDate: { lte: asOf }, template: { deletedAt: null } },
        select: { id: true, projectId: true, itemId: true, quantity: true, status: true, entryDate: true, approvedAt: true, deletedAt: true },
      }),
    ]);

    const byProject = <T extends { projectId: string }>(records: T[]) => {
      const result = new Map<string, T[]>();
      for (const record of records) result.set(record.projectId, [...(result.get(record.projectId) ?? []), record]);
      return result;
    };
    const templatesByProject = byProject(templates);
    const itemsByProject = byProject(items);
    const entriesByProject = byProject(entries);
    const today = getWorkDateRange(todayWorkDate()).start;

    const rows: EvidenceRow[] = projects.map((project) => {
      const projectEntries = entriesByProject.get(project.id) ?? [];
      const aggregate = calculateProjectActualProgress({
        projectId: project.id,
        asOf,
        items: itemsByProject.get(project.id) ?? [],
        entries: projectEntries,
      });
      const hasMultipleTemplates = (templatesByProject.get(project.id)?.length ?? 0) > 1;
      const actualProgressPercent = hasMultipleTemplates ? null : aggregate.actualProgressPercent;
      const plannedProgressPercent = calculatePlannedProgress(project.startDate, project.endDate, today);
      const entryCounts = projectEntries.reduce<Record<string, number>>((counts, entry) => {
        counts[entry.status] = (counts[entry.status] ?? 0) + 1;
        return counts;
      }, {});

      return {
        projectCode: project.code,
        projectName: project.name,
        activeTemplateCount: templatesByProject.get(project.id)?.length ?? 0,
        validDesignQuantity: hasMultipleTemplates ? null : aggregate.totalDesignQuantity,
        approvedActualQuantity: hasMultipleTemplates ? null : aggregate.approvedActualQuantity,
        entryCounts,
        plannedProgressPercent,
        actualProgressPercent,
        actualProgressDataStatus: hasMultipleTemplates ? "MULTIPLE_ACTIVE_TEMPLATES" : aggregate.actualProgressDataStatus,
        completenessCategory: deriveCompletenessCategory(plannedProgressPercent, actualProgressPercent),
        lastActualProgressAt: hasMultipleTemplates || !aggregate.lastActualProgressAt ? null : aggregate.lastActualProgressAt.toISOString(),
      };
    });

    const selected = [
      rows.find((row) => row.plannedProgressPercent !== null && row.actualProgressDataStatus === "AVAILABLE"),
      rows.find((row) => row.plannedProgressPercent !== null && row.actualProgressDataStatus === "NO_APPROVED_ENTRIES"),
      rows.find((row) => row.plannedProgressPercent === null && row.actualProgressPercent === null),
    ].filter((row): row is EvidenceRow => Boolean(row));

    console.log(JSON.stringify({
      safety: { database: safeTarget.database, host: safeTarget.host, port: safeTarget.port },
      projectCount: rows.length,
      selectedProjectCount: selected.length,
      selected,
      rows,
      availability: {
        plannedAndApproved: rows.filter((row) => row.plannedProgressPercent !== null && row.actualProgressDataStatus === "AVAILABLE").length,
        plannedWithoutApproved: rows.filter((row) => row.plannedProgressPercent !== null && row.actualProgressDataStatus === "NO_APPROVED_ENTRIES").length,
        missingBoth: rows.filter((row) => row.plannedProgressPercent === null && row.actualProgressPercent === null).length,
      },
    }, null, 2));
  } finally {
    await close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
