import * as fs from 'fs';
import * as path from 'path';

function main() {
  console.log("=== KIỂM TRA UI ROLE FILTER (STATIC AUDIT) ===\n");
  
  const pagePath = path.join(__dirname, '..', 'src', 'app', '(dashboard)', 'users', 'page.tsx');
  const clientPath = path.join(__dirname, '..', 'src', 'components', 'users', 'user-management-client.tsx');
  const page = fs.readFileSync(pagePath, 'utf-8');
  const client = fs.readFileSync(clientPath, 'utf-8');

  // Page passes current user role
  const passesRole = page.includes('currentUserRole={session.role}');
  const passesAllowedRoles = page.includes('allowedRoles={');
  const usesGetAllowedRolesForActor = page.includes('getAllowedRolesForActor');

  // Client receives and uses role
  const clientAcceptsRole = client.includes('currentUserRole');
  const clientAcceptsAllowedRoles = client.includes('allowedRoles');
  const clientFiltersRoles = client.includes('allowedRoles.map(r =>');
  const clientHasCanManageUser = client.includes('canManageUser');
  const noHardcodedRoleOptions = !client.includes('<option value="ADMIN">Quản trị hệ thống</option>');
  const hasRoleLevelCheck = client.includes('ROLE_LEVEL');
  const hasDisabledWarning = client.includes('không đổi được') || client.includes('Không có quyền');

  console.log("--- Page Server ---");
  console.log(`- Truyền currentUserRole: ${passesRole ? '✅' : '❌'}`);
  console.log(`- Truyền allowedRoles: ${passesAllowedRoles ? '✅' : '❌'}`);
  console.log(`- Dùng getAllowedRolesForActor: ${usesGetAllowedRolesForActor ? '✅' : '❌'}`);

  console.log("\n--- Client Component ---");
  console.log(`- Nhận currentUserRole: ${clientAcceptsRole ? '✅' : '❌'}`);
  console.log(`- Nhận allowedRoles: ${clientAcceptsAllowedRoles ? '✅' : '❌'}`);
  console.log(`- Lọc role options động: ${clientFiltersRoles ? '✅' : '❌'}`);
  console.log(`- Có hàm canManageUser: ${clientHasCanManageUser ? '✅' : '❌'}`);
  console.log(`- Không còn hardcoded ADMIN option: ${noHardcodedRoleOptions ? '✅' : '❌'}`);
  console.log(`- Có ROLE_LEVEL check: ${hasRoleLevelCheck ? '✅' : '❌'}`);
  console.log(`- Có cảnh báo/disabled: ${hasDisabledWarning ? '✅' : '❌'}`);

  const allPass = passesRole && passesAllowedRoles && usesGetAllowedRolesForActor &&
    clientAcceptsRole && clientAcceptsAllowedRoles && clientFiltersRoles &&
    clientHasCanManageUser && noHardcodedRoleOptions && hasRoleLevelCheck && hasDisabledWarning;

  if (allPass) {
    console.log("\n✅ STATIC VERIFICATION PASS: UI role filter đã lọc đúng theo actor role.");
  } else {
    console.log("\n❌ STATIC VERIFICATION FAIL: UI vẫn còn lỗ hổng role filter.");
    process.exit(1);
  }
}

main();
