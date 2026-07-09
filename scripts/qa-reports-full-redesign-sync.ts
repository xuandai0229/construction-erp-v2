import prisma from "../src/lib/prisma";

function expectEqual(actual: unknown, expected: unknown, message: string) {
  if (actual !== expected) {
    throw new Error(`${message}. Expected ${expected}, got ${actual}`);
  }
}

function expectNumber(actual: unknown, message: string) {
  if (typeof actual !== "number" || !Number.isFinite(actual)) {
    throw new Error(`${message}. Expected finite number, got ${String(actual)}`);
  }
}

async function main() {
  console.log("REPORTS_FULL_REDESIGN_SYNC_QA: start");

  await prisma.$transaction(async (tx) => {
    const admin = await tx.user.findFirst({ where: { role: "ADMIN", deletedAt: null } });
    if (!admin) throw new Error("No ADMIN user available for QA transaction");

    const suffix = Date.now();
    const project = await tx.project.create({
      data: {
        code: `QA-RPT-FULL-${suffix}`,
        name: "QA Reports Full Redesign Project",
        location: "QA Site",
        status: "ACTIVE",
      },
    });

    const template = await tx.fieldProgressTemplate.create({
      data: {
        projectId: project.id,
        name: "QA Template",
        status: "ACTIVE",
        createdById: admin.id,
      },
    });

    const item = await tx.fieldProgressItem.create({
      data: {
        projectId: project.id,
        templateId: template.id,
        createdById: admin.id,
        itemType: "WORK",
        code: "QA-WORK-001",
        categoryName: "QA Category",
        workContent: "QA Work Item",
        unit: "m3",
        designQuantity: 180,
      },
    });

    await tx.fieldProgressEntry.create({
      data: {
        projectId: project.id,
        templateId: template.id,
        itemId: item.id,
        entryDate: new Date("2026-07-03T00:00:00.000Z"),
        quantity: 10,
        status: "APPROVED",
        sourceType: "MANUAL",
        createdById: admin.id,
        approvedById: admin.id,
        approvedAt: new Date("2026-07-03T02:00:00.000Z"),
      },
    });

    await tx.fieldProgressEntry.create({
      data: {
        projectId: project.id,
        templateId: template.id,
        itemId: item.id,
        entryDate: new Date("2026-07-04T00:00:00.000Z"),
        quantity: 44,
        status: "SUBMITTED",
        sourceType: "SITE_REPORT",
        sourceId: "qa-report-a",
        sourceReportId: "qa-report-a",
        sourceLineId: "qa-line-a",
        createdById: admin.id,
        submittedAt: new Date("2026-07-04T03:00:00.000Z"),
      },
    });

    await tx.fieldProgressEntry.create({
      data: {
        projectId: project.id,
        templateId: template.id,
        itemId: item.id,
        entryDate: new Date("2026-07-04T00:00:00.000Z"),
        quantity: 6,
        status: "DRAFT",
        sourceType: "MANUAL",
        createdById: admin.id,
      },
    });

    await tx.fieldProgressEntry.create({
      data: {
        projectId: project.id,
        templateId: template.id,
        itemId: item.id,
        entryDate: new Date("2026-07-05T00:00:00.000Z"),
        quantity: 20,
        status: "APPROVED",
        sourceType: "MANUAL",
        createdById: admin.id,
        approvedById: admin.id,
        approvedAt: new Date("2026-07-05T02:00:00.000Z"),
      },
    });

    const { getBulkWorkQuantityBalance } = await import("../src/lib/field-progress/volume-balance");
    const balances = await getBulkWorkQuantityBalance(tx, project.id, [item.id], {
      targetDate: "2026-07-04",
    });
    const balance = balances.get(item.id) as any;
    if (!balance) throw new Error("Missing balance result");

    expectEqual(balance.designQuantity, 180, "Balance contract must expose designQuantity alias");
    expectEqual(balance.plannedQuantity, 180, "plannedQuantity remains compatible");
    expectEqual(balance.cumulativeBeforeDate, 10, "cumulativeBeforeDate");
    expectEqual(balance.todayQuantity, 50, "todayQuantity alias includes submitted + draft on date");
    expectEqual(balance.sameDateEnteredQuantity, 50, "sameDateEnteredQuantity");
    expectEqual(balance.cumulativeAfterDate, 60, "cumulativeAfterDate");
    expectEqual(balance.totalActiveEnteredQuantity, 80, "totalActiveEnteredQuantity all active dates");
    expectEqual(balance.approvedQuantity, 30, "approvedQuantity all active approved dates");
    expectEqual(balance.submittedQuantity, 44, "submittedQuantity");
    expectEqual(balance.draftQuantity, 6, "draftQuantity");
    expectEqual(balance.pendingQuantity, 50, "pendingQuantity draft + submitted");
    expectEqual(balance.remainingQuantity, 100, "overall remaining");
    expectEqual(balance.remainingAtDate, 120, "remaining at target date");
    expectNumber(balance.progressPercent, "progressPercent");
    expectNumber(balance.progressPercentAtDate, "progressPercentAtDate");
    expectEqual(balance.status, "IN_PROGRESS", "balance status");

    const daily1 = await tx.siteReport.create({
      data: {
        projectId: project.id,
        reportDate: new Date("2026-07-04T07:00:00.000Z"),
        createdById: admin.id,
        reporterName: admin.name,
        type: "DAILY",
        status: "APPROVED",
        approvedById: admin.id,
        approvedAt: new Date("2026-07-04T10:00:00.000Z"),
        lines: {
          create: [{
            projectId: project.id,
            fieldProgressItemId: item.id,
            workContent: item.workContent || "QA Work Item",
            workName: item.workContent || "QA Work Item",
            area: item.categoryName,
            unit: item.unit,
            designQuantity: 180,
            quantityBefore: 10,
            quantityToday: 44,
            quantityCumulative: 54,
            progressPercent: 30,
            note: "QA daily line",
          }],
        },
      },
    });

    const daily2 = await tx.siteReport.create({
      data: {
        projectId: project.id,
        reportDate: new Date("2026-07-05T07:00:00.000Z"),
        createdById: admin.id,
        reporterName: admin.name,
        type: "DAILY",
        status: "APPROVED",
        approvedById: admin.id,
        approvedAt: new Date("2026-07-05T10:00:00.000Z"),
        lines: {
          create: [{
            projectId: project.id,
            fieldProgressItemId: item.id,
            workContent: item.workContent || "QA Work Item",
            workName: item.workContent || "QA Work Item",
            area: item.categoryName,
            unit: item.unit,
            designQuantity: 180,
            quantityBefore: 54,
            quantityToday: 20,
            quantityCumulative: 74,
            progressPercent: 41.11,
            note: "QA daily line 2",
          }],
        },
      },
    });

    const { getWeeklyProgressSummaryForProject } = await import("../src/lib/reports/weekly-progress-summary");
    const weekly = await getWeeklyProgressSummaryForProject(tx, {
      projectId: project.id,
      start,
      end,
      includeSubmitted: true,
      includeDraft: true,
    });

    expectEqual(weekly.stats.approvedReports, 2, "weekly approvedReports");
    expectEqual(weekly.stats.workLineCount, 2, "weekly workLineCount");
    expectEqual(weekly.stats.workItemCount, 1, "weekly workItemCount");
    expectEqual(weekly.groups.length, 1, "weekly group count");
    const weeklyItem = weekly.groups[0].items[0];
    expectEqual(weeklyItem.fieldProgressItemId, item.id, "weekly item id");
    expectEqual(weeklyItem.designQuantity, 180, "weekly design quantity");
    expectEqual(weeklyItem.quantityBeforeWeek, 10, "weekly before quantity");
    expectEqual(weeklyItem.quantityInWeek, 64, "weekly in-week quantity");
    expectEqual(weeklyItem.quantityToDate, 74, "weekly to-date quantity");
    expectEqual(weeklyItem.remainingQuantity, 106, "weekly remaining");
    expectNumber(weeklyItem.progressPercent, "weekly progress percent");
    expectEqual(weeklyItem.dates.join(","), "2026-07-04,2026-07-05", "weekly dates");
    expectEqual(weeklyItem.sourceReports.length, 2, "weekly source reports");
    expectEqual(weeklyItem.sourceReports[0].id, daily1.id, "first source report");
    expectEqual(weeklyItem.sourceReports[1].id, daily2.id, "second source report");

    console.log("REPORTS_FULL_REDESIGN_SYNC_QA: all assertions passed inside rollback transaction");
    throw new Error("ROLLBACK_TEST");
  }).catch((error: Error) => {
    if (error.message === "ROLLBACK_TEST") {
      console.log("REPORTS_FULL_REDESIGN_SYNC_QA: rollback complete");
      return;
    }
    throw error;
  });
}

const start = new Date("2026-07-04T00:00:00.000Z");
const end = new Date("2026-07-10T23:59:59.999Z");

main()
  .catch((error) => {
    console.error("REPORTS_FULL_REDESIGN_SYNC_QA: failed");
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
