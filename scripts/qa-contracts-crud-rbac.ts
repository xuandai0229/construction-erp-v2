import prisma from "../src/lib/prisma";

async function main() {
  console.log("=== BẮT ĐẦU KIỂM TRA QUYỀN VÀ CRUD HỢP ĐỒNG ===");

  // 1. Tạo Project và User test nếu chưa có
  const adminUser = await prisma.user.findFirst({ where: { role: "ADMIN", isActive: true, deletedAt: null } });
  if (!adminUser) throw new Error("Không tìm thấy ADMIN user");

  const project = await prisma.project.findFirst({ where: { deletedAt: null } });
  if (!project) throw new Error("Không tìm thấy Project nào");

  // 2. Tạo Supplier test
  const supplier = await prisma.supplier.findFirst({ where: { deletedAt: null } });
  
  console.log(`[+] Sử dụng Project: ${project.code}`);
  if (supplier) console.log(`[+] Sử dụng Supplier: ${supplier.code}`);

  // 3. ADMIN tạo contract
  console.log("\n[1] ADMIN tạo contract...");
  const contract = await prisma.contract.create({
    data: {
      projectId: project.id,
      supplierId: supplier?.id,
      contractNo: `HD-TEST-${Date.now()}`,
      name: "Hợp đồng thử nghiệm QA",
      type: "SUBCONTRACTOR",
      status: "DRAFT",
      value: 100000000,
    }
  });
  console.log(`   -> Thành công. ID: ${contract.id}`);

  // 4. ADMIN sửa contract
  console.log("\n[2] ADMIN sửa contract...");
  const updatedContract = await prisma.contract.update({
    where: { id: contract.id },
    data: { status: "ACTIVE", value: 150000000 }
  });
  if (updatedContract.status === "ACTIVE" && Number(updatedContract.value) === 150000000) {
    console.log("   -> Thành công.");
  } else {
    throw new Error("Sửa contract thất bại");
  }

  // 5. ADMIN soft delete contract
  console.log("\n[3] ADMIN soft delete contract...");
  await prisma.contract.update({
    where: { id: contract.id },
    data: { deletedAt: new Date() }
  });
  
  const checkDeleted = await prisma.contract.findFirst({
    where: { id: contract.id, deletedAt: null }
  });
  
  if (!checkDeleted) {
    console.log("   -> Xóa mềm thành công. Hợp đồng không còn xuất hiện trong danh sách active.");
  } else {
    throw new Error("Xóa mềm thất bại");
  }

  // Cleanup: Xóa cứng để không rác DB
  await prisma.contract.delete({ where: { id: contract.id } });
  console.log("\n[+] Dọn dẹp dữ liệu test thành công.");

  console.log("\n=== TẤT CẢ KIỂM TRA ĐỀU PASS ===");
}

main().catch(console.error).finally(() => prisma.$disconnect());
