import 'dotenv/config';
import prisma from "../src/lib/prisma";

async function main() {
  console.log("=== KIỂM TRA DỮ LIỆU APPROVALS HIỆN CÓ ===\n");

  const total = await prisma.approvalRequest.count();
  const pending = await prisma.approvalRequest.count({ where: { status: 'PENDING' } });
  const approved = await prisma.approvalRequest.count({ where: { status: 'APPROVED' } });
  const rejected = await prisma.approvalRequest.count({ where: { status: 'REJECTED' } });
  const cancelled = await prisma.approvalRequest.count({ where: { status: 'CANCELLED' } });
  
  console.log(`- Tổng số approval requests: ${total}`);
  console.log(`- PENDING: ${pending}`);
  console.log(`- APPROVED: ${approved}`);
  console.log(`- REJECTED: ${rejected}`);
  console.log(`- CANCELLED: ${cancelled}`);

  // By type
  const payments = await prisma.approvalRequest.count({ where: { type: 'PAYMENT' } });
  const contracts = await prisma.approvalRequest.count({ where: { type: 'CONTRACT' } });
  const materials = await prisma.approvalRequest.count({ where: { type: 'MATERIAL' } });
  const reports = await prisma.approvalRequest.count({ where: { type: 'REPORT' } });
  
  console.log("\n--- Theo module ---");
  console.log(`- PAYMENT: ${payments}`);
  console.log(`- CONTRACT: ${contracts}`);
  console.log(`- MATERIAL: ${materials}`);
  console.log(`- REPORT: ${reports}`);

  const testDataCount = await prisma.approvalRequest.count({ where: { title: { startsWith: 'QA_APPROVALS_' } } });
  console.log(`\n- Dữ liệu rác prefix QA_APPROVALS_: ${testDataCount}`);

  // Quality
  const missingProject = await prisma.approvalRequest.count({ where: { projectId: '' } });
  const missingRequester = await prisma.approvalRequest.count({ where: { requesterId: '' } });
  const missingApprover = await prisma.approvalRequest.count({ where: { status: { in: ['APPROVED', 'REJECTED'] }, decidedById: null } });
  const approvedMissingAt = await prisma.approvalRequest.count({ where: { status: 'APPROVED', decidedAt: null } });
  const rejectedMissingAt = await prisma.approvalRequest.count({ where: { status: 'REJECTED', decidedAt: null } });
  const missingSourceIdTotal = await prisma.approvalRequest.count({ where: { sourceId: null } });
  const missingSourceIdPending = await prisma.approvalRequest.count({ where: { sourceId: null, status: 'PENDING' } });

  console.log("\n--- Chất lượng dữ liệu ---");
  console.log(`- Thiếu projectId: ${missingProject}`);
  console.log(`- Thiếu requester: ${missingRequester}`);
  console.log(`- Thiếu approver (đã duyệt/từ chối): ${missingApprover}`);
  console.log(`- Approved thiếu approvedAt: ${approvedMissingAt}`);
  console.log(`- Rejected thiếu rejectedAt: ${rejectedMissingAt}`);
  console.log(`- Thiếu sourceId (tổng): ${missingSourceIdTotal}`);
  console.log(`- Thiếu sourceId (PENDING): ${missingSourceIdPending}`);

  // Cross module integrity - Payments
  const orphanedPayments = await prisma.approvalRequest.count({
    where: {
      type: 'PAYMENT',
      sourceId: { not: null },
      NOT: {
        sourceId: {
          in: (await prisma.paymentRequest.findMany({ select: { id: true } })).map(p => p.id)
        }
      }
    }
  });

  console.log("\n--- Cross module integrity ---");
  console.log(`- Approval mồ côi (trỏ PaymentRequest không tồn tại): ${orphanedPayments}`);

  console.log("\n=> Hoàn tất kiểm tra dữ liệu.");
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
