import 'dotenv/config';
import prisma from '../src/lib/prisma';

async function main() {
  console.log("=== KIỂM TRA DỮ LIỆU RÁC SAU KHI CHẠY PLAYWRIGHT ===");

  // 1. Đếm số dự án test
  const projectsAll = await prisma.project.findMany({
    where: {
      OR: [
        { code: { startsWith: 'QA_PROJECTS_DETAIL_' } },
        { name: { startsWith: 'QA_PROJECTS_DETAIL_' } }
      ]
    }
  });

  const activeProjects = projectsAll.filter(p => p.deletedAt === null);
  const softDeletedProjects = projectsAll.filter(p => p.deletedAt !== null);

  // 2. Đếm số user test
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { email: { contains: 'qa_projects_detail_' } },
        { email: { endsWith: '@example.test' } }
      ]
    }
  });

  // 3. Đếm số ProjectMember test
  const projectMembers = await prisma.projectMember.findMany({
    where: {
      OR: [
        { user: { email: { contains: 'qa_projects_detail_' } } },
        { user: { email: { endsWith: '@example.test' } } },
        { project: { code: { startsWith: 'QA_PROJECTS_DETAIL_' } } }
      ]
    }
  });

  console.log(`- Dự án test hoạt động (prefix QA_PROJECTS_DETAIL_): ${activeProjects.length}`);
  console.log(`- Dự án test bị xóa mềm (prefix QA_PROJECTS_DETAIL_): ${softDeletedProjects.length}`);
  console.log(`- User test (qa_projects_detail_ hoặc @example.test): ${users.length}`);
  console.log(`- ProjectMember test liên quan: ${projectMembers.length}`);

  if (activeProjects.length > 0 || softDeletedProjects.length > 0 || users.length > 0 || projectMembers.length > 0) {
    console.log("\n⚠️ PHÁT HIỆN DỮ LIỆU RÁC CHƯA DỌN DẸP! Tiến hành dọn dẹp...");

    // Tiến hành xóa
    await prisma.projectMember.deleteMany({
      where: {
        OR: [
          { userId: { in: users.map(u => u.id) } },
          { projectId: { in: projectsAll.map(p => p.id) } }
        ]
      }
    });

    await prisma.project.deleteMany({
      where: {
        id: { in: projectsAll.map(p => p.id) }
      }
    });

    await prisma.user.deleteMany({
      where: {
        id: { in: users.map(u => u.id) }
      }
    });

    console.log("✅ Đã dọn dẹp sạch sẽ dữ liệu rác.");
  } else {
    console.log("✅ Hệ thống SẠCH SẼ, không có dữ liệu rác từ Playwright.");
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
