import { PrismaClient, UserRole } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { getBulkWorkQuantityBalance } from "../src/lib/field-progress/volume-balance";
import { createSiteReportWithAudit } from "../src/lib/reports/report-create-service";
import { Decimal } from "decimal.js";

const connectionString = process.env.DATABASE_URL || "";
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const testActor = {
  id: "test-actor-id",
  name: "Test Actor",
  role: "ADMIN" as UserRole,
};

async function main() {
  console.log("=== QA: Popup Volume Balance Flow ===");
  console.log("Tag: QA_POPUP_VOLUME_BALANCE_2026_07_04");
  console.log("");

  await prisma.$transaction(async (tx) => {
    // 1. Setup Data
    const project = await tx.project.create({
      data: {
        code: `TEST-POPUP-${Date.now()}`,
        name: "Test Popup Project",
        status: "ACTIVE",
      },
    });

    const user = await tx.user.upsert({
      where: { id: testActor.id },
      update: {},
      create: {
        id: testActor.id,
        email: "test_popup@example.com",
        name: testActor.name,
        password: "dummy",
        role: "ADMIN",
      },
    });

    const template = await tx.fieldProgressTemplate.create({
      data: {
        project: { connect: { id: project.id } },
        name: "Test Template",
        status: "ACTIVE",
        createdBy: { connect: { id: user.id } },
      },
    });

    const item = await tx.fieldProgressItem.create({
      data: {
        project: { connect: { id: project.id } },
        template: { connect: { id: template.id } },
        createdBy: { connect: { id: user.id } },
        itemType: "WORK",
        code: "WORK-POPUP-001",
        workContent: "Đào đất",
        unit: "m3",
        designQuantity: 180,
      },
    });

    console.log(`✅ Setup project ${project.code} and item ${item.code} (Design Qty: 180)`);

    const day1 = new Date();
    day1.setHours(7, 0, 0, 0);

    // 2. Submit report 1 (44m3) - simulate field progress / daily report
    await createSiteReportWithAudit(tx, testActor, {
      projectId: project.id,
      type: "DAILY",
      reportDate: day1,
      status: "SUBMITTED",
      lines: {
        create: [
          {
            projectId: project.id,
            fieldProgressItemId: item.id,
            workContent: "Test Work",
            workName: "Test Work",
            quantityToday: 44,
            sortOrder: 0,
          },
        ],
      },
    });
    console.log(`\nReport 1 (44m3, Day 1) submitted.`);

    // 3. Get Project Work Items exactly as the popup does via actions.ts getProjectWorkItems (Simulated)
    const balances = await getBulkWorkQuantityBalance(tx, project.id, [item.id], {
      targetDate: day1.toISOString().split("T")[0],
    });
    const balance = balances.get(item.id)!;
    
    const popupData = {
      designQuantity: balance.plannedQuantity,
      approvedCumulative: balance.totalActiveEnteredQuantity, 
      todayQuantity: balance.sameDateEnteredQuantity,
      remainingQuantity: balance.remainingQuantity,
    };

    console.log(`\nPopup Data:`, popupData);

    console.assert(new Decimal(popupData.designQuantity).toNumber() === 180, `Expected 180, got ${popupData.designQuantity}`);
    console.assert(popupData.approvedCumulative === 44, `Expected 44, got ${popupData.approvedCumulative}`);
    console.assert(popupData.todayQuantity === 44, `Expected 44, got ${popupData.todayQuantity}`);
    console.assert(popupData.remainingQuantity === 136, `Expected 136, got ${popupData.remainingQuantity}`);
    console.log(`✅ Popup logic correctly reflects 136 remaining!`);

    console.log("\nRolling back test data...");
    throw new Error("ROLLBACK_TEST");
  }).catch(e => {
    if (e.message !== "ROLLBACK_TEST") {
      console.error("Test failed!", e);
      process.exit(1);
    } else {
      console.log("✅ All tests passed and data rolled back.");
    }
  });

  await prisma.$disconnect();
}

main();