import prisma from '../src/lib/prisma';
import { getStockStatus } from '../src/components/materials/materials-formatters';

const TARGET_PROJECT_ID = "cmr5p2iwm0009r4wk51lwxhjy";

async function main() {
  const stocks = await prisma.projectMaterialStock.findMany({
    where: { projectId: TARGET_PROJECT_ID },
    include: { materialItem: true }
  });

  const counts = {
    all: stocks.length,
    active: 0,
    archived: 0,
    healthy: 0,
    low: 0,
    out: 0,
    negative: 0,
  };

  const lowActiveItems: string[] = [];

  for (const stock of stocks) {
    const isActive = stock.materialItem.isActive;
    const stockVal = Number(stock.stock);
    const minVal = Number(stock.minStockLevel);
    const status = getStockStatus(stockVal, minVal);

    if (isActive) {
      counts.active++;
      if (status === "healthy") counts.healthy++;
      if (status === "low") {
        counts.low++;
        lowActiveItems.push(stock.materialItem.code);
      }
      if (status === "out") counts.out++;
      if (status === "negative") counts.negative++;
    } else {
      counts.archived++;
    }
  }

  console.log("=== KIỂM TRA KPI UI TỒN KHO ===");
  console.log(`ProjectId: ${TARGET_PROJECT_ID}`);
  console.log(`Tổng số: ${counts.all}`);
  console.log(`Active: ${counts.active}`);
  console.log(`Archived: ${counts.archived}`);
  console.log(`- Đủ hàng (Active): ${counts.healthy}`);
  console.log(`- Sắp hết (Active): ${counts.low}`);
  console.log(`- Hết hàng (Active): ${counts.out}`);
  console.log(`- Âm kho (Active): ${counts.negative}`);
  console.log(`Danh sách Sắp hết (Active): ${lowActiveItems.join(", ")}`);

  let fail = false;
  if (counts.active !== 10) {
    console.error(`[FAIL] Kỳ vọng Active = 10, thực tế = ${counts.active}`);
    fail = true;
  }
  if (counts.low !== 2) {
    console.error(`[FAIL] Kỳ vọng Sắp hết (Active) = 2, thực tế = ${counts.low}`);
    fail = true;
  }

  if (fail) {
    console.error("=== KẾT QUẢ: FAIL ===");
    process.exit(1);
  } else {
    console.log("=== KẾT QUẢ: PASS ===");
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
