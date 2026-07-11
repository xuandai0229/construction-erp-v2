import prisma from '../src/lib/prisma';
import { applyMaterialMovement } from '../src/lib/materials/ledger';

async function main() {
  console.log('--- QA: MATERIAL USER FRIENDLY ERRORS ---');
  let hasErrors = false;

  const project = await prisma.project.findFirst({ where: { status: 'ACTIVE' } }) || await prisma.project.findFirst();
  if (!project) {
    console.log('Skipped: No project found.');
    process.exit(0);
  }

  try {
    await prisma.$transaction(async (tx) => {
      const mat = await tx.materialItem.create({
        data: {
          projectId: project.id,
          code: `ERR-10-${Date.now()}`,
          name: 'Vật tư test lỗi',
          unit: 'kg',
          isActive: true,
        }
      });
      
      await tx.projectMaterialStock.create({
        data: {
          projectId: project.id,
          materialItemId: mat.id,
          stock: 10,
          minStockLevel: 0,
        }
      });

      // Test 1: Xuất quá tồn -> "Số lượng xuất vượt quá tồn kho hiện tại"
      try {
        await applyMaterialMovement(tx, {
          projectId: project.id,
          materialItemId: mat.id,
          type: 'EXPORT',
          quantity: 20,
          movementDate: new Date(),
        });
        console.error('[FAIL] Expected error when exporting > stock');
        hasErrors = true;
      } catch (err: any) {
        if (!err.message.includes('Số lượng xuất vượt quá tồn kho hiện tại')) {
          console.error('[FAIL] Expected friendly error for exporting > stock, got:', err.message);
          hasErrors = true;
        }
      }

      // Test 2: Vật tư lưu trữ -> "Vật tư đã lưu trữ, không thể tạo giao dịch mới"
      await tx.materialItem.update({ where: { id: mat.id }, data: { isActive: false } });
      try {
        await applyMaterialMovement(tx, {
          projectId: project.id,
          materialItemId: mat.id,
          type: 'IMPORT',
          quantity: 5,
          movementDate: new Date(),
        });
        console.error('[FAIL] Expected error when importing archived material');
        hasErrors = true;
      } catch (err: any) {
        if (!err.message.includes('Vật tư đã lưu trữ')) {
          console.error('[FAIL] Expected friendly error for archived material, got:', err.message);
          hasErrors = true;
        }
      }

      throw new Error('ROLLBACK_TEST');
    });
  } catch (err: any) {
    if (err.message !== 'ROLLBACK_TEST') {
      console.error(err);
      hasErrors = true;
    }
  }

  if (hasErrors) {
    console.error('\n[FINAL RESULT] NO-GO: Friendly errors failed.');
    process.exit(1);
  } else {
    console.log('\n[FINAL RESULT] GO: Friendly errors passed.');
    process.exit(0);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
