import prisma from '../src/lib/prisma';
import { canAccessProject, getAccessibleProjectIds } from '../src/lib/rbac';
import { canEditReportContent, canSoftDeleteReport } from '../src/lib/reports/report-workflow-policy';
import { UserRole } from '@prisma/client';

/**
 * MÔ PHỎNG HÀM getSiteReports TỪ actions.ts ĐỂ TEST LOGIC WHERE CLAUSE
 * Vì getSession() không chạy được trong Node.js standalone script mà không có request context,
 * ta trích xuất logic filter ra thành 1 hàm test.
 */
async function simulateGetSiteReportsWhereClause(sessionUser: { id: string, role: UserRole }, filters: any = {}) {
  const accessibleProjectIds = await getAccessibleProjectIds(sessionUser);
  const where: any = { deletedAt: null, project: { deletedAt: null } };

  if (accessibleProjectIds !== null) {
    if (filters.projectId && filters.projectId !== 'ALL' && filters.projectId !== 'all') {
      if (!accessibleProjectIds.includes(filters.projectId)) {
        return null; // Forbidden / No access
      }
      where.projectId = filters.projectId;
    } else {
      where.projectId = { in: accessibleProjectIds };
    }
  } else if (filters.projectId && filters.projectId !== 'ALL' && filters.projectId !== 'all') {
    where.projectId = filters.projectId;
  }
  return where;
}

