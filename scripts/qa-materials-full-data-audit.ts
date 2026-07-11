import prisma from '../src/lib/prisma';

async function main() {
  console.log('--- QA: FULL DATA AUDIT ---');
  let hasErrors = false;

  const submittedRequests = await prisma.materialRequest.findMany({
    where: { status: 'SUBMITTED', deletedAt: null }
  });

  let missingApprovals = 0;
  for (const req of submittedRequests) {
    const approval = await prisma.approvalRequest.findFirst({
      where: {
        sourceType: 'MATERIAL_REQUEST',
        sourceId: req.id,
        deletedAt: null
      }
    });
    if (!approval) missingApprovals++;
  }

  if (missingApprovals > 0) {
    console.error(`[FAIL] Found ${missingApprovals} active SUBMITTED requests missing an approval request.`);
    hasErrors = true;
  } else {
    console.log('[PASS] All active SUBMITTED requests have an approval request.');
  }

  // 2. Negative stock
  const negativeStockCount = await prisma.projectMaterialStock.count({
    where: { stock: { lt: 0 } }
  });

  if (negativeStockCount > 0) {
    console.error(`[FAIL] Found ${negativeStockCount} negative stock records.`);
    hasErrors = true;
  } else {
    console.log('[PASS] No negative stock found.');
  }

  // 3. Movement without snapshot
  const missingSnapshotsCount = await prisma.materialMovement.count({
    where: {
      OR: [
        { materialCodeSnapshot: null },
        { materialNameSnapshot: null },
        { unitSnapshot: null }
      ]
    }
  });

  if (missingSnapshotsCount > 0) {
    console.error(`[FAIL] Found ${missingSnapshotsCount} movements without full snapshots.`);
    hasErrors = true;
  } else {
    console.log('[PASS] All movements have snapshots.');
  }

  if (hasErrors) {
    console.error('\n[FINAL RESULT] NO-GO: Full Data Audit Failed.');
    process.exit(1);
  } else {
    console.log('\n[FINAL RESULT] GO: Full Data Audit Passed.');
    process.exit(0);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
