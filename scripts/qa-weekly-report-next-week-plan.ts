import { PrismaClient, Prisma } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import * as assert from "assert";
import { getWeeklyProgressSummaryForProject } from "../src/lib/reports/weekly-progress-summary";
import { createSiteReportWithAudit } from "../src/lib/reports/report-create-service";
import { parseWeeklyGeneralNote, serializeWeeklyGeneralNote, assertWeeklyResultDateAllowed } from "../src/lib/reports/weekly-report-utils";
import { getBulkWorkQuantityBalance } from "../src/lib/field-progress/volume-balance";
import { updateWeeklyReportCore } from "../src/lib/reports/report-update-service";

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Setting up DB for Weekly Next Week Plan Test...");
  const user = await prisma.user.findFirst({ where: { email: "tayho.admin@seed.local" } });
  if (!user) throw new Error("admin not found");

  const projectCode = `QA-PLAN-${Date.now()}`;
  const project = await prisma.project.create({
    data: {
      code: projectCode,
      name: "QA Next Week Plan Project",
      status: "ACTIVE",
    }
  });

  try {
    const template = await prisma.fieldProgressTemplate.create({
      data: {
        name: "Default QA Template",
        project: { connect: { id: project.id } },
        createdBy: { connect: { id: user.id } },
      }
    });

    const fieldItem = await prisma.fieldProgressItem.create({
      data: {
        project: { connect: { id: project.id } },
        template: { connect: { id: template.id } },
        code: `W-A-${Date.now()}`,
        workContent: "Work A",
        unit: "m3",
        designQuantity: 180,
        itemType: "WORK",
        createdBy: { connect: { id: user.id } },
      }
    });

    // Helper to create approved daily report
    async function createApprovedDaily(date: Date, quantity: number) {
      const report = await createSiteReportWithAudit(prisma, { id: user.id, name: user.name || "", role: "ADMIN" }, {
        projectId: project.id,
        type: "DAILY",
        reportDate: date,
        status: "SUBMITTED",
        lines: {
          create: [{
            projectId: project.id,
            fieldProgressItemId: fieldItem.id,
            workContent: "Work A",
            workName: "Work A",
            quantityToday: quantity,
            designQuantity: 180,
            quantityBefore: 0,
            quantityCumulative: 0,
            progressPercent: 0,
            unit: "m3",
            sortOrder: 0
          }]
        }
      });

      // Approve it so it counts in the summary and updates entries
      const { approveSiteReportTransition } = await import("../src/lib/reports/report-transition-service");
      await approveSiteReportTransition(prisma, report.id, { id: user.id, name: user.name || "", role: "ADMIN" }, "QA Auto Approve");
    }

    // 1. Create actual before week (44)
    console.log("Creating Daily Report Before Week (44)...");
    await createApprovedDaily(new Date("2026-07-01T07:00:00Z"), 44);

    // 2. Create actual in week (50)
    console.log("Creating Daily Report In Week (50)...");
    await createApprovedDaily(new Date("2026-07-06T07:00:00Z"), 50);

    // 3. Test getWeeklyProgressSummaryForProject
    console.log("Generating Weekly Progress Summary...");
    const summary = await getWeeklyProgressSummaryForProject(prisma, {
      projectId: project.id,
      start: new Date("2026-07-06T00:00:00Z"),
      end: new Date("2026-07-12T23:59:59Z"),
      includeSubmitted: true,
      includeDraft: true
    });

    const itemGroup = summary.groups.find((g: any) => g.items.some((i: any) => i.workContent === "Work A"));
    const itemData = itemGroup?.items.find((i: any) => i.workContent === "Work A");
    
    assert.strictEqual(itemData?.quantityBeforeWeek, 44, `Before quantity should be 44, got ${itemData?.quantityBeforeWeek}`);
    assert.strictEqual(itemData?.quantityInWeek, 50, "In Week quantity should be 50");
    assert.strictEqual(itemData?.quantityToDate, 94, "Cumulative should be 94");
    assert.strictEqual(itemData?.remainingQuantity, 86, "Remaining should be 86");

    // 4. Create Weekly Report using actions
    console.log("Creating Weekly Report with Next Week Plan via core service...");
    
    const weeklyNoteObj = {
      version: 2,
      nextWeekPlan: [
        {
          fieldProgressItemId: fieldItem.id,
          workContent: "Work A",
          unit: "m3",
          remainingQuantity: 86,
          plannedQuantityNextWeek: 30, // The plan!
          plannedStartDate: "2026-07-13",
          plannedEndDate: "2026-07-19",
          constructionCrew: "Test Crew",
          materialNeeds: "Xi măng",
          equipmentNeeds: "Cần cẩu",
          riskNote: "Test Risk"
        }
      ]
    };

    const reportData = await createSiteReportWithAudit(prisma, { id: user.id, name: user.name || "", role: "ADMIN" }, {
      projectId: project.id,
      type: "WEEKLY",
      reportDate: new Date("2026-07-12T17:00:00Z"),
      weekStartDate: new Date("2026-07-06T00:00:00Z"),
      weekEndDate: new Date("2026-07-12T23:59:59Z"),
      status: "DRAFT",
      generalNote: serializeWeeklyGeneralNote(weeklyNoteObj as any),
      lines: {
        create: [{
          projectId: project.id,
          fieldProgressItemId: fieldItem.id,
          workContent: "Work A",
          workName: "Work A",
          quantityToday: 50,
          designQuantity: 180,
          quantityBefore: 44,
          quantityCumulative: 94,
          progressPercent: (94 / 180) * 100,
          unit: "m3",
          sortOrder: 0
        }]
      }
    });

    const parsedNote = parseWeeklyGeneralNote(reportData.generalNote);
    assert.strictEqual(parsedNote.version, 2, "Note version should be 2");
    assert.strictEqual(parsedNote.nextWeekPlan?.[0].plannedQuantityNextWeek, 30, "Planned quantity should be 30");

    // 5. Test Edit Weekly Report
    console.log("Testing Edit Weekly Report (using updateWeeklyReportCore)...");
    const updatedNoteObj = { ...weeklyNoteObj };
    updatedNoteObj.nextWeekPlan[0].plannedQuantityNextWeek = 40;

    const actor = { id: user.id, role: "ADMIN" as any, name: user.name || "Admin" };
    
    let updatedReportDb: any = null;
    await prisma.$transaction(async (tx) => {
      updatedReportDb = await updateWeeklyReportCore(tx as any, reportData.id, {
        weekStartDateStr: new Date("2026-07-06T00:00:00Z").toISOString(),
        generalNoteObj: updatedNoteObj,
        workLines: [{
          fieldProgressItemId: fieldItem.id,
          workContent: "Work A",
          workName: "Work A",
          quantityToday: 50,
          designQuantity: 180,
          quantityBefore: 44,
          quantityCumulative: 94,
          progressPercent: (94 / 180) * 100,
          unit: "m3",
        }]
      }, actor);
    });

    const finalReportDb = await prisma.siteReport.findUnique({
      where: { id: reportData.id },
      include: { lines: true }
    });

    if (!finalReportDb) throw new Error("Report not found");

    const parsedUpdatedNote = parseWeeklyGeneralNote(finalReportDb.generalNote);
    assert.strictEqual(parsedUpdatedNote.nextWeekPlan?.[0].plannedQuantityNextWeek, 40, "Updated planned quantity should be 40");
    assert.strictEqual(finalReportDb.lines[0].quantityCumulative?.toNumber(), 94, "quantityCumulative should remain 94 after edit");
    assert.strictEqual(finalReportDb.lines[0].fieldProgressItemId, fieldItem.id, "fieldProgressItemId should be kept");
    assert.strictEqual(finalReportDb.lines[0].designQuantity?.toNumber(), 180, "designQuantity should be 180");
    assert.strictEqual(finalReportDb.lines[0].quantityBefore?.toNumber(), 44, "quantityBefore should be 44");
    assert.strictEqual(finalReportDb.lines[0].quantityToday?.toNumber(), 50, "quantityToday should be 50");
    assert.strictEqual(parsedUpdatedNote.nextWeekPlan?.[0].materialNeeds, "Xi măng", "materialNeeds should remain");
    assert.strictEqual(parsedUpdatedNote.nextWeekPlan?.[0].equipmentNeeds, "Cần cẩu", "equipmentNeeds should remain");

    // 6. Verify Balances
    console.log("Verifying balances are NOT affected by Next Week Plan...");
    const balances = await getBulkWorkQuantityBalance(prisma as any, project.id, [fieldItem.id], { targetDate: "2026-07-12" });
    const balance = balances.get(fieldItem.id);
    assert.strictEqual(balance?.approvedQuantity, 94, "Actual cumulative should remain 94");
    assert.strictEqual(balance?.remainingAtDate, 86, "Actual remaining should remain 86");

    // 7. Check block future report creation/update
    console.log("Testing future weekly report block...");
    const tzOffset = 7 * 60 * 60 * 1000;
    const futureDate = new Date(Date.now() + 14 * 24 * 3600 * 1000 + tzOffset).toISOString(); // 2 weeks in future
    
    let blockedCreate = false;
    try {
      assertWeeklyResultDateAllowed({
        weekStartDateStr: futureDate,
        hasActualLines: true,
      });
    } catch (err: any) {
      if (err.message.includes("Tuần này chưa xảy ra")) blockedCreate = true;
    }
    assert.strictEqual(blockedCreate, true, "Should block creating actual report for future week");

    let allowedPlanOnly = true;
    try {
      assertWeeklyResultDateAllowed({
        weekStartDateStr: futureDate,
        hasActualLines: false, // Plan only
      });
    } catch (err: any) {
      allowedPlanOnly = false;
    }
    assert.strictEqual(allowedPlanOnly, true, "Should allow plan-only future week");

    let blockedUpdate = false;
    try {
      await prisma.$transaction(async (tx) => {
        await updateWeeklyReportCore(tx as any, reportData.id, {
          weekStartDateStr: futureDate,
          workLines: [{ workContent: "Future Actual", quantityToday: 10 }]
        }, actor);
      });
    } catch (err: any) {
      if (err.message.includes("Tuần này chưa xảy ra")) blockedUpdate = true;
    }
    assert.strictEqual(blockedUpdate, true, "Should block updating actual report to future week");

    console.log("✅ Passed all Next Week Plan assertions.");

  } finally {
    // 8. DB Cleanup
    console.log("Cleaning up DB QA data...");
    await prisma.fieldProgressEntry.deleteMany({ where: { projectId: project.id } });
    await prisma.siteReportLine.deleteMany({ where: { projectId: project.id } });
    await prisma.siteReport.deleteMany({ where: { projectId: project.id } });
    await prisma.fieldProgressItem.deleteMany({ where: { projectId: project.id } });
    await prisma.fieldProgressTemplate.deleteMany({ where: { projectId: project.id } });
    await prisma.auditLog.deleteMany({ where: { projectId: project.id } });
    await prisma.project.delete({ where: { id: project.id } });
    console.log("✅ Cleanup successful.");
  }
}

main().catch(e => {
  console.error("❌ QA Test Failed:", e);
  process.exit(1);
}).finally(() => prisma.$disconnect());
