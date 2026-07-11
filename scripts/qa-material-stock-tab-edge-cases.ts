import prisma from '../src/lib/prisma';
import { applyMaterialMovement } from '../src/lib/materials/ledger';

const TARGET_PROJECT_ID = "cmr5p2iwm0009r4wk51lwxhjy";
const TEST_PREFIX = "TEST_EDGE_";

async function cleanup() {
  // Clean up test MaterialRequests first (cascade deletes items)
  await prisma.materialRequest.deleteMany({
    where: { projectId: TARGET_PROJECT_ID, requestNo: { startsWith: `REQ-${TEST_PREFIX}` } }
  });
  // Clean up any leftover test data from previous runs
  const testItems = await prisma.materialItem.findMany({
    where: { projectId: TARGET_PROJECT_ID, code: { startsWith: TEST_PREFIX } },
    select: { id: true }
  });
  const testIds = testItems.map(i => i.id);
  if (testIds.length > 0) {
    await prisma.materialMovement.deleteMany({ where: { materialItemId: { in: testIds } } });
    await prisma.projectMaterialStock.deleteMany({ where: { materialItemId: { in: testIds } } });
    await prisma.materialItem.deleteMany({ where: { id: { in: testIds } } });
  }
}

async function createTestMaterial(code: string, name: string, stock: number, opts?: { createMovement?: boolean; createRequestItem?: boolean }) {
  const item = await prisma.materialItem.create({
    data: {
      projectId: TARGET_PROJECT_ID,
      code,
      name,
      unit: "cái",
      projectStocks: {
        create: { projectId: TARGET_PROJECT_ID, stock, minStockLevel: 0 }
      }
    }
  });

  if (opts?.createMovement) {
    if (stock === 0) {
      // Nhập 10, xuất 10
      await prisma.materialMovement.createMany({
        data: [
          {
            projectId: TARGET_PROJECT_ID,
            materialItemId: item.id,
            type: "IMPORT",
            quantity: 10,
            movementDate: new Date(),
            materialCodeSnapshot: code,
            materialNameSnapshot: name,
            unitSnapshot: "cái",
          },
          {
            projectId: TARGET_PROJECT_ID,
            materialItemId: item.id,
            type: "EXPORT",
            quantity: 10,
            movementDate: new Date(),
            materialCodeSnapshot: code,
            materialNameSnapshot: name,
            unitSnapshot: "cái",
          }
        ]
      });
    } else {
      await prisma.materialMovement.create({
        data: {
          projectId: TARGET_PROJECT_ID,
          materialItemId: item.id,
          type: "IMPORT",
          quantity: stock,
          movementDate: new Date(),
          materialCodeSnapshot: code,
          materialNameSnapshot: name,
          unitSnapshot: "cái",
        }
      });
    }
  }

  if (opts?.createRequestItem) {
    // Need a MaterialRequest first — need a valid user for requestedById
    const anyUser = await prisma.user.findFirst();
    if (!anyUser) {
      console.warn("[WARN] Không có user nào trong DB để tạo MaterialRequest test. Bỏ qua createRequestItem.");
    } else {
      await prisma.materialRequest.create({
        data: {
          projectId: TARGET_PROJECT_ID,
          requestNo: `REQ-${code}-${Date.now()}`,
          status: "DRAFT",
          requestedById: anyUser.id,
          requestDate: new Date(),
          items: {
            create: {
              materialCode: code,
              materialName: name,
              unit: "cái",
              requestedQuantity: 1,
            }
          }
        }
      });
    }
  }

  return item;
}

