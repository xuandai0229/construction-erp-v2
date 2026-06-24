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
    select: { id: true, itemType: true, designQuantity: true, projectId: true, templateId: true }
  });
  const itemsMap = new Map(activeItems.map(i => [i.id, i]));

  const otherDaysSums = await prisma.fieldProgressEntry.groupBy({
    by: ["itemId"],
    where: {
      itemId: { in: itemIds },
      deletedAt: null,
      status: "APPROVED",
      OR: [
        { entryDate: { lt: start } },
        { entryDate: { gte: end } }
      ]
    },
    _sum: { quantity: true }
  });
  const sumsMap = new Map(otherDaysSums.map(s => [s.itemId, Number(s._sum.quantity || 0)]));

  for (const e of entries) {
    const item = itemsMap.get(e.itemId);
    if (!item) throw new Error("Công việc không hợp lệ hoặc đã bị xóa");
    if (item.projectId !== projectId || item.templateId !== templateId) throw new Error("Công việc không thuộc công trình hiện tại");
    if (item.itemType === "GROUP") throw new Error("Không thể nhập khối lượng cho hạng mục tổng");

    const rawQuantity = e.quantity === "" || e.quantity == null ? 0 : e.quantity;
    const quantityNum = Number(rawQuantity);

    if (!Number.isFinite(quantityNum)) throw new Error("Khối lượng phải là số hợp lệ");
    if (quantityNum < 0) throw new Error("Khối lượng không được âm");
    const quantity = new Decimal(quantityNum);

    const existingEntries = existingByItemId.get(e.itemId) || [];
    const existingEntry = existingEntries[0];

    if (quantityNum === 0) {
      if (existingEntry) {
        await prisma.fieldProgressEntry.update({
          where: { id: existingEntry.id },
          data: { deletedAt: new Date() }
        });
      }
      continue;
    }

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
    
    if (existingEntry) {
      await prisma.fieldProgressEntry.update({
        where: { id: existingEntry.id },
        data: { quantity }
      });
    } else {
      await prisma.fieldProgressEntry.create({
        data: {
          projectId, templateId, itemId: e.itemId, entryDate: start,
          quantity, status, createdById: e.userId, approvedAt: new Date()
        }
      });
    }
  }
}

async function runTestCases() {
  console.log("--- STARTING HARDENING TESTS ---");
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

  const TEST_DATE = "2026-12-30";

  const { start, end } = getWorkDateRange(TEST_DATE);
  await prisma.fieldProgressEntry.deleteMany({
    where: { templateId: template!.id, entryDate: { gte: start, lt: end } }
  });

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

  // Case 1
  await expectSuccess("Case 1 - Nhập hợp lệ", async () => {
    await testBatchSaveDailyEntries(project!.id, template!.id, TEST_DATE, [{
      itemId: workItem!.id, quantity: 10, userId
    }]);
  });

  // Case 2
  await expectSuccess("Case 2 - Sửa cùng ngày", async () => {
    await testBatchSaveDailyEntries(project!.id, template!.id, TEST_DATE, [{
      itemId: workItem!.id, quantity: 20, userId
    }]);
    const entry = await prisma.fieldProgressEntry.findFirst({
      where: { itemId: workItem!.id, entryDate: { gte: start, lt: end }, deletedAt: null }
    });
    if (entry!.quantity.toNumber() !== 20) throw new Error("Expected 20, got " + entry!.quantity.toNumber());
  });

  // Case 3
  await expectSuccess("Case 3 - Xóa về 0", async () => {
    await testBatchSaveDailyEntries(project!.id, template!.id, TEST_DATE, [{
      itemId: workItem!.id, quantity: 0, userId
    }]);
    const entry = await prisma.fieldProgressEntry.findFirst({
      where: { itemId: workItem!.id, entryDate: { gte: start, lt: end }, deletedAt: null }
    });
    if (entry) throw new Error("Expected soft delete, but entry still active.");
  });

  // Case 4
  await expectError("Case 4 - Nhập vượt thiết kế", "Khối lượng sau nhập vượt khối lượng thiết kế", async () => {
    await testBatchSaveDailyEntries(project!.id, template!.id, TEST_DATE, [{
      itemId: workItem!.id, quantity: 3000, userId
    }]);
  });

  // Case 5
  await expectError("Case 5 - Số âm", "Khối lượng không được âm", async () => {
    await testBatchSaveDailyEntries(project!.id, template!.id, TEST_DATE, [{
      itemId: workItem!.id, quantity: -5, userId
    }]);
  });

  // Case 6
  await expectError("Case 6 - Chữ/NaN", "Khối lượng phải là số hợp lệ", async () => {
    await testBatchSaveDailyEntries(project!.id, template!.id, TEST_DATE, [{
      itemId: workItem!.id, quantity: "abc", userId
    }]);
  });

  // Case 7
  await expectSuccess("Case 7 - Decimal", async () => {
    await testBatchSaveDailyEntries(project!.id, template!.id, TEST_DATE, [{
      itemId: workItem!.id, quantity: 10.5, userId
    }]);
  });

  // Case 8
  await expectError("Case 8 - GROUP item", "Không thể nhập khối lượng cho hạng mục tổng", async () => {
    await testBatchSaveDailyEntries(project!.id, template!.id, TEST_DATE, [{
      itemId: groupItem!.id, quantity: 10, userId
    }]);
  });

  // Case 9
  await expectError("Case 9 - Item project/template khác", "Công việc không thuộc công trình hiện tại", async () => {
    // Pass a fake project ID
    await testBatchSaveDailyEntries("fake-project-id", template!.id, TEST_DATE, [{
      itemId: workItem!.id, quantity: 10, userId
    }]);
  });

  // Case 10
  await expectSuccess("Case 10 - Timezone", async () => {
    const entry = await prisma.fieldProgressEntry.findFirst({
      where: { itemId: workItem!.id, entryDate: { gte: start, lt: end }, deletedAt: null }
    });
    const formatted = formatWorkDate(entry!.entryDate);
    if (formatted !== TEST_DATE) throw new Error(`Expected ${TEST_DATE}, got ${formatted}`);
  });

  await prisma.fieldProgressEntry.deleteMany({
    where: { templateId: template!.id, entryDate: { gte: start, lt: end } }
  });

  console.log("--- HARDENING TESTS COMPLETED ---");
}

runTestCases()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
