import prisma from '../src/lib/prisma';
import { applyMaterialMovement } from '../src/lib/materials/ledger';

async function main() {
  console.log('--- QA: MATERIAL TRANSACTION RUNTIME CREATE ---');
  let hasErrors = false;

  const project = await prisma.project.findFirst({ where: { status: 'ACTIVE' } }) || await prisma.project.findFirst();
  if (!project) {
    console.log('Skipped: No project found.');
    process.exit(0);
  }

  let material = await prisma.materialItem.findFirst({ where: { projectId: project.id, isActive: true } });
  if (!material) {
    material = await prisma.materialItem.create({
      data: {
        projectId: project.id,
        code: `TEST-MAT-${Date.now()}`,
        name: 'QA Test Material',
        unit: 'kg',
        isActive: true,
      }
    });
  }

  // Case A - Manual export
  try {
    await prisma.$transaction(async (tx) => {
      await applyMaterialMovement(tx, {
        projectId: project.id,
        materialItemId: material.id,
        type: 'IMPORT',
        quantity: 10,
        movementDate: new Date(),
      });
      
      const { movement } = await applyMaterialMovement(tx, {
        projectId: project.id,
        materialItemId: material.id,
        type: 'EXPORT',
        quantity: 1,
        movementDate: new Date(),
      });

      const modelFields = require('@prisma/client').Prisma.dmmf.datamodel.models.find((m: any) => m.name === "MaterialMovement")?.fields || [];
      const hasSnapshotFields = modelFields.some((f: any) => f.name === "materialCodeSnapshot");

      if (hasSnapshotFields && (!movement.materialCodeSnapshot || !movement.materialNameSnapshot || !movement.unitSnapshot)) {
        console.error('[FAIL] Case A: Snapshot fields are null despite schema support.');
        hasErrors = true;
      }

      throw new Error('ROLLBACK_TEST');
    });
  } catch (err: any) {
    if (err.message !== 'ROLLBACK_TEST') {
      console.error('[FAIL] Case A:', err);
      hasErrors = true;
    }
  }

  // Case B - Export by request item
  try {
    await prisma.$transaction(async (tx) => {
      const request = await tx.materialRequest.create({
        data: {
          projectId: project.id,
          requestNo: `TEST-REQ-${Date.now()}`,
          requestDate: new Date(),
          requestedById: (await tx.user.findFirst())!.id,
          status: 'APPROVED',
          items: {
            create: [{
              materialCode: material.code,
              materialName: material.name,
              unit: material.unit,
              requestedQuantity: 5,
              remainingQuantity: 5,
            }]
          }
        },
        include: { items: true }
      });
      
      const requestItem = request.items[0];

      await applyMaterialMovement(tx, {
        projectId: project.id,
        materialItemId: material.id,
        type: 'IMPORT',
        quantity: 10,
        movementDate: new Date(),
      });

      const { movement } = await applyMaterialMovement(tx, {
        projectId: project.id,
        materialItemId: material.id,
        materialRequestId: request.id,
        materialRequestItemId: requestItem.id,
        type: 'EXPORT',
        quantity: 2,
        movementDate: new Date(),
      });

      const updatedItem = await tx.materialRequestItem.findUnique({ where: { id: requestItem.id } });
      if (Number(updatedItem?.issuedQuantity) !== 2 || Number(updatedItem?.remainingQuantity) !== 3) {
        console.error('[FAIL] Case B: issued/remaining quantity not updated correctly.');
        hasErrors = true;
      }

      const modelFields = require('@prisma/client').Prisma.dmmf.datamodel.models.find((m: any) => m.name === "MaterialMovement")?.fields || [];
      const hasSnapshotFields = modelFields.some((f: any) => f.name === "materialCodeSnapshot");

      if (hasSnapshotFields) {
        if (movement.materialRequestId !== request.id || movement.materialRequestItemId !== requestItem.id) {
          console.error('[FAIL] Case B: movement FK linkage failed.');
          hasErrors = true;
        }
      }

      throw new Error('ROLLBACK_TEST');
    });
  } catch (err: any) {
    if (err.message !== 'ROLLBACK_TEST') {
      console.error('[FAIL] Case B:', err);
      hasErrors = true;
    }
  }

  if (hasErrors) {
    console.error('\n[FINAL RESULT] NO-GO: Runtime Create Failed.');
    process.exit(1);
  } else {
    console.log('\n[FINAL RESULT] GO: Runtime Create Passed.');
    process.exit(0);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
