import "dotenv/config";
import { PrismaClient, UserRole } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  computeReportStats,
  formatReportCreatorName,
} from "../src/lib/reports/report-stats";
import {
  canCreateReport,
  canDeleteReport,
  canPrintReport,
  canSubmitReport,
  canUpdateReport,
  canViewReportHistory,
} from "../src/lib/reports/report-workflow-policy";
import {
  getVietnamIsoWeekInfo,
  getVietnamTodayRange,
} from "../src/lib/reports/report-timezone";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

type CheckResult = {
  code: string;
  ok: boolean;
  evidence: unknown;
};

function assertCheck(results: CheckResult[], code: string, ok: boolean, evidence: unknown) {
  results.push({ code, ok, evidence });
}

function sameNumber(label: string, actual: number, expected: number) {
  return { label, actual, expected, ok: actual === expected };
}

async function main() {
  const results: CheckResult[] = [];

  const reports = await prisma.siteReport.findMany({
    where: {
      deletedAt: null,
      project: {
        deletedAt: null,
      },
    },
    include: {
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
      project: {
        select: {
          id: true,
          name: true,
        },
      },
      attachments: {
        select: {
          id: true,
          kind: true,
          fileName: true,
          publicUrl: true,
          storagePath: true,
        },
      },
      lines: {
        select: {
          issueNote: true,
        },
      },
    },
    orderBy: {
      reportDate: "desc",
    },
  });

  const dbStatusCounts = reports.reduce<Record<string, number>>((acc, report) => {
    acc[report.status] = (acc[report.status] || 0) + 1;
    return acc;
  }, {});

  const stats = computeReportStats(
    reports.map((report) => ({
      status: report.status,
      issues: report.issues,
      lines: report.lines,
    }))
  );

  assertCheck(results, "RPT-P1-001-total", stats.total === reports.length, {
    activeVisibleTotal: reports.length,
    statsTotal: stats.total,
  });

  for (const status of ["DRAFT", "SUBMITTED", "APPROVED", "REJECTED", "REVISION_REQUESTED"]) {
    const actual = stats.byStatus[status] || 0;
    const expected = dbStatusCounts[status] || 0;
    assertCheck(results, `RPT-P1-002-${status}`, actual === expected, sameNumber(status, actual, expected));
  }

  assertCheck(results, "RPT-P1-003-rejected-not-revision", stats.rejected === (dbStatusCounts.REJECTED || 0), {
    rejectedStat: stats.rejected,
    dbRejected: dbStatusCounts.REJECTED || 0,
    dbRevisionRequested: dbStatusCounts.REVISION_REQUESTED || 0,
  });

  const creatorFallbackFailures = reports
    .filter((report) => !report.reporterName && report.createdBy)
    .filter((report) => formatReportCreatorName(report) === "N/A");
  assertCheck(results, "RPT-P1-004-creator-fallback", creatorFallbackFailures.length === 0, {
    checked: reports.filter((report) => !report.reporterName && report.createdBy).length,
    failures: creatorFallbackFailures.map((report) => ({
      reportNo: report.reportNo,
      createdBy: report.createdBy,
    })),
  });

  const duplicateReportNos = Object.entries(
    reports.reduce<Record<string, number>>((acc, report) => {
      acc[report.reportNo] = (acc[report.reportNo] || 0) + 1;
      return acc;
    }, {})
  ).filter(([, count]) => count > 1);
  assertCheck(results, "RPT-P1-005-duplicate-report-no-readonly", true, {
    duplicateReportNos,
    note: "Read-only evidence; migration/cleanup belongs to Phase 2.",
  });

  const noAttachmentCount = reports.filter((report) => report.attachments.length === 0).length;
  assertCheck(results, "RPT-P1-006-attachments-readonly", true, {
    noAttachmentCount,
    withAttachmentCount: reports.length - noAttachmentCount,
    note: "Read-only evidence; missing attachments may be valid until business rule requires photos.",
  });

  const director = { id: "u-director", role: "DIRECTOR" as UserRole };
  const admin = { id: "u-admin", role: "ADMIN" as UserRole };
  const engineer = { id: "u-engineer", role: "ENGINEER" as UserRole };
  const accountant = { id: "u-accountant", role: "ACCOUNTANT" as UserRole };
  const viewer = { id: "u-viewer", role: "VIEWER" as UserRole };
  const submittedReport = {
    id: "r-submitted",
    createdById: "u-engineer",
    status: "SUBMITTED",
    isDeleted: false,
  };
  const draftReport = {
    id: "r-draft",
    createdById: "u-engineer",
    status: "DRAFT",
    isDeleted: false,
  };
  const approvedReport = {
    id: "r-approved",
    createdById: "u-engineer",
    status: "APPROVED",
    isDeleted: false,
  };

  assertCheck(results, "RPT-P1-007-permission-create", !canCreateReport(accountant, true) && !canCreateReport(viewer, true), {
    directorCanCreate: canCreateReport(director, true),
    adminCanCreate: canCreateReport(admin, true),
    engineerCanCreate: canCreateReport(engineer, true),
    accountantCanCreate: canCreateReport(accountant, true),
    viewerCanCreate: canCreateReport(viewer, true),
  });

  assertCheck(results, "RPT-P1-008-permission-project-access", !canPrintReport(submittedReport, engineer, false), {
    directAccessOtherProjectPrint: canPrintReport(submittedReport, engineer, false),
    directAccessOtherProjectHistory: canViewReportHistory(submittedReport, engineer, false),
  });

  assertCheck(results, "RPT-P1-009-permission-status", !canUpdateReport(approvedReport, engineer, true) && !canDeleteReport(approvedReport, director, true), {
    creatorCanUpdateDraft: canUpdateReport(draftReport, engineer, true),
    creatorCanSubmitDraft: canSubmitReport(draftReport, engineer, true),
    creatorCanUpdateApproved: canUpdateReport(approvedReport, engineer, true),
    directorCanDeleteApproved: canDeleteReport(approvedReport, director, true),
  });

  const expectedWeeks = [
    ["2026-06-29", 27, "2026-06-29", "2026-07-05"],
    ["2026-07-01", 27, "2026-06-29", "2026-07-05"],
    ["2026-07-05", 27, "2026-06-29", "2026-07-05"],
    ["2026-07-06", 28, "2026-07-06", "2026-07-12"],
  ] as const;
  const weekEvidence = expectedWeeks.map(([date, weekNumber, weekStartDate, weekEndDate]) => {
    const actual = getVietnamIsoWeekInfo(date);
    return {
      date,
      actual,
      expected: { weekNumber, weekStartDate, weekEndDate },
      ok:
        actual.weekNumber === weekNumber &&
        actual.weekStartDate === weekStartDate &&
        actual.weekEndDate === weekEndDate,
    };
  });
  assertCheck(results, "RPT-P1-010-timezone-week", weekEvidence.every((item) => item.ok), weekEvidence);

  const todayRange = getVietnamTodayRange(new Date("2026-07-03T00:30:00.000Z"));
  assertCheck(results, "RPT-P1-011-timezone-day-range", todayRange.start.toISOString() === "2026-07-02T17:00:00.000Z", {
    inputUtc: "2026-07-03T00:30:00.000Z",
    range: {
      start: todayRange.start.toISOString(),
      end: todayRange.end.toISOString(),
      date: todayRange.date,
    },
  });

  const failed = results.filter((result) => !result.ok);
  console.log(
    JSON.stringify(
      {
        status: failed.length === 0 ? "PASS" : "FAIL",
        activeVisibleTotal: reports.length,
        dbStatusCounts,
        stats,
        checks: results,
      },
      null,
      2
    )
  );

  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
