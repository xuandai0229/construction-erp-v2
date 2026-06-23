import prisma from '../src/lib/prisma';
import { canEditReportContent, canSoftDeleteReport } from '../src/lib/reports/report-workflow-policy';

async function runTests() {
  console.log('--- BẮT ĐẦU TEST R3B ADMIN ACTIONS VISIBILITY ---\n');

  try {
    const adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    const engineerUser = await prisma.user.findFirst({ where: { role: 'ENGINEER' } });
    
    if (!adminUser) {
      console.log('Bỏ qua vì không tìm thấy user ADMIN');
      return;
    }

    const testEngineerUser = engineerUser || await prisma.user.create({
      data: {
        email: 'engineer_test_r3b_actions@example.com',
        username: 'engineer_test_r3b_actions',
        name: 'Test Engineer Actions',
        password: 'hashedpassword',
        role: 'ENGINEER'
      }
    });

    // 1. Admin/Director Tests
    console.log('[1] Admin/Director Tests');
    const adminReportDraft = { status: 'DRAFT', createdById: adminUser.id };
    const adminReportRejected = { status: 'REJECTED', createdById: adminUser.id };
    const adminReportSubmitted = { status: 'SUBMITTED', createdById: adminUser.id };
    const adminReportApproved = { status: 'APPROVED', createdById: adminUser.id };

    console.log('  - Admin edit DRAFT:', canEditReportContent(adminReportDraft, adminUser) ? 'PASS' : 'FAIL');
    console.log('  - Admin edit REJECTED:', canEditReportContent(adminReportRejected, adminUser) ? 'PASS' : 'FAIL');
    console.log('  - Admin edit SUBMITTED:', !canEditReportContent(adminReportSubmitted, adminUser) ? 'PASS (BLOCKED)' : 'FAIL');
    
    console.log('  - Admin soft delete DRAFT:', canSoftDeleteReport(adminReportDraft, adminUser) ? 'PASS' : 'FAIL');
    console.log('  - Admin soft delete REJECTED:', canSoftDeleteReport(adminReportRejected, adminUser) ? 'PASS' : 'FAIL');
    console.log('  - Admin soft delete SUBMITTED:', canSoftDeleteReport(adminReportSubmitted, adminUser) ? 'PASS' : 'FAIL');
    console.log('  - Admin soft delete APPROVED:', !canSoftDeleteReport(adminReportApproved, adminUser) ? 'PASS (BLOCKED)' : 'FAIL');

    // 2. Lower Role (Engineer) Tests
    console.log('\n[2] Lower Role (Engineer) Tests');
    const engReportDraft = { status: 'DRAFT', createdById: testEngineerUser.id };
    const engReportRejected = { status: 'REJECTED', createdById: testEngineerUser.id };
    const engReportSubmitted = { status: 'SUBMITTED', createdById: testEngineerUser.id };

    console.log('  - Engineer edit DRAFT:', canEditReportContent(engReportDraft, testEngineerUser) ? 'PASS' : 'FAIL');
    console.log('  - Engineer edit REJECTED:', canEditReportContent(engReportRejected, testEngineerUser) ? 'PASS' : 'FAIL');
    
    console.log('  - Engineer delete DRAFT:', !canSoftDeleteReport(engReportDraft, testEngineerUser) ? 'PASS (BLOCKED)' : 'FAIL');
    console.log('  - Engineer delete REJECTED:', !canSoftDeleteReport(engReportRejected, testEngineerUser) ? 'PASS (BLOCKED)' : 'FAIL');
    console.log('  - Engineer delete SUBMITTED:', !canSoftDeleteReport(engReportSubmitted, testEngineerUser) ? 'PASS (BLOCKED)' : 'FAIL');

    // Cleanup mock user if created
    if (!engineerUser) {
      await prisma.user.delete({ where: { id: testEngineerUser.id } });
    }

    console.log('\n--- KẾT QUẢ: TEST HOÀN TẤT ---');

  } catch (error) {
    console.error('Lỗi khi chạy test:', error);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
