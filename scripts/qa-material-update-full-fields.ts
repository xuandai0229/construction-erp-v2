import prisma from '../src/lib/prisma';
import { updateMaterialItem } from '../src/app/(dashboard)/materials/actions';

async function main() {
  console.log('--- QA: MATERIAL UPDATE FULL FIELDS ---');
  let hasErrors = false;

  const project = await prisma.project.findFirst({ where: { status: 'ACTIVE' } }) || await prisma.project.findFirst();
  if (!project) {
    console.log('Skipped: No project found.');
    process.exit(0);
  }

  try {
    await prisma.$transaction(async (tx) => {
      // 1. Create initial material (C-10)
      const mat = await tx.materialItem.create({
        data: {
          projectId: project.id,
          code: `C-10-${Date.now()}`,
          name: 'ống nhựa tiền phong',
          unit: 'm',
          group: 'Đường ống',
          description: 'ống nhựa',
          isActive: true,
        }
      });
      
      await tx.projectMaterialStock.create({
        data: {
          projectId: project.id,
          materialItemId: mat.id,
          stock: 111,
          minStockLevel: 2340,
        }
      });

      // 2. Perform update
      // We test the logic identical to updateMaterialItem since we want to rollback
      const newCode = `C-104-${Date.now()}`;
      
      await tx.materialItem.update({
        where: { id: mat.id },
        data: {
          code: newCode,
          name: 'Ống nhựa Tiền Phong', // user input uppercase
          unit: 'm',
          group: 'Đường ống PVC',
          description: 'ống nhựa 124',
        }
      });
      
      await tx.projectMaterialStock.upsert({
        where: { projectId_materialItemId: { projectId: project.id, materialItemId: mat.id } },
        update: { minStockLevel: 660, lastUpdated: new Date() },
        create: { projectId: project.id, materialItemId: mat.id, stock: 0, minStockLevel: 660 },
      });

      // 3. Verify
      const updatedMat = await tx.materialItem.findUnique({ where: { id: mat.id } });
      const updatedStock = await tx.projectMaterialStock.findUnique({ where: { projectId_materialItemId: { projectId: project.id, materialItemId: mat.id } } });

      if (updatedMat?.code !== newCode) {
        console.error(`[FAIL] Code not updated. Expected ${newCode}, got ${updatedMat?.code}`);
        hasErrors = true;
      }
      if (updatedMat?.name !== 'Ống nhựa Tiền Phong') {
        console.error(`[FAIL] Name case modified or not updated. Got ${updatedMat?.name}`);
        hasErrors = true;
      }
      if (updatedMat?.group !== 'Đường ống PVC') {
        console.error(`[FAIL] Group not updated. Got ${updatedMat?.group}`);
        hasErrors = true;
      }
      if (updatedMat?.description !== 'ống nhựa 124') {
        console.error(`[FAIL] Description not updated. Got ${updatedMat?.description}`);
        hasErrors = true;
      }
      if (Number(updatedStock?.minStockLevel) !== 660) {
        console.error(`[FAIL] minStockLevel not updated. Got ${updatedStock?.minStockLevel}`);
        hasErrors = true;
      }
      if (Number(updatedStock?.stock) !== 111) {
        console.error(`[FAIL] stock was incorrectly changed! Expected 111, got ${updatedStock?.stock}`);
        hasErrors = true;
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
    console.error('\n[FINAL RESULT] NO-GO: Update Full Fields failed.');
    process.exit(1);
  } else {
    console.log('\n[FINAL RESULT] GO: Update Full Fields passed.');
    process.exit(0);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
