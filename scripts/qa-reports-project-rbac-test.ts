import prisma from '../src/lib/prisma';
import { getAccessibleProjectIds } from '../src/lib/rbac';
import { UserRole } from '@prisma/client';

async function runTests() {
  console.log('--- BẮT ĐẦU TEST REPORTS PROJECT RBAC ---\n');

  try {
    // Setup test data
    const timestamp = Date.now();
    const admin = await prisma.user.create({
      data: {
        email: `admin_${timestamp}@test.local`,
        username: `admin_${timestamp}`,
        name: 'Admin Test',
        password: 'pass',
        role: 'ADMIN'
      }
    });

    const commander = await prisma.user.create({
      data: {
        email: `commander_${timestamp}@test.local`,
        username: `commander_${timestamp}`,
        name: 'Commander Test',
        password: 'pass',
        role: 'CHIEF_COMMANDER'
      }
    });

    const projectA = await prisma.project.create({
      data: { code: `PROJ_A_${timestamp}`, name: 'Project A', status: 'ACTIVE' }
    });

    const projectB = await prisma.project.create({
      data: { code: `PROJ_B_${timestamp}`, name: 'Project B', status: 'ACTIVE' }
    });

    // Assign Commander to Project A ONLY
    await prisma.projectMember.create({
      data: {
        userId: commander.id,
        projectId: projectA.id,
        role: 'CHIEF_COMMANDER',
        isActive: true,
        assignedById: admin.id
      }
    });

    console.log('[1] Test Admin Access');
    const adminAccess = await getAccessibleProjectIds({ id: admin.id, role: admin.role });
    console.log('  - Admin truy cập được tất cả dự án (null):', adminAccess === null ? 'PASS' : 'FAIL');

    console.log('\n[2] Test Commander Access (Assigned to A only)');
    const commanderAccess = await getAccessibleProjectIds({ id: commander.id, role: commander.role });
    console.log('  - Commander truy cập được Project A:', commanderAccess?.includes(projectA.id) ? 'PASS' : 'FAIL');
    console.log('  - Commander KHÔNG truy cập được Project B:', !commanderAccess?.includes(projectB.id) ? 'PASS' : 'FAIL');

    console.log('\n[3] Test where Clause Simulation (như trong getSiteReports)');
    const buildWhere = (accessIds: string[] | null) => {
      if (accessIds === null) return "Tất cả Project";
      return accessIds.length > 0 ? `Chỉ các Project: ${accessIds.join(', ')}` : "Không có Project nào";
    };

    console.log('  - Where clause cho Admin:', buildWhere(adminAccess));
    console.log('  - Where clause cho Commander:', buildWhere(commanderAccess));

    // Cleanup
    await prisma.projectMember.deleteMany({ where: { userId: commander.id } });
    await prisma.project.delete({ where: { id: projectA.id } });
    await prisma.project.delete({ where: { id: projectB.id } });
    await prisma.user.delete({ where: { id: admin.id } });
    await prisma.user.delete({ where: { id: commander.id } });

    console.log('\n--- KẾT QUẢ: TEST HOÀN TẤT ---');

  } catch (error) {
    console.error('Lỗi khi chạy test:', error);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
