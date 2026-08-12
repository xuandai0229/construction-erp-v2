import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { applyMaterialMovement } from '../src/lib/materials/ledger';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('=== SEEDING MATERIALS QA FIXTURES ===');

  const projects = await prisma.project.findMany({
    where: {
      code: { in: ['CT-2026-0001', 'CT-2026-0011', 'CT-2026-0015'] },
      deletedAt: null,
    },
  });

  if (projects.length < 3) {
    throw new Error('Not enough target projects found in DB for QA seeding.');
  }

  const [p1, p2, p3] = projects;
  console.log('Target Projects:', projects.map(p => `${p.code} (${p.id})`));

  // Clean existing QA items if any
  await prisma.materialMovement.deleteMany({
    where: { materialItem: { code: { startsWith: 'QA-' } } }
  });
  await prisma.projectMaterialStock.deleteMany({
    where: { materialItem: { code: { startsWith: 'QA-' } } }
  });
  await prisma.materialProposalItem.deleteMany({
    where: { proposal: { proposalNo: { startsWith: 'DVT-QA-' } } }
  });
  await prisma.materialProposal.deleteMany({
    where: { proposalNo: { startsWith: 'DVT-QA-' } }
  });
  await prisma.materialItem.deleteMany({
    where: { code: { startsWith: 'QA-' } }
  });

  console.log('Cleared existing QA-prefixed material data.');

  // Create 12 Material Items across projects:
  // 1. Same code & unit across projects: QA-XI-MANG (PCB40, bao) in P1, P2, P3
  // 2. Same code & unit across projects: QA-THEP-D10 (Thép D10, kg) in P1, P2
  // 3. Same name but different codes: "Cát vàng tinh" (QA-CAT-VANG-01 in P1, QA-CAT-VANG-02 in P2)
  // 4. Same code but DIFFERENT units: QA-COP-PHA (P1: m2, P2: bộ)
  // 5. Unique items: QA-GACH-THIEN-TAN (viên) in P3, QA-DA-1X2 (m3) in P1, QA-SON-NGOAI-THAT (thùng) in P2

  const itemDefs = [
    // P1 Items
    { projectId: p1.id, code: 'QA-XI-MANG', name: 'Xi măng PCB40 Hoàng Thạch', unit: 'bao', manufacturer: 'Vicem Hoàng Thạch', origin: 'Việt Nam', minStock: 100, initialStock: 250 },
    { projectId: p1.id, code: 'QA-THEP-D10', name: 'Thép thanh vằn D10 CB300-V', unit: 'kg', manufacturer: 'Hòa Phát', origin: 'Việt Nam', minStock: 1000, initialStock: 500 }, // Low stock (< 1000)
    { projectId: p1.id, code: 'QA-CAT-VANG-01', name: 'Cát vàng tinh xây trát', unit: 'm3', manufacturer: null, origin: 'Việt Nam', minStock: 20, initialStock: 0 }, // Out of stock
    { projectId: p1.id, code: 'QA-COP-PHA', name: 'Cốp pha phủ phim 18mm', unit: 'm2', manufacturer: null, origin: 'Việt Nam', minStock: 50, initialStock: 120 },
    { projectId: p1.id, code: 'QA-DA-1X2', name: 'Đá 1x2 đổ bê tông', unit: 'm3', manufacturer: null, origin: 'Việt Nam', minStock: 30, initialStock: 45 },

    // P2 Items
    { projectId: p2.id, code: 'QA-XI-MANG', name: 'Xi măng PCB40 Hoàng Thạch', unit: 'bao', manufacturer: 'Vicem Hoàng Thạch', origin: 'Việt Nam', minStock: 150, initialStock: 80 }, // Low stock
    { projectId: p2.id, code: 'QA-THEP-D10', name: 'Thép thanh vằn D10 CB300-V', unit: 'kg', manufacturer: 'Hòa Phát', origin: 'Việt Nam', minStock: 2000, initialStock: 3500 },
    { projectId: p2.id, code: 'QA-CAT-VANG-02', name: 'Cát vàng tinh xây trát', unit: 'm3', manufacturer: null, origin: 'Việt Nam', minStock: 15, initialStock: 30 },
    { projectId: p2.id, code: 'QA-COP-PHA', name: 'Cốp pha phủ phim 18mm', unit: 'bộ', manufacturer: null, origin: 'Việt Nam', minStock: 10, initialStock: 5 }, // Different unit!
    { projectId: p2.id, code: 'QA-SON-NGOAI-THAT', name: 'Sơn ngoại thất Dulux Weathershield', unit: 'thùng', manufacturer: 'Dulux', origin: 'Việt Nam', minStock: 10, initialStock: 25 },

    // P3 Items
    { projectId: p3.id, code: 'QA-XI-MANG', name: 'Xi măng PCB40 Hoàng Thạch', unit: 'bao', manufacturer: 'Vicem Hoàng Thạch', origin: 'Việt Nam', minStock: 80, initialStock: 100 },
    { projectId: p3.id, code: 'QA-GACH-THIEN-TAN', name: 'Gạch đặc 2 lỗ Thạch Bàn', unit: 'viên', manufacturer: 'Thạch Bàn', origin: 'Việt Nam', minStock: 5000, initialStock: 12000 },
  ];

  const createdItems: Record<string, string> = {};

  for (const def of itemDefs) {
    const item = await prisma.materialItem.create({
      data: {
        projectId: def.projectId,
        code: def.code,
        name: def.name,
        unit: def.unit,
        manufacturer: def.manufacturer,
        origin: def.origin,
        isActive: true,
      },
    });

    createdItems[`${def.projectId}:${def.code}`] = item.id;

    // A positive opening quantity is represented by an IMPORT through the
    // same ledger used by the application. This keeps QA stock and movement
    // history conserved. A zero opening quantity still needs a stock row to
    // retain its configured warning threshold.
    if (def.initialStock > 0) {
      await prisma.$transaction((tx) =>
        applyMaterialMovement(tx, {
          projectId: def.projectId,
          materialItemId: item.id,
          type: 'IMPORT',
          quantity: def.initialStock,
          unitPrice: 150000,
          movementDate: new Date(Date.now() - 86400000 * 5),
          notes: 'Nhập kho QA tự động',
          minStockLevel: def.minStock,
        }),
      );
    } else {
      await prisma.projectMaterialStock.create({
        data: {
          projectId: def.projectId,
          materialItemId: item.id,
          stock: 0,
          minStockLevel: def.minStock,
          lastUpdated: new Date(),
        },
      });
    }
  }

  console.log(`Created ${Object.keys(createdItems).length} material items and stocks.`);

  // Create additional Movements (Imports & Exports)
  const movementDefs = [
    { key: `${p1.id}:QA-XI-MANG`, type: 'IMPORT' as const, qty: 50, price: 90000, daysAgo: 3, note: 'Nhập bổ sung công trình 1' },
    { key: `${p1.id}:QA-XI-MANG`, type: 'EXPORT' as const, qty: 30, price: null, daysAgo: 1, note: 'Xuất thi công móng' },
    { key: `${p1.id}:QA-THEP-D10`, type: 'EXPORT' as const, qty: 200, price: null, daysAgo: 2, note: 'Xuất gia công cột' },
    { key: `${p2.id}:QA-THEP-D10`, type: 'IMPORT' as const, qty: 1000, price: 17500, daysAgo: 4, note: 'Nhập lô thép mới' },
    { key: `${p2.id}:QA-THEP-D10`, type: 'EXPORT' as const, qty: 500, price: null, daysAgo: 1, note: 'Xuất làm dầm sàn' },
    { key: `${p3.id}:QA-GACH-THIEN-TAN`, type: 'EXPORT' as const, qty: 3000, price: null, daysAgo: 2, note: 'Xuất xây tường tầng 2' },
  ];

  for (const m of movementDefs) {
    const itemId = createdItems[m.key];
    if (itemId) {
      const [projId] = m.key.split(':');
      await prisma.$transaction((tx) =>
        applyMaterialMovement(tx, {
          projectId: projId,
          materialItemId: itemId,
          type: m.type,
          quantity: m.qty,
          unitPrice: m.price,
          movementDate: new Date(Date.now() - 86400000 * m.daysAgo),
          notes: m.note,
        }),
      );
    }
  }

  console.log(`Created ${movementDefs.length} additional material movements.`);

  // Find a user ID to link as requester
  const adminUser = await prisma.user.findFirst({
    where: { role: 'ADMIN' },
    select: { id: true, name: true, role: true },
  });

  if (!adminUser) throw new Error('No admin user found to attach proposals');

  // Create 8 QA Proposals
  const proposalDefs = [
    { no: 'DVT-QA-2026-001', project: p1, status: 'SUBMITTED', item: 'QA-XI-MANG', qty: 200, unit: 'bao' },
    { no: 'DVT-QA-2026-002', project: p1, status: 'APPROVED', item: 'QA-THEP-D10', qty: 1500, unit: 'kg' },
    { no: 'DVT-QA-2026-003', project: p2, status: 'SUBMITTED', item: 'QA-XI-MANG', qty: 300, unit: 'bao' },
    { no: 'DVT-QA-2026-004', project: p2, status: 'DRAFT', item: 'QA-SON-NGOAI-THAT', qty: 50, unit: 'thùng' },
    { no: 'DVT-QA-2026-005', project: p3, status: 'APPROVED', item: 'QA-GACH-THIEN-TAN', qty: 10000, unit: 'viên' },
    { no: 'DVT-QA-2026-006', project: p3, status: 'SUBMITTED', item: 'QA-XI-MANG', qty: 150, unit: 'bao' },
    { no: 'DVT-QA-2026-007', project: p1, status: 'REVISION_REQUESTED', item: 'QA-CAT-VANG-01', qty: 50, unit: 'm3' },
    { no: 'DVT-QA-2026-008', project: p2, status: 'CANCELLED', item: 'QA-COP-PHA', qty: 20, unit: 'bộ' },
  ];

  for (const prop of proposalDefs) {
    const itemId = createdItems[`${prop.project.id}:${prop.item}`];
    await prisma.materialProposal.create({
      data: {
        proposalNo: prop.no,
        projectId: prop.project.id,
        projectNameSnapshot: prop.project.name,
        requestedById: adminUser.id,
        requesterNameSnapshot: adminUser.name,
        requesterRoleSnapshot: adminUser.role,
        proposalDate: new Date(Date.now() - 86400000 * 2),
        purchaseReason: 'Cấp vật tư phục vụ tiến độ thi công QA',
        requiredDeliveryDate: new Date(Date.now() + 86400000 * 7),
        status: prop.status as any,
        items: {
          create: [
            {
              sequence: 1,
              materialItemId: itemId || null,
              materialCodeSnapshot: prop.item,
              materialName: prop.item,
              unit: prop.unit,
              actualQuantity: prop.qty,
              note: 'Hàng chất lượng cao',
            },
          ],
        },
      },
    });
  }

  console.log(`Created ${proposalDefs.length} QA proposals.`);
  console.log('=== QA FIXTURES SEEDING COMPLETED SUCCESSFULLY ===');
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
