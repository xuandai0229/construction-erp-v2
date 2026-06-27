import 'dotenv/config';
import prisma from "../src/lib/prisma";

async function main() {
  console.log("=== KIỂM TRA DỮ LIỆU CONTRACTS HIỆN CÓ ===\n");

  const total = await prisma.contract.count();
  const active = await prisma.contract.count({ where: { deletedAt: null } });
  const deleted = await prisma.contract.count({ where: { deletedAt: { not: null } } });
  
  const testDataCount = await prisma.contract.count({ where: { name: { startsWith: 'QA_CONTRACTS_' } } });

  console.log(`- Tổng số hợp đồng: ${total}`);
  console.log(`- Active: ${active}`);
  console.log(`- Deleted (Soft deleted): ${deleted}`);
  console.log(`- Dữ liệu rác prefix QA_CONTRACTS_: ${testDataCount}`);

  // Quality
  const missingName = await prisma.contract.count({ where: { name: '' } });
  const missingCode = await prisma.contract.count({ where: { contractNo: '' } });
  const missingProject = await prisma.contract.count({ where: { projectId: '' } });
  
  const zeroValue = await prisma.contract.count({ where: { value: { lte: 0 } } });

  console.log("\n--- Chất lượng dữ liệu ---");
  console.log(`- Thiếu tên: ${missingName}`);
  console.log(`- Thiếu số hợp đồng: ${missingCode}`);
  console.log(`- Thiếu projectId: ${missingProject}`);
  console.log(`- Giá trị hợp đồng <= 0: ${zeroValue}`);

  // Duplicate Check
  const codeCounts = await prisma.contract.groupBy({
    by: ['contractNo'],
    _count: { contractNo: true },
    having: { contractNo: { _count: { gt: 1 } } }
  });

  console.log("\n--- Trùng lặp ---");
  console.log(`- Số hợp đồng bị trùng contractNo: ${codeCounts.length}`);
  if (codeCounts.length > 0) {
    codeCounts.forEach(c => console.log(`  + ${c.contractNo} (${c._count.contractNo} lần)`));
  }

  // Relations
  const withPayments = await prisma.contract.count({ where: { paymentRequests: { some: {} } } });
  const withPaymentPlans = await prisma.contract.count({ where: { paymentPlans: { some: {} } } });
  const deletedWithPayments = await prisma.contract.count({ where: { deletedAt: { not: null }, paymentRequests: { some: {} } } });
  const deletedWithPaymentPlans = await prisma.contract.count({ where: { deletedAt: { not: null }, paymentPlans: { some: {} } } });
  
  const paymentValueZero = await prisma.contract.count({ where: { paymentRequests: { some: {} }, value: { lte: 0 } } });

  console.log("\n--- Quan hệ dữ liệu ---");
  console.log(`- Hợp đồng có PaymentRequests liên quan: ${withPayments}`);
  console.log(`- Hợp đồng có PaymentPlans liên quan: ${withPaymentPlans}`);
  console.log(`- Hợp đồng ĐÃ XÓA nhưng có PaymentRequests: ${deletedWithPayments}`);
  console.log(`- Hợp đồng ĐÃ XÓA nhưng có PaymentPlans: ${deletedWithPaymentPlans}`);
  console.log(`- Hợp đồng có PaymentRequests nhưng value <= 0: ${paymentValueZero}`);

  console.log("\n=> Hoàn tất kiểm tra dữ liệu.");
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
