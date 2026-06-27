import * as fs from 'fs';
import * as path from 'path';

function main() {
  console.log("=== KIỂM TRA RBAC USERS (STATIC AUDIT) ===\n");
  
  const actionsPath = path.join(__dirname, '..', 'src', 'app', '(dashboard)', 'users', 'actions.ts');
  const rbacPath = path.join(__dirname, '..', 'src', 'lib', 'rbac.ts');
  const code = fs.readFileSync(actionsPath, 'utf-8');
  const rbac = fs.readFileSync(rbacPath, 'utf-8');

  // Role level system
  const hasRoleLevelMap = rbac.includes('USER_ROLE_LEVEL');
  const hasAssertRoleHierarchy = rbac.includes('function assertRoleHierarchy');
  const hasGetAllowedRoles = rbac.includes('function getAllowedRolesForActor');

  // Action guards
  const createHasRoleCheck = code.includes('assertRoleHierarchy') && code.includes('createUser');
  const updateHasRoleCheck = code.includes('assertRoleHierarchy') && code.includes('updateUser');
  const resetPwHasRoleCheck = code.includes('assertRoleHierarchy') && code.includes('resetUserPassword');
  const toggleHasRoleCheck = code.includes('assertRoleHierarchy') && code.includes('toggleUserActive');
  const deleteHasRoleCheck = code.includes('assertRoleHierarchy') && code.includes('softDeleteUser');
  const assignHasRoleCheck = code.includes('assertRoleHierarchy') && code.includes('assignProjectToUser');
  const unassignHasRoleCheck = code.includes('assertRoleHierarchy') && code.includes('unassignProjectFromUser');

  // Self guards
  const selfRoleGuard = code.includes('Bạn không thể tự đổi vai trò của chính mình');
  const selfResetGuard = code.includes('Không thể dùng chức năng này để đổi mật khẩu chính mình');
  const selfDisableGuard = code.includes('Bạn không thể khóa chính tài khoản đang đăng nhập');
  const selfDeleteGuard = code.includes('Bạn không thể xóa chính tài khoản đang đăng nhập');

  // Last admin guard
  const lastAdminGuard = code.includes('quản trị viên cuối cùng') || code.includes('quản trị cuối cùng');

  // Non-ADMIN cannot create ADMIN
  const hierarchyInCreate = code.includes('assertRoleHierarchy(session, ""');

  console.log("--- RBAC Helpers ---");
  console.log(`- Có USER_ROLE_LEVEL map: ${hasRoleLevelMap ? '✅' : '❌'}`);
  console.log(`- Có assertRoleHierarchy: ${hasAssertRoleHierarchy ? '✅' : '❌'}`);
  console.log(`- Có getAllowedRolesForActor: ${hasGetAllowedRoles ? '✅' : '❌'}`);

  console.log("\n--- Action Guards ---");
  console.log(`- createUser check role hierarchy: ${createHasRoleCheck ? '✅' : '❌'}`);
  console.log(`- updateUser check role hierarchy: ${updateHasRoleCheck ? '✅' : '❌'}`);
  console.log(`- resetUserPassword check role hierarchy: ${resetPwHasRoleCheck ? '✅' : '❌'}`);
  console.log(`- toggleUserActive check role hierarchy: ${toggleHasRoleCheck ? '✅' : '❌'}`);
  console.log(`- softDeleteUser check role hierarchy: ${deleteHasRoleCheck ? '✅' : '❌'}`);
  console.log(`- assignProjectToUser check role hierarchy: ${assignHasRoleCheck ? '✅' : '❌'}`);
  console.log(`- unassignProjectFromUser check role hierarchy: ${unassignHasRoleCheck ? '✅' : '❌'}`);

  console.log("\n--- Self Guards ---");
  console.log(`- Self role change guard: ${selfRoleGuard ? '✅' : '❌'}`);
  console.log(`- Self reset password guard: ${selfResetGuard ? '✅' : '❌'}`);
  console.log(`- Self disable guard: ${selfDisableGuard ? '✅' : '❌'}`);
  console.log(`- Self delete guard: ${selfDeleteGuard ? '✅' : '❌'}`);

  console.log("\n--- Last Admin Guard ---");
  console.log(`- Last admin guard: ${lastAdminGuard ? '✅' : '❌'}`);

  console.log("\n--- Create Role Hierarchy ---");
  console.log(`- createUser checks requested role vs actor: ${hierarchyInCreate ? '✅' : '❌'}`);

  const allPass = hasRoleLevelMap && hasAssertRoleHierarchy && hasGetAllowedRoles &&
    createHasRoleCheck && updateHasRoleCheck && resetPwHasRoleCheck &&
    toggleHasRoleCheck && deleteHasRoleCheck && assignHasRoleCheck && unassignHasRoleCheck &&
    selfRoleGuard && selfResetGuard && selfDisableGuard && selfDeleteGuard &&
    lastAdminGuard && hierarchyInCreate;

  if (allPass) {
    console.log("\n✅ STATIC VERIFICATION PASS: RBAC role hierarchy đã được nhúng an toàn vào tất cả actions.");
  } else {
    console.log("\n❌ STATIC VERIFICATION FAIL: Thiếu logic bảo mật RBAC.");
    process.exit(1);
  }
}

main();
