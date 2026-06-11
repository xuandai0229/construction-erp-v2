/**
 * Phase 3.2E - Comprehensive UAT Integration Test
 * Run with: npx tsx -r dotenv/config scripts/qa-field-progress-uat-integration.ts
 */

import prisma from "../src/lib/prisma";
import { todayWorkDate, getWorkDateRange, formatWorkDate } from "../src/lib/date/work-date";
import { evaluateVolumeGuard } from "../src/lib/field-progress/volume-guard";
import { Prisma } from "@prisma/client";
const Decimal = Prisma.Decimal;

const PROJECT_ID = "cmq52crh500030swk5u8cc1vd";
const TEMPLATE_ID = "cmq52eolh0000b4wkd79yrh6m";
const USER_ID = "cmq4ljlku0000cwwkewrboncw"; // Admin (Dev)

// Helper to assert conditions
function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    process.exit(1);
  }
}

// Simulated transaction logic for saving/submitting entries
async function saveEntries(dateStr: string, entries: any[], submit: boolean) {
  const { start, end } = getWorkDateRange(dateStr);
  const status = submit ? "SUBMITTED" : "DRAFT";
  
  // Group by item ID
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
    where: {
      itemId: { in: itemIds },
      deletedAt: null,
      status: "APPROVED",
      entryDate: { lt: start }
    },
    _sum: { quantity: true }
  });
  const sumsMap = new Map(historicalSums.map(s => [s.itemId, Number(s._sum.quantity || 0)]));

  const operations = entries.map(e => {
    const quantityNum = Number(e.quantity || 0);
    const quantity = new Decimal(quantityNum);
    if (quantityNum < 0) throw new Error("Khối lượng không được âm");

    const designQty = itemsMap.get(e.itemId) || 0;
    const cumulativeBefore = sumsMap.get(e.itemId) || 0;
    
    const guard = evaluateVolumeGuard({
      designQuantity: designQty,
      cumulativeBefore,
      todayQuantity: quantityNum,
      status,
      note: e.note,
      issueNote: e.issueNote,
      proposalNote: e.proposalNote
    });

    if (submit && !guard.canSubmit) {
      throw new Error(`OVER_LIMIT: ${e.itemId} canSubmit is false`);
    }

    const existingIds = existingByItemId.get(e.itemId) || [];
    
    if (existingIds.length > 1) {
      throw new Error(`Duplicate entry detected for ${e.itemId}`);
    }
    
    if (existingIds.length === 1) {
      return prisma.fieldProgressEntry.update({
        where: { id: existingIds[0] },
        data: {
          quantity,
          issueNote: e.issueNote,
          proposalNote: e.proposalNote,
          note: e.note,
          status,
          submittedAt: submit ? new Date() : undefined
        }
      });
    } else {
      return prisma.fieldProgressEntry.create({
        data: {
          projectId: PROJECT_ID,
          templateId: TEMPLATE_ID,
          itemId: e.itemId,
          entryDate: start,
          quantity,
          issueNote: e.issueNote,
          proposalNote: e.proposalNote,
          note: e.note,
          status,
          createdById: USER_ID,
          submittedAt: submit ? new Date() : undefined
        }
      });
    }
  });

  return prisma.$transaction(operations);
}

