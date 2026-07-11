import prisma from '../src/lib/prisma';

async function main() {
  console.log('--- QA: MATERIAL REQUEST TO APPROVAL MAPPING ---');
  let hasErrors = false;

  // 1. Check for SUBMITTED MaterialRequests without an ApprovalRequest
  const submittedRequests = await prisma.materialRequest.findMany({
    where: {
      status: 'SUBMITTED',
    },
  });

  const missingApprovals = [];
  for (const req of submittedRequests) {
    const approval = await prisma.approvalRequest.findFirst({
      where: {
        sourceType: 'MATERIAL_REQUEST',
        sourceId: req.id,
        type: 'MATERIAL',
        deletedAt: null,
      },
    });
    if (!approval) {
      missingApprovals.push(req);
    }
  }

  if (missingApprovals.length > 0) {
    console.error(`[FAIL] Found ${missingApprovals.length} SUBMITTED MaterialRequest(s) missing an ApprovalRequest.`);
    missingApprovals.forEach((req) => {
      console.error(`  - Request ID: ${req.id}, No: ${req.requestNo}`);
    });
    hasErrors = true;
  } else {
    console.log('[PASS] All SUBMITTED MaterialRequests have an associated ApprovalRequest.');
  }

  // 2. Check for ApprovalRequests with sourceType MATERIAL_REQUEST where the request no longer exists
  const materialApprovals = await prisma.approvalRequest.findMany({
    where: {
      sourceType: 'MATERIAL_REQUEST',
    },
  });

  const orphanApprovals = [];
  for (const approval of materialApprovals) {
    if (!approval.sourceId) {
      orphanApprovals.push(approval);
      continue;
    }
    const request = await prisma.materialRequest.findUnique({
      where: { id: approval.sourceId },
    });
    if (!request) {
      orphanApprovals.push(approval);
    }
  }

  if (orphanApprovals.length > 0) {
    console.error(`[FAIL] Found ${orphanApprovals.length} ApprovalRequest(s) pointing to non-existent MaterialRequest.`);
    orphanApprovals.forEach((app) => {
      console.error(`  - Approval ID: ${app.id}, Code: ${app.code}, sourceId: ${app.sourceId}`);
    });
    hasErrors = true;
  } else {
    console.log('[PASS] All Material ApprovalRequests point to valid MaterialRequests.');
  }

  if (hasErrors) {
    console.error('\n[FINAL RESULT] NO-GO: Blockers found in approval mapping.');
    process.exit(1);
  } else {
    console.log('\n[FINAL RESULT] GO: Mapping is clean.');
    process.exit(0);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
