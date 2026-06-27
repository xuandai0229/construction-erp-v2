import 'dotenv/config';
import prisma from "../src/lib/prisma";
import { PaymentRequestStatus } from "@prisma/client";

async function main() {
  console.log("=== KIỂM TRA DỮ LIỆU ACCOUNTING/PAYMENT HIỆN CÓ ===\n");

  const total = await prisma.paymentRequest.count();
  const active = await prisma.paymentRequest.count({ where: { deletedAt: null } });
  const deleted = await prisma.paymentRequest.count({ where: { deletedAt: { not: null } } });
  
  const testDataCount = await prisma.paymentRequest.count({ where: { title: { startsWith: 'QA_ACCOUNTING_' } } });

  console.log(`- Tổng số PaymentRequest: ${total}`);
  console.log(`- Active: ${active}`);
  console.log(`- Deleted (Soft deleted): ${deleted}`);
  console.log(`- Dữ liệu rác prefix QA_ACCOUNTING_: ${testDataCount}`);

  // Quality
  const missingProject = await prisma.paymentRequest.count({ where: { projectId: '' } });
  const zeroValue = await prisma.paymentRequest.count({ where: { totalAmount: { lte: 0 }, status: 'PAID' } });

  console.log("\n--- Chất lượng dữ liệu ---");
  console.log(`- Thiếu projectId: ${missingProject}`);
  console.log(`- Payment PAID nhưng amount <= 0: ${zeroValue}`);

  const paidWithoutApprovedAt = await prisma.paymentRequest.count({ 
    where: { status: { in: ['APPROVED', 'PAID'] }, approvedAt: null } 
  });
  console.log(`- Payment APPROVED/PAID thiếu approvedAt: ${paidWithoutApprovedAt}`);

  const paidWithoutPaidAt = await prisma.paymentRequest.count({ 
    where: { status: 'PAID', paidAt: null } 
  });
  console.log(`- Payment PAID thiếu paidAt: ${paidWithoutPaidAt}`);

  const deletedApprovedPaid = await prisma.paymentRequest.count({
    where: {
      deletedAt: { not: null },
      status: { in: ['APPROVED', 'PAID'] }
    }
  });
  console.log(`- Payment ĐÃ XÓA nhưng có status APPROVED/PAID: ${deletedApprovedPaid}`);

  const deletedActiveContract = await prisma.paymentRequest.count({
    where: {
      contractId: { not: null },
      contract: { deletedAt: { not: null } }
    }
  });
  console.log(`- Payment có Contract nhưng Contract ĐÃ XÓA: ${deletedActiveContract}`);

  const deletedActiveSupplier = await prisma.paymentRequest.count({
    where: {
      supplierId: { not: null },
      supplier: { deletedAt: { not: null } }
    }
  });
  console.log(`- Payment có Supplier nhưng Supplier ĐÃ XÓA: ${deletedActiveSupplier}`);

  // Check exceeded contracts
  const contracts = await prisma.contract.findMany({
    include: {
      paymentRequests: {
        where: { deletedAt: null, status: { in: ['DRAFT', 'SUBMITTED', 'APPROVED', 'PAID'] } }
      }
    }
  });
  
  let exceededContracts = 0;
  for (const c of contracts) {
    const totalPayments = c.paymentRequests.reduce((sum, p) => sum + Number(p.totalAmount), 0);
    if (totalPayments > Number(c.value)) {
      exceededContracts++;
    }
  }
  
  console.log(`- Hợp đồng có Payment vượt giá trị Hợp đồng: ${exceededContracts}`);

  console.log("\n=> Hoàn tất kiểm tra dữ liệu.");
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
