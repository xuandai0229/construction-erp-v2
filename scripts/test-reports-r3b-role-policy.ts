import prisma from '../src/lib/prisma';
import { canEditReportContent, canSoftDeleteReport } from '../src/lib/reports/report-workflow-policy';

async function runTests() {
  console.log('--- BẮT ĐẦU TEST R3B ROLE POLICY ---\n');

  try {
    const adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    const engineerUser = await prisma.user.findFirst({ where: { role: 'ENGINEER' } });
    
    if (!adminUser) {
      console.log('Bỏ qua vì không tìm thấy user ADMIN');
      return;
    }

    const testEngineerUser = engineerUser || await prisma.user.create({
      data: {
        email: 'engineer_test_r3b_policy@example.com',
        username: 'engineer_test_r3b_policy',
        name: 'Test Engineer',
        password: 'hashedpassword',
        role: 'ENGINEER'
      }
    });

    // 8.1 Admin/Director
    console.log('[1] Admin/Director Tests');
    const adminReportDraft = { status: 'DRAFT', createdById: adminUser.id };
    const adminReportRejected = { status: 'REJECTED', createdById: adminUser.id };
    const adminReportSubmitted = { status: 'SUBMITTED', createdById: adminUser.id };
    const someoneElseReportDraft = { status: 'DRAFT', createdById: 'someone-else' };

    console.log('  - Admin sửa DRAFT:', canEditReportContent(adminReportDraft, adminUser) ? 'PASS' : 'FAIL');
    console.log('  - Admin sửa REJECTED:', canEditReportContent(adminReportRejected, adminUser) ? 'PASS' : 'FAIL');
    console.log('  - Admin xóa mềm DRAFT:', canSoftDeleteReport(adminReportDraft, adminUser) ? 'PASS' : 'FAIL');
    console.log('  - Admin xóa mềm REJECTED:', canSoftDeleteReport(adminReportRejected, adminUser) ? 'PASS' : 'FAIL');
    console.log('  - Admin sửa DRAFT của người khác:', canEditReportContent(someoneElseReportDraft, adminUser) ? 'PASS' : 'FAIL');
    console.log('  - Admin sửa SUBMITTED:', !canEditReportContent(adminReportSubmitted, adminUser) ? 'PASS (BLOCKED)' : 'FAIL');
    console.log('  - Admin xóa SUBMITTED:', !canSoftDeleteReport(adminReportSubmitted, adminUser) ? 'PASS (BLOCKED)' : 'FAIL');

    // 8.2 Chỉ huy trưởng / cấp dưới
    console.log('\n[2] Lower Role (Engineer) Tests');
    const engReportDraft = { status: 'DRAFT', createdById: testEngineerUser.id };
    const engReportRejected = { status: 'REJECTED', createdById: testEngineerUser.id };
    const engReportSubmitted = { status: 'SUBMITTED', createdById: testEngineerUser.id };
    const otherReportDraft = { status: 'DRAFT', createdById: adminUser.id };

    console.log('  - Engineer sửa DRAFT của mình:', canEditReportContent(engReportDraft, testEngineerUser) ? 'PASS' : 'FAIL');
    console.log('  - Engineer sửa REJECTED của mình:', canEditReportContent(engReportRejected, testEngineerUser) ? 'PASS' : 'FAIL');
    console.log('  - Engineer xóa DRAFT của mình:', !canSoftDeleteReport(engReportDraft, testEngineerUser) ? 'PASS (BLOCKED)' : 'FAIL');
    console.log('  - Engineer xóa REJECTED của mình:', !canSoftDeleteReport(engReportRejected, testEngineerUser) ? 'PASS (BLOCKED)' : 'FAIL');
    console.log('  - Engineer sửa DRAFT của người khác:', !canEditReportContent(otherReportDraft, testEngineerUser) ? 'PASS (BLOCKED)' : 'FAIL');
    console.log('  - Engineer xóa DRAFT của người khác:', !canSoftDeleteReport(otherReportDraft, testEngineerUser) ? 'PASS (BLOCKED)' : 'FAIL');

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
