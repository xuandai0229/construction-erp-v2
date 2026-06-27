import 'dotenv/config';
import prisma from '../src/lib/prisma';
import { UserRole, ProjectStatus } from '@prisma/client';
import { createProject, updateProject, deleteProject } from '../src/app/(dashboard)/projects/actions';

// Mock function to simulate FormData
function createProjectFormData(data: any): FormData {
  const formData = new FormData();
  Object.keys(data).forEach(key => {
    if (data[key] !== undefined && data[key] !== null) {
      formData.append(key, data[key]);
    }
  });
  return formData;
}

async function main() {
  console.log("=== PHASE 5: TEST DỮ LIỆU BẨN CHO FORM + DETAIL ===");

  // Lấy các user có sẵn cho việc test
  const adminUser = await prisma.user.findFirst({
    where: { role: 'ADMIN', isActive: true, deletedAt: null }
  });
  const staffUser = await prisma.user.findFirst({
    where: { role: 'STAFF', isActive: true, deletedAt: null }
  });

  if (!adminUser || !staffUser) {
    console.error("Lỗi: Cần tối thiểu 1 Admin và 1 Staff user trong DB để chạy test.");
    return;
  }

  console.log(`- Admin User: ${adminUser.email} (ID: ${adminUser.id})`);
  console.log(`- Staff User: ${staffUser.email} (ID: ${staffUser.id})`);

  // Lưu danh sách ID dự án đã tạo để cleanup
  const createdProjectIds: string[] = [];

  const cleanup = async () => {
    console.log("\n--- BẮT ĐẦU CLEANUP ---");
    if (createdProjectIds.length > 0) {
      await prisma.projectMember.deleteMany({
        where: { projectId: { in: createdProjectIds } }
      });
      await prisma.project.deleteMany({
        where: { id: { in: createdProjectIds } }
      });
      console.log(`- Đã xóa ${createdProjectIds.length} dự án test.`);
    }
    // Xóa thêm bất kỳ dự án nào có code prefix QA_PROJECTS_DETAIL_ đề phòng lỗi
    const leftover = await prisma.project.findMany({
      where: { code: { startsWith: 'QA_PROJECTS_DETAIL_' } }
    });
    if (leftover.length > 0) {
      const leftoverIds = leftover.map(p => p.id);
      await prisma.projectMember.deleteMany({ where: { projectId: { in: leftoverIds } } });
      await prisma.project.deleteMany({ where: { id: { in: leftoverIds } } });
      console.log(`- Đã dọn dẹp thêm ${leftover.length} dự án test mồ côi.`);
    }
    console.log("--- CLEANUP HOÀN TẤT ---");
  };

  try {
    // ----------------------------------------------------
    // TEST CASE 1: Validation độ dài chuỗi (Zod schema)
    // ----------------------------------------------------
    console.log("\n1. Test Case 1: Gửi chuỗi quá dài");
    
    // Tên quá dài (> 200 ký tự)
    const longName = "A".repeat(201);
    const formLongName = createProjectFormData({
      code: 'QA_PROJECTS_DETAIL_T1',
      name: longName,
      status: 'PLANNING'
    });
    
    // Chúng ta chạy Server Action. Để giả lập session của Admin, ta cần Mock getSession()
    // Vì không thể Mock getSession() dễ dàng lúc runtime chạy file tsx trực tiếp trừ khi ta sửa actions.ts hoặc tạm thời dùng API
    // Tuy nhiên, ta có thể test trực tiếp Zod validation và logic bằng cách gọi validate và xem kết quả.
    // Chờ đã! Server Action check getSession() từ Next.js cookies, khi chạy bằng `npx tsx` thì cookies() sẽ crash do không chạy trong Next context.
    // Lỗi: `invariant expected to be writing, this is a bug in Next.js` hoặc `cookies is not available`.
    // Do đó, ta sẽ viết một script chuyên biệt hoặc verify bằng cách phân tích và kiểm tra trực tiếp.
    // Hãy bắt lỗi này trước khi chạy! 
    console.log("- Ghi chú: Chạy Server Actions trực tiếp bằng npx tsx sẽ lỗi Next.js Server-only APIs (cookies, redirect).");
    console.log("- Chúng ta sẽ kiểm tra trực tiếp thông qua schema validation bằng cách import và kiểm tra schema Zod từ actions.ts (nếu export) hoặc tự viết checker tương đương.");

  } catch (error) {
    console.error("Đã xảy ra lỗi trong quá trình test:", error);
  } finally {
    await cleanup();
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
