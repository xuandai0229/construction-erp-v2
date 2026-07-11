import prisma from '../src/lib/prisma';

const TARGET_PROJECT_ID = "cmr5p2iwm0009r4wk51lwxhjy";

async function main() {
  const project = await prisma.project.findUnique({ where: { id: TARGET_PROJECT_ID } });
  if (!project) {
    console.error(`[FAIL] Không tìm thấy project ID: ${TARGET_PROJECT_ID}`);
    process.exit(1);
  }

  console.log("=== BẮT ĐẦU LEDGER RECONCILIATION ===");
  console.log(`[INFO] Project: ${project.name}`);
  console.log(`[INFO] ProjectId: ${project.id}`);

  let failCount = 0;

  const stocks = await prisma.projectMaterialStock.findMany({
    where: { projectId: TARGET_PROJECT_ID },
    include: { materialItem: true },
    orderBy: { materialItem: { code: "asc" } }
  });

  console.log(`Kiểm tra ${stocks.length} stock records...`);
  console.log();

  const header = [
    "CODE".padEnd(15),
    "NAME".padEnd(28),
    "ACTIVE".padEnd(8),
    "DB_STOCK".padEnd(10),
    "IMPORT".padEnd(10),
    "EXPORT".padEnd(10),
    "CALC".padEnd(10),
    "DIFF"
  ].join(" | ");
  const sep = "".padEnd(header.length + 4, "-");

  console.log(sep);
  console.log(header);
  console.log(sep);

  for (const stock of stocks) {
    const materialId = stock.materialItemId;

    const movements = await prisma.materialMovement.findMany({
      where: { projectId: TARGET_PROJECT_ID, materialItemId: materialId }
    });

    let totalImport = 0;
    let totalExport = 0;

    for (const mov of movements) {
      const q = Number(mov.quantity);
      if (["IMPORT", "RETURN"].includes(mov.type)) {
        totalImport += q;
      } else {
        // EXPORT, TRANSFER, LOST, CONSUMED, etc.
        totalExport += q;
      }
    }

    const calculatedStock = totalImport - totalExport;
    const actualStock = Number(stock.stock);
    const diff = Math.round((calculatedStock - actualStock) * 10000) / 10000;

    const tag = Math.abs(diff) > 0.001 ? "[FAIL]" : "[PASS]";
    if (Math.abs(diff) > 0.001) failCount++;

    const row = [
      stock.materialItem.code.padEnd(15),
      stock.materialItem.name.padEnd(28).slice(0, 28),
      String(stock.materialItem.isActive).padEnd(8),
      actualStock.toString().padEnd(10),
      totalImport.toString().padEnd(10),
      totalExport.toString().padEnd(10),
      calculatedStock.toString().padEnd(10),
      diff.toString()
    ].join(" | ");
    console.log(`${tag} ${row}`);
  }

  console.log(sep);
  console.log();

  if (failCount === 0) {
    console.log(`[PASS] Toàn bộ ${stocks.length} vật tư: sổ cái khớp 100% với tồn kho DB.`);
  } else {
    console.error(`[FAIL] Phát hiện ${failCount}/${stocks.length} vật tư bị lệch sổ cái!`);
    process.exit(1);
  }
  console.log("=== KẾT THÚC ===");
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
