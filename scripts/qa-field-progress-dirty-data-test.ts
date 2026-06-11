import prisma from "../src/lib/prisma";
import { evaluateVolumeGuard } from "../src/lib/field-progress/volume-guard";
import { getWorkDateRange } from "../src/lib/date/work-date";
import { Prisma } from "@prisma/client";
const Decimal = Prisma.Decimal;

const PROJECT_ID = "cmq52crh500030swk5u8cc1vd";
const TEMPLATE_ID = "cmq52eolh0000b4wkd79yrh6m";
const USER_ID = "cmq4ljlku0000cwwkewrboncw";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    process.exit(1);
  }
}

// Minimal replica of batchSaveDailyEntries map logic
async function simulateBatchSave(dateStr: string, entries: any[], submit: boolean) {
  const { start, end } = getWorkDateRange(dateStr);
  const status = submit ? "SUBMITTED" : "DRAFT";
  
  const itemIds = entries.map(e => e.itemId);
  const existing = await prisma.fieldProgressEntry.findMany({
    where: {
      templateId: TEMPLATE_ID,
      deletedAt: null,
      entryDate: { gte: start, lt: end },
    },
  });

  const existingByItemId = new Map<string, string[]>();
  for (const entry of existing) {
    if (!existingByItemId.has(entry.itemId)) {
      existingByItemId.set(entry.itemId, []);
    }
    existingByItemId.get(entry.itemId)!.push(entry.id);
  }

  const activeItems = await prisma.fieldProgressItem.findMany({
    where: { id: { in: itemIds }, deletedAt: null },
  });
  const itemsMap = new Map(activeItems.map(i => [i.id, Number(i.designQuantity || 0)]));

  const historicalSums = await prisma.fieldProgressEntry.groupBy({
    by: ["itemId"],
    where: { itemId: { in: itemIds }, deletedAt: null, status: "APPROVED", entryDate: { lt: start } },
    _sum: { quantity: true }
  });
  const sumsMap = new Map(historicalSums.map(s => [s.itemId, Number(s._sum.quantity || 0)]));

  const operations = entries.flatMap(e => {
    const quantityNum = Number(e.quantity || 0);
    const quantity = new Decimal(quantityNum);
    if (quantityNum < 0) throw new Error("Khối lượng không được âm");

    const existingIds = existingByItemId.get(e.itemId) || [];
    
    if (existingIds.length > 1) {
      throw new Error("Duplicate");
    }

    if (quantityNum === 0) {
      if (existingIds.length === 1) {
        return [
          prisma.fieldProgressEntry.update({
            where: { id: existingIds[0] },
            data: { deletedAt: new Date() }
          })
        ];
      }
      return [];
    }

    const designQty = itemsMap.get(e.itemId) || 0;
    const cumulativeBefore = sumsMap.get(e.itemId) || 0;
    
    const guard = evaluateVolumeGuard({
      designQuantity: designQty, cumulativeBefore, todayQuantity: quantityNum, status,
      note: e.note, issueNote: e.issueNote, proposalNote: e.proposalNote
    });

    if (submit && !guard.canSubmit) {
      throw new Error("OVER_LIMIT");
    }
    
    if (existingIds.length === 1) {
      return [
        prisma.fieldProgressEntry.update({
          where: { id: existingIds[0] },
          data: { quantity, status, submittedAt: submit ? new Date() : undefined, deletedAt: null }
        })
      ];
    } else {
      return [
        prisma.fieldProgressEntry.create({
          data: {
            projectId: PROJECT_ID, templateId: TEMPLATE_ID, itemId: e.itemId, entryDate: start,
            quantity, status, createdById: USER_ID, submittedAt: submit ? new Date() : undefined
          }
        })
      ];
    }
  });

  return prisma.$transaction(operations);
}

async function runTests() {
  console.log("🧪 STARTING DIRTY DATA PREVENTION TESTS...");

  const items = await prisma.fieldProgressItem.findMany({
    where: { templateId: TEMPLATE_ID, deletedAt: null, itemType: "WORK" },
    take: 1
  });
  const item = items[0];
  assert(!!item, "Need at least 1 active item");

  const testDate = "2026-06-01";
  const { start, end } = getWorkDateRange(testDate);
  
  // Cleanup
  await prisma.fieldProgressEntry.updateMany({
    where: { itemId: item.id, entryDate: { gte: start, lt: end }, deletedAt: null },
    data: { deletedAt: new Date() }
  });

  console.log("\n➡️ CASE 1: Save daily quantity = 0 should NOT create entry");
  await simulateBatchSave(testDate, [{ itemId: item.id, quantity: 0 }], false);
  const c1 = await prisma.fieldProgressEntry.count({
    where: { itemId: item.id, entryDate: { gte: start, lt: end }, deletedAt: null }
  });
  assert(c1 === 0, "Should not have created a zero-quantity entry");
  console.log("  ✅ PASS");

  console.log("\n➡️ CASE 2: Update quantity from >0 to 0 should soft-delete");
  await simulateBatchSave(testDate, [{ itemId: item.id, quantity: 10 }], false);
  const c2_before = await prisma.fieldProgressEntry.count({
    where: { itemId: item.id, entryDate: { gte: start, lt: end }, deletedAt: null }
  });
  assert(c2_before === 1, "Should have created entry");

  await simulateBatchSave(testDate, [{ itemId: item.id, quantity: 0 }], false);
  const c2_after = await prisma.fieldProgressEntry.count({
    where: { itemId: item.id, entryDate: { gte: start, lt: end }, deletedAt: null }
  });
  assert(c2_after === 0, "Should have soft-deleted the entry");
  
  const c2_soft_deleted = await prisma.fieldProgressEntry.count({
    where: { itemId: item.id, entryDate: { gte: start, lt: end }, deletedAt: { not: null } }
  });
  assert(c2_soft_deleted === 1, "Entry should be soft deleted, not hard deleted");
  console.log("  ✅ PASS");

  console.log("\n🎉 ALL DIRTY DATA PREVENTION TESTS PASSED!");
  await prisma.$disconnect();
}

runTests().catch(async (e) => {
  console.error("❌ Test crashed:", e);
  await prisma.$disconnect();
  process.exit(1);
});
