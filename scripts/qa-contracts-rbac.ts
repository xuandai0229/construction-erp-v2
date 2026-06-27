import { getContractPermissions } from '../src/lib/contracts/contracts-permissions';

function testRBAC() {
  console.log("=== KIỂM TRA PHÂN QUYỀN HỢP ĐỒNG (RBAC STATIC VERIFICATION) ===\n");

  const testCases = [
    { userRole: "ADMIN", projectRole: null, expectedDelete: true },
    { userRole: "DIRECTOR", projectRole: null, expectedDelete: true },
    { userRole: "ACCOUNTANT", projectRole: null, expectedDelete: false },
    { userRole: "STAFF", projectRole: "PROJECT_MANAGER", expectedDelete: true },
    { userRole: "STAFF", projectRole: "ENGINEER", expectedDelete: false },
    { userRole: "STAFF", projectRole: null, expectedDelete: false },
  ];

  let pass = true;

  for (const tc of testCases) {
    // @ts-ignore
    const perms = getContractPermissions(tc.userRole, tc.projectRole);
    if (perms.canDelete !== tc.expectedDelete) {
      console.log(`❌ FAIL: User ${tc.userRole} / Project ${tc.projectRole} - Expected canDelete=${tc.expectedDelete}, got ${perms.canDelete}`);
      pass = false;
    } else {
      console.log(`✅ PASS: User ${tc.userRole} / Project ${tc.projectRole} -> canDelete=${perms.canDelete}`);
    }
  }

  if (pass) {
    console.log("\n=> TẤT CẢ TEST CASE RBAC PASS.");
  } else {
    console.log("\n=> CÓ TEST CASE RBAC FAIL.");
  }
}

testRBAC();