async function runTests() {
  console.log('=== BẮT ĐẦU TEST HẬU KIỂM RBAC REPORT ===\n');

  try {
    const timestamp = Date.now();
    
    // 1. Setup Test Users
    const admin = await prisma.user.create({
      data: { email: `admin_pf_${timestamp}@test.local`, username: `admin_pf_${timestamp}`, name: 'Admin', password: 'x', role: 'ADMIN' }
    });
    
    const userA1 = await prisma.user.create({
      data: { email: `usera1_pf_${timestamp}@test.local`, username: `usera1_pf_${timestamp}`, name: 'User A1', password: 'x', role: 'ENGINEER' }
    });

    const userA2 = await prisma.user.create({
      data: { email: `usera2_pf_${timestamp}@test.local`, username: `usera2_pf_${timestamp}`, name: 'User A2', password: 'x', role: 'CHIEF_COMMANDER' }
    });

    const userNoProject = await prisma.user.create({
      data: { email: `usernone_pf_${timestamp}@test.local`, username: `usernone_pf_${timestamp}`, name: 'User None', password: 'x', role: 'ENGINEER' }
    });

    // 2. Setup Test Projects
    const projectA = await prisma.project.create({
      data: { code: `PROJ_A_PF_${timestamp}`, name: 'Project A PF', status: 'ACTIVE' }
    });
    
    const projectB = await prisma.project.create({
      data: { code: `PROJ_B_PF_${timestamp}`, name: 'Project B PF', status: 'ACTIVE' }
    });

    // 3. Assign Users to Project A
    await prisma.projectMember.createMany({
      data: [
        { userId: userA1.id, projectId: projectA.id, role: 'VIEWER', isActive: true, assignedById: admin.id },
        { userId: userA2.id, projectId: projectA.id, role: 'CHIEF_COMMANDER', isActive: true, assignedById: admin.id }
      ]
    });

    // 4. Setup Test Reports
    const reportA1 = await prisma.siteReport.create({
      data: { projectId: projectA.id, type: 'DAILY', reportDate: new Date(), status: 'SUBMITTED', createdById: userA1.id, reporterName: 'User A1', weatherCondition: 'SUNNY' }
    });

    const reportB = await prisma.siteReport.create({
      data: { projectId: projectB.id, type: 'DAILY', reportDate: new Date(), status: 'SUBMITTED', createdById: admin.id, reporterName: 'Admin', weatherCondition: 'SUNNY' }
    });

    // ==========================================
    // TEST CASES
    // ==========================================
    let passCount = 0;
    let failCount = 0;

    const assertTest = (name: string, condition: boolean) => {
      if (condition) {
        console.log(`✅ PASS: ${name}`);
        passCount++;
      } else {
        console.log(`❌ FAIL: ${name}`);
        failCount++;
      }
    };

    console.log('--- TEST GROUP 1: LẤY DANH SÁCH REPORT (MÔ PHỎNG getSiteReports) ---');
    
    const whereAdmin = await simulateGetSiteReportsWhereClause(admin);
    assertTest('Admin xem được tất cả report (where.projectId = undefined)', whereAdmin !== null && whereAdmin.projectId === undefined);

    const whereA2 = await simulateGetSiteReportsWhereClause(userA2);
    assertTest('User A2 (thuộc Project A) thấy được report của người khác trong Project A (where.projectId in [ProjectA])', 
      whereA2 !== null && whereA2.projectId.in.includes(projectA.id) && whereA2.createdById === undefined);

    const whereA2FilterB = await simulateGetSiteReportsWhereClause(userA2, { projectId: projectB.id });
    assertTest('User A2 cố tình lọc Project B -> Bị từ chối (trả về null/rỗng)', whereA2FilterB === null);

    const whereNone = await simulateGetSiteReportsWhereClause(userNoProject);
    assertTest('User không thuộc project nào -> where.projectId in [] (không thấy report nào)', 
      whereNone !== null && whereNone.projectId.in.length === 0);

    console.log('\n--- TEST GROUP 2: XEM LỊCH SỬ / TẢI FILE (SỬ DỤNG canAccessProject) ---');

    assertTest('User A1 tải được attachment Project A', await canAccessProject(userA1, projectA.id) === true);
    assertTest('User A2 xem được history Project A', await canAccessProject(userA2, projectA.id) === true);
    assertTest('User A1 KHÔNG tải được attachment Project B', await canAccessProject(userA1, projectB.id) === false);
    assertTest('User A2 KHÔNG xem được history Project B', await canAccessProject(userA2, projectB.id) === false);
    assertTest('User None KHÔNG xem được Project A và B', await canAccessProject(userNoProject, projectA.id) === false && await canAccessProject(userNoProject, projectB.id) === false);

    console.log('\n--- TEST GROUP 3: QUYỀN SỬA / XÓA THEO WORKFLOW ---');
    // reportA1 is SUBMITTED
    assertTest('Người tạo report KHÔNG được sửa nếu status là SUBMITTED', canEditReportContent({ status: reportA1.status, createdById: reportA1.createdById }, userA1) === false);
    assertTest('Admin KHÔNG sửa được report SUBMITTED (phải reject trước)', canEditReportContent({ status: reportA1.status, createdById: reportA1.createdById }, admin) === false);
    
    // Create a DRAFT report for A1
    const reportA1Draft = { status: 'DRAFT', createdById: userA1.id };
    assertTest('Người tạo report ĐƯỢC sửa nếu status là DRAFT', canEditReportContent(reportA1Draft, userA1) === true);
    assertTest('User A2 KHÔNG được sửa DRAFT của User A1', canEditReportContent(reportA1Draft, userA2) === false);

    // ==========================================
    // CLEANUP
    // ==========================================
    await prisma.siteReport.deleteMany({ where: { id: { in: [reportA1.id, reportB.id] } } });
    await prisma.projectMember.deleteMany({ where: { projectId: { in: [projectA.id, projectB.id] } } });
    await prisma.project.deleteMany({ where: { id: { in: [projectA.id, projectB.id] } } });
    await prisma.user.deleteMany({ where: { id: { in: [admin.id, userA1.id, userA2.id, userNoProject.id] } } });

    console.log(`\n=== TỔNG KẾT: ${passCount} PASS | ${failCount} FAIL ===`);
    if (failCount > 0) process.exit(1);

  } catch (error) {
    console.error('Lỗi khi chạy test:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
