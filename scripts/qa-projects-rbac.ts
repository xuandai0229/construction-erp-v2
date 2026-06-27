import 'dotenv/config';
import prisma from '../src/lib/prisma';
import { UserRole, ProjectRole, ProjectStatus } from '@prisma/client';
import { canViewAllProjects, canManageProjects, getAccessibleProjectIds, canAccessProject } from '../src/lib/rbac';

async function main() {
  console.log("=== PHẦN A2: KIỂM CHỨNG RBAC THỰT THEO ROLE ===");

  // 1. Kiểm tra tĩnh các phân quyền theo Role từ rbac.ts
  const allRoles: UserRole[] = [
    "ADMIN",
    "DIRECTOR",
    "DEPUTY_DIRECTOR",
    "CHIEF_COMMANDER",
    "MANAGER",
    "ENGINEER",
    "ACCOUNTANT",
    "STAFF"
  ];

  console.log("\n1. Phân quyền xem tất cả dự án (canViewAllProjects):");
  for (const role of allRoles) {
    const allowed = canViewAllProjects({ role });
    console.log(`  - ${role}: ${allowed ? "ĐƯỢC PHÉP" : "BỊ CHẶN"}`);
  }

  console.log("\n2. Phân quyền quản lý dự án (canManageProjects - Create/Edit/Delete):");
  for (const role of allRoles) {
    const allowed = canManageProjects({ role });
    console.log(`  - ${role}: ${allowed ? "ĐƯỢC PHÉP" : "BỊ CHẶN"}`);
  }

  // 2. Tạo dữ liệu giả lập có prefix QA_PROJECTS_ để kiểm thử truy cập thực tế
  console.log("\n3. Chạy kiểm thử RBAC thực tế với dữ liệu giả lập:");

  // Tìm hoặc tạo một User có role STAFF
  let testStaffUser = await prisma.user.findFirst({
    where: { role: 'STAFF', isActive: true, deletedAt: null }
  });
  if (!testStaffUser) {
    // Tạo tạm
    testStaffUser = await prisma.user.create({
      data: {
        email: 'qa_projects_staff@example.com',
        name: 'QA Staff User',
        password: 'dummy-password-hash',
        role: 'STAFF',
        isActive: true,
      }
    });
    console.log(`  - Đã tạo user STAFF tạm thời: ${testStaffUser.email}`);
  } else {
    console.log(`  - Dùng user STAFF có sẵn: ${testStaffUser.email} (ID: ${testStaffUser.id})`);
  }

  // Tạo 2 project giả lập:
  // - Project A: Gán cho staff
  // - Project B: Không gán cho staff
  const projectA = await prisma.project.create({
    data: {
      code: 'QA_PROJECTS_TEMP_A',
      name: 'Dự án kiểm thử QA A (Có gán user)',
      status: 'ACTIVE',
    }
  });

  const projectB = await prisma.project.create({
    data: {
      code: 'QA_PROJECTS_TEMP_B',
      name: 'Dự án kiểm thử QA B (Không gán user)',
      status: 'ACTIVE',
    }
  });

  console.log(`  - Đã tạo 2 dự án kiểm thử:`);
  console.log(`    + Project A: ${projectA.code} (ID: ${projectA.id})`);
  console.log(`    + Project B: ${projectB.code} (ID: ${projectB.id})`);

  // Gán user STAFF vào Project A
  const memberA = await prisma.projectMember.create({
    data: {
      projectId: projectA.id,
      userId: testStaffUser.id,
      role: 'VIEWER',
      isActive: true,
    }
  });
  console.log(`  - Đã gán user STAFF vào Project A (Member ID: ${memberA.id})`);

  try {
    // A2.1. Test xem list & getAccessibleProjectIds
    const accessibleIds = await getAccessibleProjectIds(testStaffUser);
    console.log(`  - Danh sách ID dự án STAFF có thể xem:`, accessibleIds);
    
    const canAccessA = await canAccessProject(testStaffUser, projectA.id);
    const canAccessB = await canAccessProject(testStaffUser, projectB.id);
    console.log(`  - STAFF có thể xem Project A? ${canAccessA ? "CÓ" : "KHÔNG"}`);
    console.log(`  - STAFF có thể xem Project B? ${canAccessB ? "CÓ" : "KHÔNG"}`);

    if (accessibleIds) {
      const hasA = accessibleIds.includes(projectA.id);
      const hasB = accessibleIds.includes(projectB.id);
      console.log(`  - Kết quả kiểm chứng Danh sách:`);
      console.log(`    + Hiển thị Project A (Đúng mong đợi): ${hasA ? "PASS" : "FAIL"}`);
      console.log(`    + Ẩn Project B (Đúng mong đợi): ${!hasB ? "PASS" : "FAIL"}`);
    }

    // A2.2. Kiểm thử Search & Filter không leak
    // Giả lập query ở page.tsx:
    const q = 'QA_PROJECTS_TEMP'; // search term trùng cả 2 dự án
    const whereCondition: any = {
      deletedAt: null,
      id: { in: accessibleIds || [] },
      OR: [
        { code: { contains: q, mode: 'insensitive' } },
        { name: { contains: q, mode: 'insensitive' } },
      ]
    };
    
    const queryResults = await prisma.project.findMany({ where: whereCondition });
    console.log(`  - Kết quả tìm kiếm của STAFF với từ khóa "${q}":`);
    queryResults.forEach(p => {
      console.log(`    + Code: ${p.code}, Name: ${p.name}`);
    });
    const leakSearch = queryResults.some(p => p.id === projectB.id);
    console.log(`  - Search có bị leak Project B ngoài quyền không? ${leakSearch ? "CÓ (FAIL)" : "KHÔNG (PASS)"}`);

  } finally {
    // Dọn dẹp dữ liệu giả lập (Clean up)
    console.log("\n4. Dọn dẹp dữ liệu kiểm thử (Cleanup)...");
    await prisma.projectMember.deleteMany({
      where: { projectId: { in: [projectA.id, projectB.id] } }
    });
    await prisma.project.deleteMany({
      where: { id: { in: [projectA.id, projectB.id] } }
    });
    // Nếu user STAFF là do ta tạo ra, xóa đi
    if (testStaffUser.email === 'qa_projects_staff@example.com') {
      await prisma.user.delete({ where: { id: testStaffUser.id } });
      console.log("  - Đã xóa user STAFF tạm thời.");
    }
    console.log("  - Dọn dẹp dữ liệu kiểm thử HOÀN TẤT.");
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
