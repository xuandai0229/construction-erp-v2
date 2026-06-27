import { getAccountingPermissions } from '../src/lib/accounting/accounting-permissions';

function testRBAC() {
  console.log("=== KIỂM TRA PHÂN QUYỀN ACCOUNTING (RBAC STATIC VERIFICATION) ===\n");

  const testCases = [
    { userRole: "ADMIN", projectRole: null, expectApprove: true, expectPaid: true, expectDelete: true },
    { userRole: "ACCOUNTANT", projectRole: null, expectApprove: false, expectPaid: true, expectDelete: false },
    { userRole: "STAFF", projectRole: "PROJECT_MANAGER", expectApprove: true, expectPaid: false, expectDelete: false },
    { userRole: "STAFF", projectRole: "ENGINEER", expectApprove: false, expectPaid: false, expectDelete: false },
  ];

  let pass = true;

  for (const tc of testCases) {
    // @ts-ignore
    const perms = getAccountingPermissions(tc.userRole, tc.projectRole);
    
    if (perms.canApprove !== tc.expectApprove || perms.canMarkPaid !== tc.expectPaid || perms.canDelete !== tc.expectDelete) {
      console.log(`❌ FAIL: User ${tc.userRole} / Project ${tc.projectRole} - Expected A/P/D = ${tc.expectApprove}/${tc.expectPaid}/${tc.expectDelete}, got ${perms.canApprove}/${perms.canMarkPaid}/${perms.canDelete}`);
      pass = false;
    } else {
      console.log(`✅ PASS: User ${tc.userRole} / Project ${tc.projectRole} -> A/P/D = ${perms.canApprove}/${perms.canMarkPaid}/${perms.canDelete}`);
    }
  }

  if (pass) {
    console.log("\n=> TẤT CẢ TEST CASE RBAC PASS.");
  } else {
    console.log("\n=> CÓ TEST CASE RBAC FAIL.");
    process.exit(1);
  }
}

testRBAC();