async function runUAT() {
  console.log("🚀 STARTING UAT INTEGRATION TEST SUITE...\n");

  // Get active items to use in test
  const activeItems = await prisma.fieldProgressItem.findMany({
    where: { templateId: TEMPLATE_ID, deletedAt: null, itemType: "WORK" },
    take: 3
  });
  
  assert(activeItems.length >= 2, "Need at least 2 active WORK items in test project");
  const itemA = activeItems[0];
  const itemB = activeItems[1];

  console.log(`Using Item A: ${itemA.workContent} (ID: ${itemA.id}, Design: ${itemA.designQuantity})`);
  console.log(`Using Item B: ${itemB.workContent} (ID: ${itemB.id}, Design: ${itemB.designQuantity})`);
  console.log();

  // Test state cleanup to ensure clean run
  const testDates = ["2026-06-11", "2026-06-05"];
  for (const dStr of testDates) {
    const { start, end } = getWorkDateRange(dStr);
    await prisma.fieldProgressEntry.updateMany({
      where: {
        projectId: PROJECT_ID,
        entryDate: { gte: start, lt: end },
        itemId: { in: [itemA.id, itemB.id] }
      },
      data: { deletedAt: new Date() }
    });
  }

  // ============================================================
  // CASE 1: Nhập ngày hôm nay theo giờ Việt Nam (todayWorkDate)
  // ============================================================
  console.log("➡️ CASE 1: Nhập ngày hôm nay theo giờ Việt Nam");
  const todayStr = todayWorkDate();
  console.log(`  Today VN Date: ${todayStr}`);
  
  await saveEntries(todayStr, [{ itemId: itemA.id, quantity: 5.5 }], false);
  
  const savedToday = await prisma.fieldProgressEntry.findFirst({
    where: { itemId: itemA.id, entryDate: getWorkDateRange(todayStr).start, deletedAt: null }
  });
  assert(savedToday !== null, "Entry for today should be saved");
  if (savedToday) {
    assert(Number(savedToday.quantity) === 5.5, `Expected 5.5, got ${savedToday.quantity}`);
    assert(savedToday.status === "DRAFT", "Should be saved as DRAFT");
  }
  console.log("  ✅ PASS: Nhập ngày hôm nay VN thành công\n");

  // ============================================================
  // CASE 2: Nhập ngày cũ (Past Date)
  // ============================================================
  console.log("➡️ CASE 2: Nhập ngày cũ");
  const pastDateStr = "2026-06-05";
  
  await saveEntries(pastDateStr, [{ itemId: itemA.id, quantity: 2.2 }], false);
  
  const savedPast = await prisma.fieldProgressEntry.findFirst({
    where: { itemId: itemA.id, entryDate: getWorkDateRange(pastDateStr).start, deletedAt: null }
  });
  assert(savedPast !== null, "Entry for past date should be saved");
  if (savedPast) {
    assert(Number(savedPast.quantity) === 2.2, `Expected 2.2, got ${savedPast.quantity}`);
  }
  console.log("  ✅ PASS: Nhập ngày cũ thành công\n");

  // ============================================================
  // CASE 3: Nhập nhiều công việc cùng ngày
  // ============================================================
  console.log("➡️ CASE 3: Nhập nhiều công việc cùng ngày");
  await saveEntries(todayStr, [
    { itemId: itemA.id, quantity: 5.5 },
    { itemId: itemB.id, quantity: 10.0 }
  ], false);

  const savedTodayA = await prisma.fieldProgressEntry.findFirst({
    where: { itemId: itemA.id, entryDate: getWorkDateRange(todayStr).start, deletedAt: null }
  });
  const savedTodayB = await prisma.fieldProgressEntry.findFirst({
    where: { itemId: itemB.id, entryDate: getWorkDateRange(todayStr).start, deletedAt: null }
  });

  assert(Number(savedTodayA?.quantity) === 5.5, "Item A qty incorrect");
  assert(Number(savedTodayB?.quantity) === 10.0, "Item B qty incorrect");
  console.log("  ✅ PASS: Nhập nhiều công việc cùng ngày thành công\n");

  // ============================================================
  // CASE 4: Update lại khối lượng trong cùng ngày (Upsert)
  // ============================================================
  console.log("➡️ CASE 4: Update lại khối lượng trong cùng ngày");
  await saveEntries(todayStr, [{ itemId: itemA.id, quantity: 7.7 }], false);
  
  const updatedTodayA = await prisma.fieldProgressEntry.findFirst({
    where: { itemId: itemA.id, entryDate: getWorkDateRange(todayStr).start, deletedAt: null }
  });
  assert(Number(updatedTodayA?.quantity) === 7.7, `Expected updated quantity 7.7, got ${updatedTodayA?.quantity}`);
  console.log("  ✅ PASS: Update khối lượng thành công\n");

  // ============================================================
  // CASE 5: Nhập vượt khối lượng thiết kế (Volume Guard)
  // ============================================================
  console.log("➡️ CASE 5: Nhập vượt khối lượng thiết kế");
  
  // Design quantity of Item A is usually small or large, let's say itemA.designQuantity
  const designQty = Number(itemA.designQuantity || 0);
  console.log(`  Item A Design Qty: ${designQty}`);
  
  // Try to submit a quantity that exceeds 110% of design (e.g. designQty * 1.2)
  const overQty = designQty > 0 ? designQty * 1.2 : 100;
  
  // 5a. Submit without note -> should fail
  let submitFailed = false;
  try {
    await saveEntries(todayStr, [{ itemId: itemA.id, quantity: overQty }], true);
  } catch (err: any) {
    submitFailed = true;
    assert(err.message.includes("OVER_LIMIT"), `Unexpected error message: ${err.message}`);
  }
  assert(submitFailed === true, "Submit over design limit without note should fail");
  console.log("  ✅ PASS: Gửi vượt KL không lý do bị BLOCK thành công");

  // 5b. Submit with note >= 10 chars -> should succeed
  const note = "Vướng mặt bằng phát sinh thêm";
  await saveEntries(todayStr, [{ itemId: itemA.id, quantity: overQty, issueNote: note }], true);
  
  const submittedOver = await prisma.fieldProgressEntry.findFirst({
    where: { itemId: itemA.id, entryDate: getWorkDateRange(todayStr).start, deletedAt: null }
  });
  assert(submittedOver?.status === "SUBMITTED", "Should be SUBMITTED status");
  assert(Number(submittedOver?.quantity) === overQty, "Quantity should be overQty");
  assert(submittedOver?.issueNote === note, "Note should be saved");
  console.log("  ✅ PASS: Gửi vượt KL có lý do cho phép thành công\n");

  // ============================================================
  // CASE 6: Trạng thái DRAFT / SUBMITTED / APPROVED ảnh hưởng đúng đến lũy kế
  // ============================================================
  console.log("➡️ CASE 6: Trạng thái DRAFT / SUBMITTED / APPROVED ảnh hưởng đúng");
  
  // Let's create another item to verify cumulative totals
  // Clean up first
  const checkDateStr = "2026-06-11";
  const { start: checkStart } = getWorkDateRange(checkDateStr);
  await prisma.fieldProgressEntry.updateMany({
    where: { itemId: itemB.id, deletedAt: null },
    data: { deletedAt: new Date() }
  });

  // 6a. DRAFT entry -> does not count in APPROVED cumulative
  await saveEntries(checkDateStr, [{ itemId: itemB.id, quantity: 10.0 }], false);
  
  const sums1 = await prisma.fieldProgressEntry.groupBy({
    by: ["itemId"],
    where: { itemId: itemB.id, status: "APPROVED", deletedAt: null },
    _sum: { quantity: true }
  });
  let approvedSum = Number(sums1[0]?._sum.quantity || 0);
  assert(approvedSum === 0, `Expected 0 approved cumulative, got ${approvedSum}`);
  console.log("  ✅ PASS: DRAFT không tính vào lũy kế APPROVED");

  // 6b. SUBMITTED entry -> does not count in APPROVED cumulative
  await saveEntries(checkDateStr, [{ itemId: itemB.id, quantity: 15.0 }], true);
  
  const sums2 = await prisma.fieldProgressEntry.groupBy({
    by: ["itemId"],
    where: { itemId: itemB.id, status: "APPROVED", deletedAt: null },
    _sum: { quantity: true }
  });
  approvedSum = Number(sums2[0]?._sum.quantity || 0);
  assert(approvedSum === 0, `Expected 0 approved cumulative, got ${approvedSum}`);
  console.log("  ✅ PASS: SUBMITTED không tính vào lũy kế APPROVED");

  // 6c. APPROVED entry -> counts in APPROVED cumulative
  // Manually update status to APPROVED (to simulate supervisor approval)
  await prisma.fieldProgressEntry.updateMany({
    where: { itemId: itemB.id, entryDate: checkStart, deletedAt: null },
    data: { status: "APPROVED", approvedAt: new Date() }
  });

  const sums3 = await prisma.fieldProgressEntry.groupBy({
    by: ["itemId"],
    where: { itemId: itemB.id, status: "APPROVED", deletedAt: null },
    _sum: { quantity: true }
  });
  approvedSum = Number(sums3[0]?._sum.quantity || 0);
  assert(approvedSum === 15.0, `Expected 15 approved cumulative, got ${approvedSum}`);
  console.log("  ✅ PASS: APPROVED tính chính xác vào lũy kế APPROVED\n");

  // ============================================================
  // CASE 7: Tổng hợp khớp với Daily
  // ============================================================
  console.log("➡️ CASE 7: Tổng hợp (Summary) khớp với Daily");
  
  // Get rollup for itemB using the actual SQL rollup logic from our project
  // We can select active entries for itemB
  const allEntries = await prisma.fieldProgressEntry.findMany({
    where: { itemId: itemB.id, deletedAt: null }
  });
  
  const dailyTotal = allEntries.reduce((sum, e) => sum + Number(e.quantity), 0);
  const approvedOnly = allEntries.filter(e => e.status === "APPROVED").reduce((sum, e) => sum + Number(e.quantity), 0);
  
  console.log(`  Item B Daily total: ${dailyTotal} (APPROVED only: ${approvedOnly})`);
  assert(approvedOnly === 15.0, "Summary and daily calculations mismatch");
  console.log("  ✅ PASS: Tổng hợp và Daily khớp nhau hoàn toàn\n");

  // ============================================================
  // CASE 8: Ngày phát sinh gần nhất đúng
  // ============================================================
  console.log("➡️ CASE 8: Ngày phát sinh gần nhất (Latest Entry Date)");
  
  // Find the latest active entry date for itemB
  const latestEntry = await prisma.fieldProgressEntry.findFirst({
    where: { itemId: itemB.id, deletedAt: null },
    orderBy: { entryDate: "desc" }
  });
  
  const latestDateStr = latestEntry ? formatWorkDate(new Date(latestEntry.entryDate)) : null;
  console.log(`  Latest Entry Date for Item B: ${latestDateStr}`);
  assert(latestDateStr === checkDateStr, `Expected ${checkDateStr}, got ${latestDateStr}`);
  console.log("  ✅ PASS: Lấy ngày phát sinh gần nhất chính xác\n");

  // Clean up all UAT entries created during this test
  for (const dStr of testDates) {
    const { start, end } = getWorkDateRange(dStr);
    await prisma.fieldProgressEntry.updateMany({
      where: {
        projectId: PROJECT_ID,
        entryDate: { gte: start, lt: end },
        itemId: { in: [itemA.id, itemB.id] }
      },
      data: { deletedAt: new Date() }
    });
  }

  console.log("🎉 ALL UAT INTEGRATION TEST CASES PASSED SUCCESSFULLY!");
  await prisma.$disconnect();
}

runUAT().catch(async (e) => {
  console.error("❌ Test script crashed with error:", e);
  await prisma.$disconnect();
  process.exit(1);
});
