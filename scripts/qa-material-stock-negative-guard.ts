import prisma from '../src/lib/prisma';
import { applyMaterialMovement } from '../src/lib/materials/ledger';

async function main() {
  console.log('--- QA: MATERIAL STOCK NEGATIVE GUARD ---');
  let hasErrors = false;

  const project = await prisma.project.findFirst();
  const material = await prisma.materialItem.findFirst({ where: { isActive: true, projectId: project?.id } });

  if (!project || !material) {
    console.log('No project or material found to test. Skipping.');
    process.exit(0);
  }

  try {
    await prisma.$transaction(async (tx) => {
      // Add stock
      await applyMaterialMovement(tx, {
        projectId: project.id,
        materialItemId: material.id,
        type: 'IMPORT',
        quantity: 10,
        movementDate: new Date(),
      });

      // Try export more than stock
      let threw = false;
      try {
        await applyMaterialMovement(tx, {
          projectId: project.id,
          materialItemId: material.id,
          type: 'EXPORT',
          quantity: 100, // Assuming stock < 100 after 10 imported. We might need a larger number if stock is huge.
          movementDate: new Date(),
        });
      } catch (err: any) {
        threw = true;
        if (!err.message.includes('vượt quá tồn kho')) {
          console.error('[FAIL] Error message incorrect:', err.message);
          hasErrors = true;
        }
      }

      if (!threw) {
        console.error('[FAIL] Allowed negative stock!');
        hasErrors = true;
      }

      // Rollback
      throw new Error('ROLLBACK_TEST');
    });
  } catch (err: any) {
    if (err.message !== 'ROLLBACK_TEST') {
      console.error(err);
      hasErrors = true;
    }
  }

  if (hasErrors) {
    console.error('\n[FINAL RESULT] NO-GO: Negative stock guard failed.');
    process.exit(1);
  } else {
    console.log('\n[FINAL RESULT] GO: Negative stock guard passes.');
    process.exit(0);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
