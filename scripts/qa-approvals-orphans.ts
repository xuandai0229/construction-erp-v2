import 'dotenv/config';
import prisma from "../src/lib/prisma";

async function main() {
  console.log("=== KIỂM TRA APPROVALS MỒ CÔI (ORPHANS) ===\n");
  
  const paymentOrphans = await prisma.approvalRequest.count({
    where: {
      type: 'PAYMENT',
      sourceId: { not: null },
      NOT: { sourceId: { in: (await prisma.paymentRequest.findMany({ select: { id: true } })).map(p => p.id) } }
    }
  });

  const contractOrphans = await prisma.approvalRequest.count({
    where: {
      type: 'CONTRACT',
      sourceId: { not: null },
      NOT: { sourceId: { in: (await prisma.contract.findMany({ select: { id: true } })).map(c => c.id) } }
    }
  });

  const materialOrphans = await prisma.approvalRequest.count({
    where: {
      type: 'MATERIAL',
      sourceId: { not: null },
      NOT: { sourceId: { in: (await prisma.materialRequest.findMany({ select: { id: true } })).map(m => m.id) } }
    }
  });

  const reportOrphans = await prisma.approvalRequest.count({
    where: {
      type: 'REPORT',
      sourceId: { not: null },
      NOT: { sourceId: { in: (await prisma.siteReport.findMany({ select: { id: true } })).map(r => r.id) } }
    }
  });

  console.log(`- Orphan PAYMENT: ${paymentOrphans}`);
  console.log(`- Orphan CONTRACT: ${contractOrphans}`);
  console.log(`- Orphan MATERIAL: ${materialOrphans}`);
  console.log(`- Orphan REPORT: ${reportOrphans}`);

  console.log("\n=> Hoàn tất kiểm tra orphan.");
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
