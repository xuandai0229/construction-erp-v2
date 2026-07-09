import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";
import { getWeeklyProgressSummaryForProject } from "../src/lib/reports/weekly-progress-summary";
import { createSiteReport } from "../src/app/(dashboard)/reports/actions";
import assert from "assert";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  let projectId: string | undefined;

  try {
    console.log("Creating QA Project...");
    const project = await prisma.project.create({
      data: {
        code: "QA-WEEKLY-" + Date.now(),
        name: "QA Weekly Report",
        status: "ACTIVE",
      }
    });
    projectId = project.id;

    // Create user if not exist
    const user = await prisma.user.findFirst({ where: { email: "tayho.admin@seed.local" } });
    if (!user) throw new Error("Need user tayho.admin@seed.local");

    // Create FieldProgressTemplate
    const template = await prisma.fieldProgressTemplate.create({
      data: {
        projectId,
        name: "QA Template",
        createdById: user.id,
      }
    });

    const item = await prisma.fieldProgressItem.create({
      data: {
        projectId,
        templateId: template.id,
        workContent: "Test Design 180",
        designQuantity: 180,
        unit: "m3",
        createdById: user.id,
      }
    });

    const beforeWeekDate = new Date("2026-07-01T12:00:00Z");
    const weekStartDate = new Date("2026-07-06T00:00:00Z");
    const weekDay1 = new Date("2026-07-06T12:00:00Z");
    const weekDay3 = new Date("2026-07-08T12:00:00Z");
    const weekDay4 = new Date("2026-07-09T12:00:00Z");
    const weekEndDate = new Date("2026-07-12T23:59:59Z");

    // 1. Before Week Daily Report (Approved): 44
    await prisma.siteReport.create({
      data: {
        projectId,
        type: "DAILY",
        reportDate: beforeWeekDate,
        status: "APPROVED",
        createdById: user.id,
        lines: {
          create: [{
            projectId,
            fieldProgressItemId: item.id,
            workContent: item.workContent!,
            quantityToday: 44,
            designQuantity: 180,
            quantityBefore: 0,
            quantityCumulative: 44,
          }]
        }
      }
    });

    // 2. In Week Daily Report (Approved): Day 1 -> 20
    await prisma.siteReport.create({
      data: {
        projectId,
        type: "DAILY",
        reportDate: weekDay1,
        status: "APPROVED",
        createdById: user.id,
        lines: {
          create: [{
            projectId,
            fieldProgressItemId: item.id,
            workContent: item.workContent!,
            quantityToday: 20,
            designQuantity: 180,
            quantityBefore: 44,
            quantityCumulative: 64,
          }]
        }
      }
    });

    // 3. In Week Daily Report (Approved): Day 3 -> 30
    await prisma.siteReport.create({
      data: {
        projectId,
        type: "DAILY",
        reportDate: weekDay3,
        status: "APPROVED",
        createdById: user.id,
        lines: {
          create: [{
            projectId,
            fieldProgressItemId: item.id,
            workContent: item.workContent!,
            quantityToday: 30,
            designQuantity: 180,
            quantityBefore: 64,
            quantityCumulative: 94,
          }]
        }
      }
    });

    // 4. In Week Daily Report (Rejected): Day 4 -> 10
    await prisma.siteReport.create({
      data: {
        projectId,
        type: "DAILY",
        reportDate: weekDay4,
        status: "REJECTED",
        createdById: user.id,
        lines: {
          create: [{
            projectId,
            fieldProgressItemId: item.id,
            workContent: item.workContent!,
            quantityToday: 10,
            designQuantity: 180,
            quantityBefore: 94,
            quantityCumulative: 104,
          }]
        }
      }
    });

    console.log("Running getWeeklyProgressSummaryForProject...");
    const summary = await getWeeklyProgressSummaryForProject(prisma, {
      projectId,
      start: weekStartDate,
      end: weekEndDate,
    });

    assert(summary.groups.length > 0, "Summary groups should not be empty");
    const summaryItem = summary.groups[0].items[0];
    
    console.log("Summary Item:", summaryItem);

    assert.strictEqual(summaryItem.designQuantity, 180, "Design quantity should be 180");
    assert.strictEqual(summaryItem.quantityBeforeWeek, 44, "Quantity before week should be 44");
    assert.strictEqual(summaryItem.quantityInWeek, 50, "Quantity in week should be 50 (20+30)");
    assert.strictEqual(summaryItem.quantityToDate, 94, "Quantity to date should be 94 (44+50)");
    assert.strictEqual(summaryItem.remainingQuantity, 86, "Remaining quantity should be 86 (180-94)");
    assert(Math.abs(summaryItem.progressPercent - 52.22) < 0.01, `Percent should match 52.22, got ${summaryItem.progressPercent}`);
    assert(summaryItem.dates.includes(weekDay1.toISOString().slice(0, 10)), "Dates should include Day 1");
    assert(summaryItem.dates.includes(weekDay3.toISOString().slice(0, 10)), "Dates should include Day 3");
    assert(!summaryItem.dates.includes(weekDay4.toISOString().slice(0, 10)), "Dates should NOT include Day 4 (Rejected)");

    console.log("Mocking session for createSiteReport...");
    // Since createSiteReport uses `getSession`, we can't easily run it outside a request context.
    // So we'll manually simulate what `actions.ts` does to save a weekly report.
    const reportData = {
      projectId,
      type: "WEEKLY",
      reportDate: weekEndDate,
      status: "DRAFT",
      createdById: user.id,
      weekStartDate,
      weekEndDate,
      lines: {
        create: summary.groups[0].items.map((it, idx) => ({
          projectId,
          fieldProgressItemId: it.fieldProgressItemId,
          workContent: it.workContent,
          workName: it.workContent,
          quantityToday: it.quantityInWeek,
          designQuantity: it.designQuantity,
          quantityBefore: it.quantityBeforeWeek,
          quantityCumulative: it.quantityToDate,
          progressPercent: it.progressPercent,
          note: JSON.stringify(it.dates),
          sortOrder: idx,
        }))
      }
    };

    const weeklyReport = await prisma.siteReport.create({
      data: reportData,
      include: { lines: true }
    });

    console.log("Checking saved weekly report lines...");
    const savedLine = weeklyReport.lines[0];
    assert.strictEqual(savedLine.fieldProgressItemId, item.id, "Should save fieldProgressItemId");
    assert.strictEqual(Number(savedLine.quantityToday), 50, "Should save quantity in week as today");
    assert.strictEqual(Number(savedLine.quantityBefore), 44, "Should save quantity before week");
    assert.strictEqual(Number(savedLine.quantityCumulative), 94, "Should save quantity to date");
    assert.strictEqual(Number(savedLine.designQuantity), 180, "Should save design quantity");
    assert(savedLine.note!.includes("2026-07-06"), "Note should contain dates");

    console.log("✅ Weekly Backend Logic Passed!");
  } catch (error) {
    console.error("❌ QA Failed:", error);
    process.exit(1);
  } finally {
    if (projectId) {
      console.log("Rolling back test data...");
      await prisma.project.delete({ where: { id: projectId } });
    }
    await prisma.$disconnect();
  }
}

main();
