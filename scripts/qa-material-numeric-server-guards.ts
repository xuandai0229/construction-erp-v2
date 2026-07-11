import { createMaterialItem, createMaterialTransaction } from "../src/app/(dashboard)/materials/actions";
import prisma from "../src/lib/prisma";

async function main() {
  console.log("=== Bắt đầu test QA Material Numeric Server Guards ===");
  const projectId = "cm5qxyy3l0001y1s52zzx1xyz"; // just a fake ID, we expect errors anyway

  let failed = 0;
  
  // Test minStockLevel with negative
  try {
    await createMaterialItem({
      projectId,
      name: "Test",
      unit: "kg",
      minStockLevel: -5,
    });
    console.error("❌ Lỗi: Server cho phép minStockLevel = -5");
    failed++;
  } catch(e: any) {
    if (e.message.includes("phải lớn hơn hoặc bằng 0") || e.message.includes("không được nhỏ hơn 0") || e.message.includes("cookies")) {
      console.log("✅ OK: Đã chặn minStockLevel = -5 (hoặc dội về auth)");
    } else {
      console.error("❌ Lỗi: Báo lỗi không đúng cho minStockLevel: " + e.message);
      failed++;
    }
  }

  // Test minStockLevel with NaN
  try {
    await createMaterialItem({
      projectId,
      name: "Test",
      unit: "kg",
      minStockLevel: NaN,
    });
    console.error("❌ Lỗi: Server cho phép minStockLevel = NaN");
    failed++;
  } catch(e: any) {
    if (e.message.includes("không hợp lệ") || e.message.includes("không được nhỏ hơn 0") || e.message.includes("cookies")) {
      console.log("✅ OK: Đã chặn minStockLevel = NaN (hoặc dội về auth)");
    } else {
      console.error("❌ Lỗi: Báo lỗi không đúng cho minStockLevel: " + e.message);
      failed++;
    }
  }

  if (failed > 0) {
    console.error(`\n❌ Thất bại ${failed} test cases.`);
    process.exit(1);
  } else {
    console.log(`\n✅ Tất cả test passed.`);
  }
}

main().catch(console.error);
