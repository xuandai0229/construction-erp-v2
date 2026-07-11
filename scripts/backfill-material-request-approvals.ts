import prisma from '../src/lib/prisma';

async function main() {
  const args = process.argv.slice(2);
  const isApply = args.includes('--apply');
  const isConfirm = args.includes('--confirm') && args.includes('BACKFILL_MATERIAL_APPROVALS');

  console.log('--- BACKFILL MATERIAL REQUEST APPROVALS ---');
  if (!isApply || !isConfirm) {
    console.log('Running in DRY-RUN mode. Use --apply --confirm BACKFILL_MATERIAL_APPROVALS to execute.');
  } else {
    console.log('Running in APPLY mode.');
  }

  const submittedRequests = await prisma.materialRequest.findMany({
    where: {
      status: 'SUBMITTED',
    },
    include: {
      requestedBy: true,
    },
  });

  const candidates = [];
  
  for (const request of submittedRequests) {
    const existingApproval = await prisma.approvalRequest.findFirst({
      where: {
        sourceType: 'MATERIAL_REQUEST',
        sourceId: request.id,
        type: 'MATERIAL',
        deletedAt: null,
      },
    });

    if (!existingApproval) {
      candidates.push(request);
    }
  }

  console.log(`Found ${candidates.length} SUBMITTED requests missing ApprovalRequest.`);

  for (const req of candidates) {
    console.log(`Candidate: ${req.requestNo} (ID: ${req.id}) | Project: ${req.projectId} | Requester: ${req.requestedById}`);
  }

  if (isApply && isConfirm) {
    let createdCount = 0;
    let skippedCount = 0;

    for (const req of candidates) {
      try {
        await prisma.$transaction(async (tx) => {
          // Double check to be idempotent
          const existing = await tx.approvalRequest.findFirst({
            where: {
              sourceType: 'MATERIAL_REQUEST',
              sourceId: req.id,
              type: 'MATERIAL',
              deletedAt: null,
            },
          });

          if (existing) {
            skippedCount++;
            return;
          }

          const approvalCode = `APP-${req.requestNo}`;

          await tx.approvalRequest.create({
            data: {
              code: approvalCode,
              projectId: req.projectId,
              title: `Yêu cầu vật tư: ${req.requestNo}`,
              type: 'MATERIAL',
              status: 'PENDING',
              priority: 'NORMAL',
              requesterId: req.requestedById,
              sourceType: 'MATERIAL_REQUEST',
              sourceId: req.id,
              dueDate: req.neededDate,
            },
          });
          createdCount++;
        });
        console.log(`[SUCCESS] Created ApprovalRequest for ${req.requestNo}`);
      } catch (error) {
        console.error(`[ERROR] Failed to create ApprovalRequest for ${req.requestNo}:`, error);
      }
    }
    console.log(`\nResults: ${createdCount} created, ${skippedCount} skipped.`);
  } else {
    console.log('\nDRY-RUN finished. No changes made.');
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