async function main() {
  console.log("=== KIỂM TRA EDGE CASES TAB TỒN KHO ===");
  console.log(`[INFO] ProjectId: ${TARGET_PROJECT_ID}`);
  console.log();

  await cleanup();

  let passed = 0;
  let failed = 0;

  const assert = (label: string, condition: boolean) => {
    if (condition) {
      console.log(`[PASS] ${label}`);
      passed++;
    } else {
      console.error(`[FAIL] ${label}`);
      failed++;
    }
  };

  try {
    // ================================================================
    console.log("--- PHẦN A: Business Logic (Prisma Simulation) ---");
    console.log();

    // Case 1: Active material có stock > 0 khi xóa → archive
    console.log("Case 1: Active + stock > 0 → phải Soft Delete (archive)");
    const mat1 = await createTestMaterial(`${TEST_PREFIX}1`, "Vật tư có tồn", 50);
    // Simulate deleteMaterialItem logic
    const mov1Count = await prisma.materialMovement.count({ where: { materialItemId: mat1.id } });
    const stock1 = await prisma.projectMaterialStock.findUnique({
      where: { projectId_materialItemId: { projectId: TARGET_PROJECT_ID, materialItemId: mat1.id } }
    });
    const req1Count = await prisma.materialRequestItem.count({
      where: { materialCode: mat1.code, materialRequest: { projectId: TARGET_PROJECT_ID } }
    });
    const shouldArchive1 = mov1Count > 0 || (stock1 && Number(stock1.stock) > 0) || req1Count > 0;
    if (shouldArchive1) {
      await prisma.materialItem.update({ where: { id: mat1.id }, data: { isActive: false } });
    }
    const check1 = await prisma.materialItem.findUnique({ where: { id: mat1.id } });
    assert("Active + stock > 0 → archived (không hard delete)", !!check1 && !check1.isActive);

    // Case 2: Active + stock = 0 nhưng có movement → archive
    console.log("Case 2: Active + stock = 0 + có movement → phải Soft Delete");
    const mat2 = await createTestMaterial(`${TEST_PREFIX}2`, "Vật tư đã xuất hết", 0, { createMovement: true });
    const mov2Count = await prisma.materialMovement.count({ where: { materialItemId: mat2.id } });
    const stock2 = await prisma.projectMaterialStock.findUnique({
      where: { projectId_materialItemId: { projectId: TARGET_PROJECT_ID, materialItemId: mat2.id } }
    });
    const req2Count = await prisma.materialRequestItem.count({
      where: { materialCode: mat2.code, materialRequest: { projectId: TARGET_PROJECT_ID } }
    });
    const shouldArchive2 = mov2Count > 0 || (stock2 && Number(stock2.stock) > 0) || req2Count > 0;
    if (shouldArchive2) {
      await prisma.materialItem.update({ where: { id: mat2.id }, data: { isActive: false } });
    } else {
      await prisma.$transaction([
        prisma.projectMaterialStock.deleteMany({ where: { materialItemId: mat2.id } }),
        prisma.materialItem.delete({ where: { id: mat2.id } })
      ]);
    }
    const check2 = await prisma.materialItem.findUnique({ where: { id: mat2.id } });
    assert("Active + stock=0 + movement → archived (không hard delete)", !!check2 && !check2.isActive);

    // Case 3: Active + stock = 0 + có MaterialRequestItem → archive
    console.log("Case 3: Active + stock = 0 + có request → phải Soft Delete");
    const mat3 = await createTestMaterial(`${TEST_PREFIX}3`, "Vật tư có yêu cầu", 0, { createRequestItem: true });
    const mov3Count = await prisma.materialMovement.count({ where: { materialItemId: mat3.id } });
    const stock3 = await prisma.projectMaterialStock.findUnique({
      where: { projectId_materialItemId: { projectId: TARGET_PROJECT_ID, materialItemId: mat3.id } }
    });
    const req3Count = await prisma.materialRequestItem.count({
      where: { materialCode: mat3.code, materialRequest: { projectId: TARGET_PROJECT_ID } }
    });
    const shouldArchive3 = mov3Count > 0 || (stock3 && Number(stock3.stock) > 0) || req3Count > 0;
    if (shouldArchive3) {
      await prisma.materialItem.update({ where: { id: mat3.id }, data: { isActive: false } });
    } else {
      await prisma.$transaction([
        prisma.projectMaterialStock.deleteMany({ where: { materialItemId: mat3.id } }),
        prisma.materialItem.delete({ where: { id: mat3.id } })
      ]);
    }
    const check3 = await prisma.materialItem.findUnique({ where: { id: mat3.id } });
    assert("Active + stock=0 + request → archived (không hard delete)", !!check3 && !check3.isActive);

    // Case 4: Active + hoàn toàn trống → hard delete
    console.log("Case 4: Active + hoàn toàn trống → Hard Delete");
    const mat4 = await createTestMaterial(`${TEST_PREFIX}4`, "Vật tư rỗng", 0);
    const mov4Count = await prisma.materialMovement.count({ where: { materialItemId: mat4.id } });
    const stock4 = await prisma.projectMaterialStock.findUnique({
      where: { projectId_materialItemId: { projectId: TARGET_PROJECT_ID, materialItemId: mat4.id } }
    });
    const req4Count = await prisma.materialRequestItem.count({
      where: { materialCode: mat4.code, materialRequest: { projectId: TARGET_PROJECT_ID } }
    });
    const shouldArchive4 = mov4Count > 0 || (stock4 && Number(stock4.stock) > 0) || req4Count > 0;
    if (shouldArchive4) {
      await prisma.materialItem.update({ where: { id: mat4.id }, data: { isActive: false } });
    } else {
      await prisma.$transaction([
        prisma.projectMaterialStock.deleteMany({ where: { materialItemId: mat4.id } }),
        prisma.materialItem.delete({ where: { id: mat4.id } })
      ]);
    }
    const check4 = await prisma.materialItem.findUnique({ where: { id: mat4.id } });
    assert("Active + trống hoàn toàn → hard delete khỏi DB", check4 === null);

    // Case 5: Archived → restore → active
    console.log("Case 5: Archived → Khôi phục → Active lại");
    // Reuse mat1 which is now archived
    await prisma.materialItem.update({ where: { id: mat1.id }, data: { isActive: true } });
    const check5 = await prisma.materialItem.findUnique({ where: { id: mat1.id } });
    assert("Archived → restore → isActive=true", !!check5 && check5.isActive);

    // Case 6: Archived material không được nhập/xuất khi chưa restore
    console.log("Case 6: Archived material → chặn nhập/xuất kho");
    // Archive it again
    await prisma.materialItem.update({ where: { id: mat1.id }, data: { isActive: false } });
    let blockedExport = false;
    try {
      await prisma.$transaction(async (tx) => {
        await applyMaterialMovement(tx, {
          projectId: TARGET_PROJECT_ID,
          materialItemId: mat1.id,
          type: "EXPORT",
          quantity: 1,
          movementDate: new Date(),
        });
      });
    } catch (e: any) {
      if (e.message && e.message.includes("lưu trữ")) {
        blockedExport = true;
      } else {
        console.error(`  Lỗi không mong đợi: ${e.message}`);
      }
    }
    assert("Archived → chặn EXPORT với lỗi 'đã lưu trữ'", blockedExport);

    let blockedImport = false;
    try {
      await prisma.$transaction(async (tx) => {
        await applyMaterialMovement(tx, {
          projectId: TARGET_PROJECT_ID,
          materialItemId: mat1.id,
          type: "IMPORT",
          quantity: 1,
          movementDate: new Date(),
        });
      });
    } catch (e: any) {
      if (e.message && e.message.includes("lưu trữ")) {
        blockedImport = true;
      } else {
        console.error(`  Lỗi không mong đợi: ${e.message}`);
      }
    }
    assert("Archived → chặn IMPORT với lỗi 'đã lưu trữ'", blockedImport);

    // ================================================================
    console.log();
    console.log("--- PHẦN B: Server Action RBAC ---");
    console.log("[INFO] deleteMaterialItem() và restoreMaterialItem() yêu cầu Next.js cookies() context.");
    console.log("[INFO] Không thể gọi trực tiếp từ tsx CLI vì thiếu session/cookies runtime.");
    console.log("[INFO] RBAC chỉ mới code review, CHƯA E2E mutation test.");
    console.log("[INFO] Kết quả code review:");
    console.log("  - deleteMaterialItem: gọi requireSession() + requireProjectPermissions() + assertPermission('canDelete')");
    console.log("  - restoreMaterialItem: gọi requireSession() + requireProjectPermissions() + assertPermission('canUpdate')");
    console.log("  - applyMaterialMovement: không tự kiểm tra RBAC, phụ thuộc vào caller (createMaterialTransaction)");
    console.log("  - createMaterialTransaction: gọi requireSession() + requireProjectPermissions() + assertPermission('canImport'/'canExport')");
    console.log("[WARN] RBAC server-side: CHỈ CODE REVIEW, CHƯA TEST THẬT");

  } finally {
    // Cleanup
    await cleanup();
  }

  console.log();
  console.log(`=== KẾT QUẢ: ${passed} PASS, ${failed} FAIL ===`);
  if (failed > 0) process.exit(1);
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
