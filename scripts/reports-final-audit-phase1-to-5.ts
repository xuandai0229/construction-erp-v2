import { existsSync, readdirSync, statSync } from "fs";
import path from "path";
import prisma from "../src/lib/prisma";

function walkFiles(directory: string): string[] {
  if (!existsSync(directory)) return [];

  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    return entry.isDirectory() ? walkFiles(fullPath) : [fullPath];
  });
}

function normalizeForComparison(filePath: string): string {
  return path.resolve(filePath).toLowerCase();
}

async function main() {
  const storageRoot = path.join(process.cwd(), "storage", "site-reports");

  const [
    reports,
    statusGroups,
    attachments,
    attachmentKindGroups,
    reportAuditLogCount,
    duplicateReportNos,
    duplicateWeeklyPeriods,
    weeklyWithoutLines,
    hardOrphanAttachments,
    reportsFoundationMigration,
    reportIndexes,
    weeklyUniqueIndexes,
  ] = await Promise.all([
    prisma.siteReport.findMany({
      select: {
        id: true,
        reportNo: true,
        title: true,
        type: true,
        status: true,
        projectId: true,
        reportDate: true,
        weekStartDate: true,
        weekEndDate: true,
        deletedAt: true,
        _count: { select: { lines: true, attachments: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.siteReport.groupBy({
      by: ["status"],
      _count: true,
    }),
    prisma.siteReportAttachment.findMany({
      include: {
        report: {
          select: {
            id: true,
            deletedAt: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.siteReportAttachment.groupBy({
      by: ["kind"],
      _count: true,
    }),
    prisma.auditLog.count({
      where: { entityType: "SiteReport" },
    }),
    prisma.$queryRaw<Array<{ reportNo: string; count: bigint }>>`
      SELECT "reportNo", COUNT(*) AS count
      FROM "SiteReport"
      GROUP BY "reportNo"
      HAVING COUNT(*) > 1
      ORDER BY COUNT(*) DESC, "reportNo" ASC
    `,
    prisma.$queryRaw<
      Array<{
        projectId: string;
        weekStartDate: Date;
        weekEndDate: Date;
        count: bigint;
      }>
    >`
      SELECT "projectId", "weekStartDate", "weekEndDate", COUNT(*) AS count
      FROM "SiteReport"
      WHERE "type" = 'WEEKLY'
        AND "deletedAt" IS NULL
      GROUP BY "projectId", "weekStartDate", "weekEndDate"
      HAVING COUNT(*) > 1
      ORDER BY COUNT(*) DESC
    `,
    prisma.siteReport.count({
      where: {
        type: "WEEKLY",
        deletedAt: null,
        lines: { none: {} },
      },
    }),
    prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) AS count
      FROM "SiteReportAttachment" attachment
      LEFT JOIN "SiteReport" report ON report.id = attachment."reportId"
      WHERE report.id IS NULL
    `,
    prisma.$queryRaw<
      Array<{
        migration_name: string;
        finished_at: Date | null;
        rolled_back_at: Date | null;
      }>
    >`
      SELECT migration_name, finished_at, rolled_back_at
      FROM "_prisma_migrations"
      WHERE migration_name = '20260622025729_add_site_reports_foundation'
    `,
    prisma.$queryRaw<Array<{ indexname: string; indexdef: string }>>`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND tablename = 'SiteReport'
        AND indexdef ILIKE '%reportNo%'
      ORDER BY indexname
    `,
    prisma.$queryRaw<Array<{ indexname: string; indexdef: string }>>`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND tablename = 'SiteReport'
        AND indexdef ILIKE '%projectId%'
        AND indexdef ILIKE '%weekStartDate%'
        AND indexdef ILIKE '%weekEndDate%'
      ORDER BY indexname
    `,
  ]);

  const totalByType = {
    DAILY: reports.filter((report) => report.type === "DAILY").length,
    WEEKLY: reports.filter((report) => report.type === "WEEKLY").length,
  };

  const statusCounts = Object.fromEntries(
    statusGroups.map((group) => [group.status, group._count]),
  );

  const kindCounts = Object.fromEntries(
    attachmentKindGroups.map((group) => [group.kind, group._count]),
  );

  const emptyReportNos = reports.filter(
    (report) => !report.reportNo || report.reportNo.trim() === "",
  );

  const absolutePathAttachments = attachments.filter((attachment) =>
    path.isAbsolute(attachment.storagePath),
  );
  const traversalPathAttachments = attachments.filter((attachment) =>
    attachment.storagePath.split(/[\\/]+/).includes(".."),
  );
  const missingAttachmentFiles = attachments.filter((attachment) => {
    const resolvedPath = path.isAbsolute(attachment.storagePath)
      ? attachment.storagePath
      : path.join(process.cwd(), attachment.storagePath);
    return !existsSync(resolvedPath);
  });
  const sizeMismatchAttachments = attachments.filter((attachment) => {
    const resolvedPath = path.isAbsolute(attachment.storagePath)
      ? attachment.storagePath
      : path.join(process.cwd(), attachment.storagePath);
    return (
      existsSync(resolvedPath) &&
      statSync(resolvedPath).size !== attachment.sizeBytes
    );
  });
  const softDeletedReportAttachments = attachments.filter(
    (attachment) => attachment.report.deletedAt !== null,
  );

  const dbAttachmentPaths = new Set(
    attachments.map((attachment) =>
      normalizeForComparison(
        path.isAbsolute(attachment.storagePath)
          ? attachment.storagePath
          : path.join(process.cwd(), attachment.storagePath),
      ),
    ),
  );
  const diskFiles = walkFiles(storageRoot);
  const diskFilesWithoutDbRecord = diskFiles.filter(
    (filePath) => !dbAttachmentPaths.has(normalizeForComparison(filePath)),
  );

  const phase1TestReports = reports.filter(
    (report) =>
      report.title?.includes("TEST-REPORT") ||
      report.reportNo.includes("TEST-REPORT"),
  );
  const phase21TestReports = await prisma.siteReport.count({
    where: {
      lines: {
        some: {
          workContent: { contains: "UAT Phase 2.1" },
        },
      },
    },
  });

  const weeklyReports = reports.filter(
    (report) =>
      report.type === "WEEKLY" &&
      report.deletedAt === null &&
      report.weekStartDate &&
      report.weekEndDate,
  );

  let approvedDailyInWeeklyWindows = 0;
  let approvedDailyWithNoLinesInWeeklyWindows = 0;
  const weeklyCoverage: Array<{
    weeklyReportId: string;
    approvedDailyCount: number;
    approvedDailyLineCount: number;
    weeklyLineCount: number;
  }> = [];

  for (const weekly of weeklyReports) {
    const approvedDaily = await prisma.siteReport.findMany({
      where: {
        projectId: weekly.projectId,
        type: "DAILY",
        status: "APPROVED",
        deletedAt: null,
        reportDate: {
          gte: weekly.weekStartDate!,
          lte: weekly.weekEndDate!,
        },
      },
      select: {
        id: true,
        _count: { select: { lines: true } },
      },
    });

    approvedDailyInWeeklyWindows += approvedDaily.length;
    approvedDailyWithNoLinesInWeeklyWindows += approvedDaily.filter(
      (daily) => daily._count.lines === 0,
    ).length;
    weeklyCoverage.push({
      weeklyReportId: weekly.id,
      approvedDailyCount: approvedDaily.length,
      approvedDailyLineCount: approvedDaily.reduce(
        (sum, daily) => sum + daily._count.lines,
        0,
      ),
      weeklyLineCount: weekly._count.lines,
    });
  }

  const result = {
    generatedAt: new Date().toISOString(),
    readOnly: true,
    reports: {
      total: reports.length,
      byType: totalByType,
      byStatus: statusCounts,
      emptyOrNullReportNo: emptyReportNos.length,
      duplicateReportNoGroups: duplicateReportNos.map((row) => ({
        reportNo: row.reportNo,
        count: Number(row.count),
      })),
      phase1TestReportCount: phase1TestReports.length,
      phase1TestReportIds: phase1TestReports.map((report) => report.id),
      phase21TestReportCount: phase21TestReports,
    },
    attachments: {
      total: attachments.length,
      photos: kindCounts.PHOTO ?? 0,
      files: kindCounts.FILE ?? 0,
      absoluteStoragePaths: absolutePathAttachments.length,
      traversalStoragePaths: traversalPathAttachments.length,
      missingFilesOnDisk: missingAttachmentFiles.length,
      sizeMismatchFiles: sizeMismatchAttachments.length,
      hardOrphans: Number(hardOrphanAttachments[0]?.count ?? 0),
      attachedToSoftDeletedReports: softDeletedReportAttachments.length,
      diskFilesUnderSiteReports: diskFiles.length,
      diskFilesWithoutDbRecord: diskFilesWithoutDbRecord.length,
      diskFilesWithoutDbRecordPaths: diskFilesWithoutDbRecord.map((filePath) =>
        path.relative(process.cwd(), filePath),
      ),
    },
    auditLogs: {
      siteReportEntityCount: reportAuditLogCount,
    },
    databaseSchemaEvidence: {
      reportsFoundationMigration: reportsFoundationMigration.map((migration) => ({
        ...migration,
        applied:
          migration.finished_at !== null && migration.rolled_back_at === null,
      })),
      reportNoIndexes: reportIndexes,
      reportNoHasUniqueIndex: reportIndexes.some((index) =>
        index.indexdef.toUpperCase().includes("UNIQUE"),
      ),
      weeklyProjectPeriodUniqueIndexes: weeklyUniqueIndexes,
    },
    weeklyIntegrity: {
      duplicateProjectWeekGroups: duplicateWeeklyPeriods.map((row) => ({
        projectId: row.projectId,
        weekStartDate: row.weekStartDate,
        weekEndDate: row.weekEndDate,
        count: Number(row.count),
      })),
      weeklyReportsWithoutLines: weeklyWithoutLines,
      weeklyReportsWithUsableDateRange: weeklyReports.length,
      approvedDailyReportsInWeeklyWindows: approvedDailyInWeeklyWindows,
      approvedDailyReportsWithNoLinesInWeeklyWindows:
        approvedDailyWithNoLinesInWeeklyWindows,
      coverage: weeklyCoverage,
      note:
        "Coverage is structural only because the schema has no source-report linkage from weekly lines to daily reports.",
    },
  };

  console.log(JSON.stringify(result, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
