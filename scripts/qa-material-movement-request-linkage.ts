import prisma from '../src/lib/prisma';

async function main() {
  console.log('--- QA: MATERIAL MOVEMENT REQUEST LINKAGE ---');
  let hasErrors = false;

  const movements = await prisma.materialMovement.findMany({
    where: { materialRequestItemId: { not: null } },
    include: { materialRequestItem: { include: { materialRequest: true } } },
  });

  for (const mov of movements) {
    if (!mov.materialRequestItem) {
      console.error(`[FAIL] Movement ${mov.id} has materialRequestItemId but item not found.`);
      hasErrors = true;
      continue;
    }

    if (mov.projectId !== mov.materialRequestItem.materialRequest.projectId) {
      console.error(`[FAIL] Movement ${mov.id} projectId mismatch with Request.`);
      hasErrors = true;
    }
    
    if (mov.materialRequestId !== mov.materialRequestItem.materialRequestId) {
      console.error(`[FAIL] Movement ${mov.id} materialRequestId mismatch.`);
      hasErrors = true;
    }
  }

  // Check issued quantity
  const requestItems = await prisma.materialRequestItem.findMany({
    include: { movements: true },
  });

  for (const item of requestItems) {
    const totalExported = item.movements
      .filter(m => m.type === 'EXPORT')
      .reduce((sum, m) => sum + Number(m.quantity), 0);

    // Some items might not enforce this perfectly if legacy, but let's check it.
    if (totalExported > Number(item.requestedQuantity)) {
      console.error(`[FAIL] RequestItem ${item.id} has total exported (${totalExported}) > requested (${item.requestedQuantity})`);
      hasErrors = true;
    }
  }

  if (hasErrors) {
    console.error('\n[FINAL RESULT] NO-GO: Movement linkage errors.');
    process.exit(1);
  } else {
    console.log('\n[FINAL RESULT] GO: Movement linkage passes.');
    process.exit(0);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
