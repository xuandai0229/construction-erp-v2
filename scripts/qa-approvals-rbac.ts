import { canApproveApproval, ApprovalActor, ApprovalPermissionContext } from '../src/lib/approvals/approval-permissions';

function testRBAC() {
  console.log("=== KIỂM TRA PHÂN QUYỀN APPROVALS (RBAC STATIC) ===\n");

  const adminActor: ApprovalActor = { id: 'admin1', role: 'ADMIN' };
  const directorActor: ApprovalActor = { id: 'dir1', role: 'DIRECTOR' };
  const staffActor: ApprovalActor = { id: 'staff1', role: 'STAFF' };
  const accountantActor: ApprovalActor = { id: 'acc1', role: 'ACCOUNTANT' };

  const approvalData: ApprovalPermissionContext = {
    id: 'app1',
    projectId: 'proj1',
    requesterId: 'staff1',
    status: 'PENDING',
    type: 'PAYMENT',
  };

  const projectRoles = new Map<string, any>([
    ['proj1', 'PROJECT_MANAGER'],
    ['proj2', 'ENGINEER']
  ]);

  const adminCanApprove = canApproveApproval(adminActor, approvalData, projectRoles);
  const directorCanApprove = canApproveApproval(directorActor, approvalData, projectRoles);
  const staffCanApprove = canApproveApproval(staffActor, approvalData, projectRoles);
  const accCanApprove = canApproveApproval(accountantActor, approvalData, projectRoles);

  console.log(`- ADMIN duyệt: ${adminCanApprove ? '✅ CÓ' : '❌ KHÔNG'}`);
  console.log(`- DIRECTOR duyệt: ${directorCanApprove ? '✅ CÓ' : '❌ KHÔNG'}`);
  console.log(`- PROJECT MANAGER (STAFF) duyệt dự án mình: ${staffCanApprove ? '✅ CÓ' : '❌ KHÔNG'}`);
  console.log(`- ACCOUNTANT duyệt (policy chặn): ${accCanApprove ? '✅ CÓ' : '❌ KHÔNG'}`);

  // Test self approve
  const selfApproveData: ApprovalPermissionContext = { ...approvalData, requesterId: 'dir1' };
  const dirSelfApprove = canApproveApproval(directorActor, selfApproveData, projectRoles);
  console.log(`- DIRECTOR tự duyệt phiếu của mình: ${dirSelfApprove ? '✅ CÓ' : '❌ KHÔNG'}`);
  
  if (adminCanApprove && directorCanApprove && staffCanApprove && !accCanApprove && !dirSelfApprove) {
    console.log("\n✅ TẤT CẢ TEST CASE RBAC PASS.");
  } else {
    console.log("\n❌ CÓ TEST CASE RBAC FAIL.");
    process.exit(1);
  }
}

testRBAC();
