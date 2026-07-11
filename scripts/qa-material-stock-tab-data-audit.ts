import prisma from '../src/lib/prisma';
import { getStockStatus } from '../src/components/materials/materials-formatters';

const TARGET_PROJECT_ID = "cmr5p2iwm0009r4wk51lwxhjy";

async function main() {
  const project = await prisma.project.findUnique({ where: { id: TARGET_PROJECT_ID } });
  if (!project) {
    console.error(`[FAIL] Không tìm thấy project ID: ${TARGET_PROJECT_ID}`);
    process.exit(1);
  }

  console.log("=== BẮT ĐẦU AUDIT DỮ LIỆU TỒN KHO ===");
  console.log(`[INFO] Project: ${project.name}`);
  console.log(`[INFO] ProjectId: ${project.id}`);
  console.log();

  // Fetch all stocks with materialItem and related data
  const stocks = await prisma.projectMaterialStock.findMany({
    where: { projectId: TARGET_PROJECT_ID },
    include: {
      materialItem: {
        include: {
          movements: { where: { projectId: TARGET_PROJECT_ID }, select: { id: true }, take: 1 },
        }
      }
    },
    orderBy: { materialItem: { code: "asc" } }
  });

  // For each stock, check if there's a MaterialRequestItem referencing this material's code
  const allMaterialCodes = stocks.map(s => s.materialItem.code);
  const requestItemCounts = await prisma.materialRequestItem.groupBy({
    by: ["materialCode"],
    where: {
      materialCode: { in: allMaterialCodes },
      materialRequest: { projectId: TARGET_PROJECT_ID }
    },
    _count: { id: true }
  });
  const requestCountMap = new Map(requestItemCounts.map(r => [r.materialCode, r._count.id]));

  // Print table
  const header = [
    "CODE".padEnd(15),
    "NAME".padEnd(28),
    "ACTIVE".padEnd(8),
    "STOCK".padEnd(10),
    "MIN".padEnd(10),
    "STATUS".padEnd(10),
    "HAS_MOV".padEnd(9),
    "HAS_REQ"
  ].join(" | ");
  const sep = "".padEnd(header.length + 4, "-");

  console.log("[BẢNG CHI TIẾT TỒN KHO]");
  console.log(sep);
  console.log(header);
  console.log(sep);

  const archivedWithStock: typeof stocks = [];
  let activeCount = 0;
  let archivedCount = 0;

  for (const stock of stocks) {
    const item = stock.materialItem;
    const stockVal = Number(stock.stock);
    const minVal = Number(stock.minStockLevel);
    const status = getStockStatus(stockVal, minVal);
    const hasMov = item.movements.length > 0 ? "YES" : "NO";
    const hasReq = (requestCountMap.get(item.code) || 0) > 0 ? "YES" : "NO";

    if (item.isActive) activeCount++;
    else archivedCount++;

    if (!item.isActive && stockVal > 0) {
      archivedWithStock.push(stock);
    }

    const row = [
      item.code.padEnd(15),
      item.name.padEnd(28).slice(0, 28),
      String(item.isActive).padEnd(8),
      stockVal.toString().padEnd(10),
      minVal.toString().padEnd(10),
      status.padEnd(10),
      hasMov.padEnd(9),
      hasReq
    ].join(" | ");
    console.log(row);
  }
  console.log(sep);

  console.log();
  console.log("[TỔNG KẾT]");
  console.log(`  Tổng stock records: ${stocks.length}`);
  console.log(`  Active: ${activeCount}`);
  console.log(`  Archived: ${archivedCount}`);

  // Archived with stock > 0
  if (archivedWithStock.length > 0) {
    console.log();
    console.log(`[WARN] CÓ ${archivedWithStock.length} VẬT TƯ ARCHIVED CÒN TỒN KHO > 0:`);
    for (const s of archivedWithStock) {
      console.log(`  - ${s.materialItem.name} (${s.materialItem.code}): Tồn ${Number(s.stock)}`);
    }
  } else {
    console.log(`[PASS] Không có vật tư Archived nào còn tồn kho > 0.`);
  }

  // Orphaned MaterialItem (no stock record)
  const orphanedItems = await prisma.materialItem.findMany({
    where: { projectId: TARGET_PROJECT_ID, projectStocks: { none: {} } },
    select: { code: true, name: true }
  });
  if (orphanedItems.length > 0) {
    console.log(`[WARN] Có ${orphanedItems.length} vật tư không có stock record:`);
    orphanedItems.forEach(i => console.log(`  - ${i.name} (${i.code})`));
  } else {
    console.log(`[PASS] Tất cả MaterialItem đều có ProjectMaterialStock.`);
  }

  // Negative stock
  const negativeStocks = stocks.filter(s => Number(s.stock) < 0);
  if (negativeStocks.length > 0) {
    console.log(`[FAIL] Có ${negativeStocks.length} tồn kho âm!`);
    process.exit(1);
  } else {
    console.log(`[PASS] Không có tồn kho âm.`);
  }

  // Negative minStockLevel
  const negativeMin = stocks.filter(s => Number(s.minStockLevel) < 0);
  if (negativeMin.length > 0) {
    console.log(`[FAIL] Có ${negativeMin.length} minStockLevel âm!`);
    process.exit(1);
  } else {
    console.log(`[PASS] Không có minStockLevel âm.`);
  }

  console.log();
  console.log("=== KẾT THÚC AUDIT ===");
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
