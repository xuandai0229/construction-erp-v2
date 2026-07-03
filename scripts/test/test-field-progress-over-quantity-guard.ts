import { PrismaClient, Prisma } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as dotenv from 'dotenv';
import { getWorkDateRange, formatWorkDate } from '../src/lib/date/work-date';
import { evaluateVolumeGuard } from '../src/lib/field-progress/volume-guard';

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
const Decimal = Prisma.Decimal;

async function testBatchSaveDailyEntries(projectId: string, templateId: string, entryDateStr: string, entries: any[]) {
  const { start, end } = getWorkDateRange(entryDateStr);
  const status = "APPROVED";
  const itemIds = entries.map(e => e.itemId);

  const existing = await prisma.fieldProgressEntry.findMany({
    where: { templateId, deletedAt: null, entryDate: { gte: start, lt: end } },
  });

  const existingByItemId = new Map<string, typeof existing>();
  for (const entry of existing) {
    if (!existingByItemId.has(entry.itemId)) existingByItemId.set(entry.itemId, []);
    existingByItemId.get(entry.itemId)!.push(entry);
  }

  const activeItems = await prisma.fieldProgressItem.findMany({
    where: { id: { in: itemIds }, deletedAt: null },
    select: { id: true, itemType: true, designQuantity: true }
  });
  const itemsMap = new Map(activeItems.map(i => [i.id, i]));

  const historicalSums = await prisma.fieldProgressEntry.groupBy({
    by: ["itemId"],
    where: { itemId: { in: itemIds }, deletedAt: null, status: "APPROVED", entryDate: { lt: start } },
    _sum: { quantity: true }
  });
  const sumsMap = new Map(historicalSums.map(s => [s.itemId, Number(s._sum.quantity || 0)]));

  for (const e of entries) {
    const item = itemsMap.get(e.itemId);
    if (!item) throw new Error("Item not found");
    if (item.itemType === "GROUP") throw new Error("Cannot add entry to GROUP item");

    const quantityNum = Number(e.quantity || 0);
    if (isNaN(quantityNum)) throw new Error("Quantity must be a number");
    const quantity = new Decimal(quantityNum);
    if (quantity.lessThan(0)) throw new Error("Khối lượng không được âm");

    const designQty = Number(item.designQuantity || 0);
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

    if (!guard.canSubmit) {
      throw new Error("Khối lượng sau nhập vượt khối lượng thiết kế. Vui lòng kiểm tra lại hoặc tạo công việc phát sinh.");
    }
    
    // Simulate update or create...
    const existingEntries = existingByItemId.get(e.itemId) || [];
    const existingEntry = existingEntries[0];

    if (existingEntry) {
      await prisma.fieldProgressEntry.update({
        where: { id: existingEntry.id },
        data: { quantity }
      });
    } else {
      await prisma.fieldProgressEntry.create({
        data: {
          projectId, templateId, itemId: e.itemId, entryDate: start,
          quantity, status, createdById: entries[0].userId, approvedAt: new Date()
        }
      });
    }
  }
}

async function runTestCases() {
  console.log("--- STARTING TESTS ---");
  const user = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  const userId = user!.id;
  const project = await prisma.project.findUnique({ where: { code: "TH-125" } });
  const template = await prisma.fieldProgressTemplate.findFirst({ where: { projectId: project!.id } });
  
  const workItem = await prisma.fieldProgressItem.findFirst({
    where: { templateId: template!.id, itemType: "WORK", workContent: "Đào móng" }
  });
  const groupItem = await prisma.fieldProgressItem.findFirst({
    where: { templateId: template!.id, itemType: "GROUP" }
  });

  const TEST_DATE = "2026-06-25"; // A date not used in seed

  // Cleanup before
  const { start, end } = getWorkDateRange(TEST_DATE);
  await prisma.fieldProgressEntry.deleteMany({
    where: { templateId: template!.id, entryDate: { gte: start, lt: end } }
  });

  // Helper to log result
  const expectSuccess = async (name: string, fn: () => Promise<void>) => {
    try { await fn(); console.log(`[PASS] ${name}`); }
    catch (e: any) { console.error(`[FAIL] ${name}: Expected success but got: ${e.message}`); }
  };

  const expectError = async (name: string, errorContains: string, fn: () => Promise<void>) => {
    try { await fn(); console.error(`[FAIL] ${name}: Expected error but got success`); }
    catch (e: any) { 
      if (e.message.includes(errorContains)) {
        console.log(`[PASS] ${name} (Caught expected error: ${e.message})`);
      } else {
        console.error(`[FAIL] ${name}: Expected error containing '${errorContains}', got: ${e.message}`);
      }
    }
  };

  // Case 1: Valid
  await expectSuccess("Case 1 - Nhập hợp lệ", async () => {
    await testBatchSaveDailyEntries(project!.id, template!.id, TEST_DATE, [{
      itemId: workItem!.id, quantity: 10, userId
    }]);
  });

  // Case 2: Over design quantity
  await expectError("Case 2 - Nhập vượt thiết kế", "Khối lượng sau nhập vượt khối lượng thiết kế", async () => {
    await testBatchSaveDailyEntries(project!.id, template!.id, TEST_DATE, [{
      itemId: workItem!.id, quantity: 3000, userId
    }]);
  });

  // Case 3: Update same day (should not double count)
  await expectSuccess("Case 3 - Update cùng ngày không cộng trùng", async () => {
    // Already has 10 from Case 1
    await testBatchSaveDailyEntries(project!.id, template!.id, TEST_DATE, [{
      itemId: workItem!.id, quantity: 20, userId
    }]);
    // Validate it's exactly 20
    const entry = await prisma.fieldProgressEntry.findFirst({
      where: { itemId: workItem!.id, entryDate: { gte: start, lt: end } }
    });
    if (entry!.quantity.toNumber() !== 20) throw new Error("Expected 20, got " + entry!.quantity.toNumber());
  });

  // Case 4: Negative
  await expectError("Case 4 - Số âm", "Khối lượng không được âm", async () => {
    await testBatchSaveDailyEntries(project!.id, template!.id, TEST_DATE, [{
      itemId: workItem!.id, quantity: -5, userId
    }]);
  });

  // Case 5: NaN
  await expectError("Case 5 - Chữ/NaN", "Quantity must be a number", async () => {
    await testBatchSaveDailyEntries(project!.id, template!.id, TEST_DATE, [{
      itemId: workItem!.id, quantity: "abc", userId
    }]);
  });

  // Case 6: Group item
  await expectError("Case 6 - Nhập cho GROUP item", "Cannot add entry to GROUP item", async () => {
    await testBatchSaveDailyEntries(project!.id, template!.id, TEST_DATE, [{
      itemId: groupItem!.id, quantity: 10, userId
    }]);
  });

  // Case 7: Timezone check
  await expectSuccess("Case 7 - Timezone", async () => {
    const entry = await prisma.fieldProgressEntry.findFirst({
      where: { itemId: workItem!.id, entryDate: { gte: start, lt: end } }
    });
    const formatted = formatWorkDate(entry!.entryDate);
    if (formatted !== TEST_DATE) throw new Error(`Expected ${TEST_DATE}, got ${formatted}`);
  });

  // Cleanup after
  await prisma.fieldProgressEntry.deleteMany({
    where: { templateId: template!.id, entryDate: { gte: start, lt: end } }
  });

  console.log("--- TESTS COMPLETED ---");
}

runTestCases()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
