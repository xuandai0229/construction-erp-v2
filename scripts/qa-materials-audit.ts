import 'dotenv/config';
import prisma from "../src/lib/prisma";

async function main() {
  console.log("=== KIỂM TRA DỮ LIỆU MATERIALS HIỆN CÓ ===\n");

  // Danh mục vật tư
  const totalMaterials = await prisma.materialItem.count();
  console.log(`- Tổng số vật tư: ${totalMaterials}`);

  const missingCode = await prisma.materialItem.count({ where: { code: "" } });
  console.log(`- Vật tư thiếu mã: ${missingCode}`);

  const missingName = await prisma.materialItem.count({ where: { name: "" } });
  console.log(`- Vật tư thiếu tên: ${missingName}`);

  const missingUnit = await prisma.materialItem.count({ where: { unit: "" } });
  console.log(`- Vật tư thiếu đơn vị tính: ${missingUnit}`);

  // Tìm duplicate code in same project
  const duplicateCodes = await prisma.materialItem.groupBy({
    by: ['projectId', 'code'],
    having: { code: { _count: { gt: 1 } } }
  });
  console.log(`- Vật tư trùng mã (trong cùng project): ${duplicateCodes.length}`);

  // Tìm duplicate name in same project with same unit
  const duplicateNames = await prisma.materialItem.groupBy({
    by: ['projectId', 'name', 'unit'],
    having: { name: { _count: { gt: 1 } } }
  });
  console.log(`- Vật tư trùng tên & đơn vị (trong cùng project): ${duplicateNames.length}`);

  const testDataCount = await prisma.materialItem.count({
    where: {
      OR: [
        { code: { startsWith: 'QA_MATERIALS_' } },
        { name: { startsWith: 'QA_MATERIALS_' } }
      ]
    }
  });
  console.log(`- Dữ liệu rác prefix QA_MATERIALS_ (MaterialItem): ${testDataCount}`);

  // Yêu cầu vật tư (MaterialRequest)
  console.log("\n--- Yêu Cầu Vật Tư ---");
  const totalReqs = await prisma.materialRequest.count();
  console.log(`- Tổng số phiếu yêu cầu: ${totalReqs}`);

  const reqStatus = await prisma.materialRequest.groupBy({
    by: ['status'],
    _count: true
  });
  console.log("- Phiếu theo status:");
  reqStatus.forEach(r => console.log(`  + ${r.status}: ${r._count}`));

  const missingReqProj = await prisma.materialRequest.count({ where: { projectId: "" } });
  console.log(`- Phiếu thiếu projectId: ${missingReqProj}`);

  const futureReqDate = await prisma.materialRequest.count({ where: { requestDate: { gt: new Date() } } });
  console.log(`- Phiếu có ngày tương lai: ${futureReqDate}`);

  // Tồn kho & Giao dịch
  console.log("\n--- Tồn Kho & Giao Dịch ---");
  const importCount = await prisma.materialMovement.count({ where: { type: 'IMPORT' } });
  console.log(`- Tổng số transaction nhập: ${importCount}`);
  
  const exportCount = await prisma.materialMovement.count({ where: { type: 'EXPORT' } });
  console.log(`- Tổng số transaction xuất: ${exportCount}`);

  const negTransactions = await prisma.materialMovement.count({ where: { quantity: { lte: 0 } } });
  console.log(`- Transaction quantity <= 0: ${negTransactions}`);

  const negStocks = await prisma.projectMaterialStock.count({ where: { stock: { lt: 0 } } });
  console.log(`- Tồn âm (ProjectMaterialStock): ${negStocks}`);

  console.log("\n=> Hoàn tất kiểm tra dữ liệu.");
}

main().catch(err => {
  console.error("LỖI:", err);
});
