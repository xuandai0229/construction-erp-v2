import 'dotenv/config';
import prisma from "../src/lib/prisma";

async function main() {
  console.log("=== KIỂM TRA DỮ LIỆU SUPPLIERS HIỆN CÓ ===\n");

  const total = await prisma.supplier.count();
  const active = await prisma.supplier.count({ where: { deletedAt: null } });
  const deleted = await prisma.supplier.count({ where: { deletedAt: { not: null } } });
  
  const testDataCount = await prisma.supplier.count({ where: { name: { startsWith: 'QA_SUPPLIERS_' } } });

  console.log(`- Tổng số supplier: ${total}`);
  console.log(`- Active: ${active}`);
  console.log(`- Deleted (Soft deleted): ${deleted}`);
  console.log(`- Dữ liệu rác prefix QA_SUPPLIERS_: ${testDataCount}`);

  // Quality
  const missingName = await prisma.supplier.count({ where: { name: '' } });
  const missingCode = await prisma.supplier.count({ where: { code: '' } });
  const missingTaxCode = await prisma.supplier.count({ where: { OR: [{ taxCode: null }, { taxCode: '' }] } });
  const missingPhone = await prisma.supplier.count({ where: { OR: [{ phone: null }, { phone: '' }] } });

  console.log("\n--- Chất lượng dữ liệu ---");
  console.log(`- Thiếu tên: ${missingName}`);
  console.log(`- Thiếu mã: ${missingCode}`);
  console.log(`- Thiếu mã số thuế: ${missingTaxCode}`);
  console.log(`- Thiếu số điện thoại: ${missingPhone}`);

  // Duplicate Check
  const nameCounts = await prisma.supplier.groupBy({
    by: ['name'],
    _count: { name: true },
    having: { name: { _count: { gt: 1 } } }
  });
  
  const taxCodeCounts = await prisma.supplier.groupBy({
    by: ['taxCode'],
    _count: { taxCode: true },
    where: { taxCode: { not: null } },
    having: { taxCode: { _count: { gt: 1 } } }
  });

  const phoneCounts = await prisma.supplier.groupBy({
    by: ['phone'],
    _count: { phone: true },
    where: { phone: { not: null } },
    having: { phone: { _count: { gt: 1 } } }
  });

  const emailCounts = await prisma.supplier.groupBy({
    by: ['email'],
    _count: { email: true },
    where: { email: { not: null } },
    having: { email: { _count: { gt: 1 } } }
  });

  console.log("\n--- Trùng lặp ---");
  console.log(`- Số tên supplier bị trùng: ${nameCounts.length}`);
  if (nameCounts.length > 0) {
    nameCounts.forEach(n => console.log(`  + ${n.name} (${n._count.name} lần)`));
  }

  console.log(`- Số mã số thuế bị trùng: ${taxCodeCounts.length}`);
  if (taxCodeCounts.length > 0) {
    taxCodeCounts.forEach(t => console.log(`  + ${t.taxCode} (${t._count.taxCode} lần)`));
  }

  console.log(`- Số điện thoại bị trùng: ${phoneCounts.length}`);
  if (phoneCounts.length > 0) {
    phoneCounts.forEach(p => console.log(`  + ${p.phone} (${p._count.phone} lần)`));
  }

  console.log(`- Số email bị trùng: ${emailCounts.length}`);
  if (emailCounts.length > 0) {
    emailCounts.forEach(e => console.log(`  + ${e.email} (${e._count.email} lần)`));
  }

  // Relations
  const withContracts = await prisma.supplier.count({ where: { contracts: { some: {} } } });
  const withPayments = await prisma.supplier.count({ where: { paymentRequests: { some: {} } } });

  console.log("\n--- Quan hệ dữ liệu ---");
  console.log(`- Supplier có hợp đồng liên kết: ${withContracts}`);
  console.log(`- Supplier có thanh toán liên kết: ${withPayments}`);

  console.log("\n=> Hoàn tất kiểm tra dữ liệu.");
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
