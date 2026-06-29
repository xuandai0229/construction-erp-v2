import * as fs from 'fs';
import * as path from 'path';

function main() {
  console.log("=== KIỂM TRA BẢO MẬT RESET PASSWORD & DETAIL VIEW (STATIC) ===\n");
  
  const actionsPath = path.join(__dirname, '..', 'src', 'app', '(dashboard)', 'users', 'actions.ts');
  const clientPath = path.join(__dirname, '..', 'src', 'components', 'users', 'user-management-client.tsx');
  const pagePath = path.join(__dirname, '..', 'src', 'app', '(dashboard)', 'users', 'page.tsx');
  
  const actionsCode = fs.readFileSync(actionsPath, 'utf-8');
  const clientCode = fs.readFileSync(clientPath, 'utf-8');
  const pageCode = fs.readFileSync(pagePath, 'utf-8');

  // --- 1. Detail View Leak Check ---
  // Ensure we don't pass password or passwordHash from page to client
  const pageLeaksPassword = pageCode.includes('password:') && !pageCode.includes('password: true') && !pageCode.includes('formPassword'); 
  const clientRendersPassword = clientCode.includes('{detailUser.password}') || clientCode.includes('{detailUser.passwordHash}');
  const hasSecurityWarning = clientCode.includes('Mật khẩu hiện tại không thể xem lại');

  // --- 2. Action Logic ---
  const usesBcrypt = actionsCode.includes('bcrypt.hash');
  const actionHasTempPassword = actionsCode.includes('generateSecurePassword') || actionsCode.includes('Math.random()');
  const actionHasAuditLog = actionsCode.includes('RESET_USER_PASSWORD');
  const actionChecksHierarchy = actionsCode.includes('assertRoleHierarchy') && actionsCode.indexOf('resetUserPassword') > -1;
  const actionHasSelfResetGuard = actionsCode.includes('đổi mật khẩu chính mình');

  // --- 3. Client UI Logic ---
  const clientHasTempPasswordState = clientCode.includes('tempPassword');
  const clientShowsGeneratedPasswordOnce = clientCode.includes('{tempPassword}') && clientCode.includes('chỉ hiển thị một lần');
  const clientNoPlaintextStorage = !clientCode.includes('plainPassword');

  console.log("--- Detail View & Client State ---");
  console.log(`- Page không serialize password về client: ${!pageLeaksPassword ? '✅' : '❌'}`);
  console.log(`- Client không render password/hash gốc: ${!clientRendersPassword ? '✅' : '❌'}`);
  console.log(`- Có cảnh báo bảo mật về mật khẩu một chiều: ${hasSecurityWarning ? '✅' : '❌'}`);

  console.log("\n--- Server Action (actions.ts) ---");
  console.log(`- Sinh mật khẩu tạm (Mode B): ${actionHasTempPassword ? '✅' : '❌'}`);
  console.log(`- Hash password bằng bcrypt: ${usesBcrypt ? '✅' : '❌'}`);
  console.log(`- Ghi Audit Log khi reset: ${actionHasAuditLog ? '✅' : '❌'}`);
  console.log(`- Guard: Role Hierarchy: ${actionChecksHierarchy ? '✅' : '❌'}`);
  console.log(`- Guard: Chặn self-reset qua admin: ${actionHasSelfResetGuard ? '✅' : '❌'}`);

  console.log("\n--- UI Reset Password (Client) ---");
  console.log(`- Sử dụng state tempPassword thay vì input: ${clientHasTempPasswordState ? '✅' : '❌'}`);
  console.log(`- Hiển thị mật khẩu tạm và cảnh báo 1 lần: ${clientShowsGeneratedPasswordOnce ? '✅' : '❌'}`);
  console.log(`- Không lưu plainPassword field: ${clientNoPlaintextStorage ? '✅' : '❌'}`);

  const allPass = 
    !pageLeaksPassword && !clientRendersPassword && hasSecurityWarning &&
    usesBcrypt && actionHasTempPassword && actionHasAuditLog && actionChecksHierarchy && actionHasSelfResetGuard &&
    clientHasTempPasswordState && clientShowsGeneratedPasswordOnce && clientNoPlaintextStorage;

  if (allPass) {
    console.log("\n✅ STATIC VERIFICATION PASS: Chức năng Detail View và Reset Password đạt chuẩn bảo mật (Mode B).");
  } else {
    console.log("\n❌ STATIC VERIFICATION FAIL: Chức năng còn lỗi bảo mật hoặc thiếu logic.");
    process.exit(1);
  }
}

main();
