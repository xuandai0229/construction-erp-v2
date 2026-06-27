import 'dotenv/config';
import prisma from '../src/lib/prisma';

async function main() {
  console.log("=== PHẦN A1: KIỂM CHỨNG DỮ LIỆU THẬT ===");
  
  // 1. Tổng số project
  const totalProjects = await prisma.project.count();
  console.log(`- Tổng số project: ${totalProjects}`);

  // 2. Tổng số project chưa bị soft delete
  const activeProjects = await prisma.project.count({ where: { deletedAt: null } });
  console.log(`- Tổng số project chưa bị soft delete (deletedAt = null): ${activeProjects}`);

  // 3. Tổng số project đã soft delete
  const softDeletedProjects = await prisma.project.count({ where: { deletedAt: { not: null } } });
  console.log(`- Tổng số project đã soft delete (deletedAt != null): ${softDeletedProjects}`);

  // 4. Tổng số user
  const totalUsers = await prisma.user.count();
  console.log(`- Tổng số user: ${totalUsers}`);

  // 5. Tổng số project-user assignments (ProjectMember)
  const totalAssignments = await prisma.projectMember.count();
  console.log(`- Tổng số project-user assignments: ${totalAssignments}`);

  // 6. Danh sách status hiện có trong DB
  const statuses = await prisma.project.groupBy({
    by: ['status'],
    _count: {
      id: true
    }
  });
  console.log("- Phân bố trạng thái dự án:");
  statuses.forEach(s => {
    console.log(`  + ${s.status}: ${s._count.id} dự án`);
  });

  // 7. Có project thiếu code không
  const emptyCode = await prisma.project.count({ where: { code: '' } });
  console.log(`- Project thiếu code: ${emptyCode}`);

  // 8. Có project thiếu name không
  const emptyName = await prisma.project.count({ where: { name: '' } });
  console.log(`- Project thiếu name: ${emptyName}`);

  // 9. Có project có startDate > endDate không
  const invalidDates = await prisma.project.findMany({
    where: {
      AND: [
        { startDate: { not: null } },
        { endDate: { not: null } }
      ]
    }
  });
  const startDateGreaterThanEndDate = invalidDates.filter(p => p.startDate! > p.endDate!);
  console.log(`- Project có startDate > endDate: ${startDateGreaterThanEndDate.length}`);
  startDateGreaterThanEndDate.forEach(p => {
    console.log(`  + ID: ${p.id}, Code: ${p.code}, Start: ${p.startDate}, End: ${p.endDate}`);
  });

  // 10. Có project có tên quá dài không (ví dụ > 100 ký tự)
  const allProjects = await prisma.project.findMany({ where: { deletedAt: null } });
  const longNameProjects = allProjects.filter(p => p.name.length > 100);
  console.log(`- Project có tên dài (> 100 ký tự): ${longNameProjects.length}`);
  longNameProjects.forEach(p => {
    console.log(`  + Code: ${p.code}, Name Length: ${p.name.length} chars, Name: "${p.name}"`);
  });

  // 11. Có project có code trùng không
  const codes = await prisma.project.groupBy({
    by: ['code'],
    _count: {
      code: true
    },
    having: {
      code: {
        _count: {
          gt: 1
        }
      }
    }
  });
  console.log(`- Project trùng code: ${codes.length}`);
  codes.forEach(c => {
    console.log(`  + Code trùng: ${c.code} (Xuất hiện ${c._count.code} lần)`);
  });

  // 12. Có project không có user được gán không
  const projectsWithMembers = await prisma.projectMember.findMany({
    where: { deletedAt: null },
    select: { projectId: true }
  });
  const memberProjectIds = new Set(projectsWithMembers.map(m => m.projectId));
  const projectsNoMembers = allProjects.filter(p => !memberProjectIds.has(p.id));
  console.log(`- Project không có bất cứ user nào được gán: ${projectsNoMembers.length}`);
  projectsNoMembers.forEach(p => {
    console.log(`  + Code: ${p.code}, Name: ${p.name}`);
  });

  // 13. Có project archived/deleted vẫn xuất hiện ở query list không
  const pageQueryResults = await prisma.project.findMany({
    where: { deletedAt: null }
  });
  const containsSoftDeleted = pageQueryResults.some(p => p.deletedAt !== null);
  console.log(`- Query list có lọc sạch soft-deleted không? ${!containsSoftDeleted ? "CÓ (Đã lọc sạch)" : "KHÔNG (Có project bị xóa lọt vào)"}`);
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
