import prisma from '../src/lib/prisma';
import { applyMaterialMovement } from '../src/lib/materials/ledger';

async function main() {
  console.log('--- QA: MATERIAL ARCHIVE POLICY ---');
  let hasErrors = false;

  const project = await prisma.project.findFirst();
  if (!project) return;

  try {
    await prisma.$transaction(async (tx) => {
      const material = await tx.materialItem.create({
        data: {
          projectId: project.id,
          code: 'TEST-ARCHIVE-1',
          name: 'Test Archive',
          unit: 'kg',
          isActive: false, // Archived
        }
      });

      let threw = false;
      try {
        await applyMaterialMovement(tx, {
          projectId: project.id,
          materialItemId: material.id,
          type: 'IMPORT',
          quantity: 10,
          movementDate: new Date(),
        });
      } catch (err: any) {
        threw = true;
        if (!err.message.includes('đã lưu trữ')) {
          console.error('[FAIL] Error message incorrect:', err.message);
          hasErrors = true;
        }
      }

      if (!threw) {
        console.error('[FAIL] Allowed movement on archived material!');
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
    console.error('\n[FINAL RESULT] NO-GO: Archive policy failed.');
    process.exit(1);
  } else {
    console.log('\n[FINAL RESULT] GO: Archive policy passes.');
    process.exit(0);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
