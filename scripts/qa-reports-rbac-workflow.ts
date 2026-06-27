import { UserRole } from '@prisma/client';
import { canEditReportContent, canUploadReportAttachment, canApproveReport, canRejectReport, canSoftDeleteReport } from '../src/lib/reports/report-workflow-policy';

function main() {
  console.log("=== KIỂM TRA LOGIC RBAC (UNIT TEST) ===\n");

  const adminUser = { id: 'admin1', role: 'ADMIN' as UserRole };
  const directorUser = { id: 'dir1', role: 'DIRECTOR' as UserRole };
  const staff1 = { id: 'staff1', role: 'USER' as UserRole };
  const staff2 = { id: 'staff2', role: 'USER' as UserRole };

  const draftReportOwn = { status: 'DRAFT', createdById: staff1.id };
  const draftReportOther = { status: 'DRAFT', createdById: staff2.id };
  const submittedReport = { status: 'SUBMITTED', createdById: staff1.id };
  const approvedReport = { status: 'APPROVED', createdById: staff1.id };
  const rejectedReportOwn = { status: 'REJECTED', createdById: staff1.id };

  console.log("1. Quyền sửa nội dung báo cáo (Staff):");
  console.log(`- Sửa DRAFT của chính mình: ${canEditReportContent(draftReportOwn, staff1)} (Kỳ vọng: true)`);
  console.log(`- Sửa DRAFT của người khác: ${canEditReportContent(draftReportOther, staff1)} (Kỳ vọng: false)`);
  console.log(`- Sửa SUBMITTED: ${canEditReportContent(submittedReport, staff1)} (Kỳ vọng: false)`);
  console.log(`- Sửa APPROVED: ${canEditReportContent(approvedReport, staff1)} (Kỳ vọng: false)`);
  console.log(`- Sửa REJECTED của chính mình: ${canEditReportContent(rejectedReportOwn, staff1)} (Kỳ vọng: true)`);

  console.log("\n2. Quyền xóa mềm (Staff):");
  console.log(`- Xóa DRAFT của chính mình: ${canSoftDeleteReport(draftReportOwn, staff1)} (Kỳ vọng: false - chỉ Admin mới được xóa)`);
  
  console.log("\n3. Quyền Admin/Director:");
  console.log(`- Admin sửa DRAFT của người khác: ${canEditReportContent(draftReportOther, adminUser)} (Kỳ vọng: true)`);
  console.log(`- Admin xóa mềm SUBMITTED: ${canSoftDeleteReport(submittedReport, adminUser)} (Kỳ vọng: true)`);

  console.log("\n4. Quyền duyệt/từ chối:");
  console.log(`- Duyệt DRAFT: ${canApproveReport('DRAFT')} (Kỳ vọng: false)`);
  console.log(`- Duyệt SUBMITTED: ${canApproveReport('SUBMITTED')} (Kỳ vọng: true)`);
  console.log(`- Từ chối SUBMITTED: ${canRejectReport('SUBMITTED')} (Kỳ vọng: true)`);
  console.log(`- Duyệt APPROVED: ${canApproveReport('APPROVED')} (Kỳ vọng: false)`);

  console.log("\n5. Quyền Upload Đính kèm:");
  console.log(`- Khi DRAFT: ${canUploadReportAttachment('DRAFT')} (Kỳ vọng: true)`);
  console.log(`- Khi SUBMITTED: ${canUploadReportAttachment('SUBMITTED')} (Kỳ vọng: false)`);
  console.log(`- Khi APPROVED: ${canUploadReportAttachment('APPROVED')} (Kỳ vọng: false)`);
  console.log(`- Khi REJECTED: ${canUploadReportAttachment('REJECTED')} (Kỳ vọng: true)`);
}

main();
