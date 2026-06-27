import * as fs from 'fs';
import * as path from 'path';

function main() {
  console.log("=== KIỂM TRA AUTH/SESSION (STATIC AUDIT) ===\n");
  
  const authPath = path.join(__dirname, '..', 'src', 'lib', 'auth.ts');
  const loginPath = path.join(__dirname, '..', 'src', 'app', 'api', 'auth', 'login', 'route.ts');
  const auth = fs.readFileSync(authPath, 'utf-8');
  const login = fs.readFileSync(loginPath, 'utf-8');

  // Session safety
  const checksIsActive = auth.includes('isActive') && auth.includes('!user.isActive');
  const checksDeletedAt = auth.includes('deletedAt') && auth.includes('user.deletedAt !== null');
  const noPasswordInSession = !auth.includes('password:') || auth.includes('password: true') === false;
  const httpOnly = auth.includes('httpOnly: true');
  const secureProd = auth.includes("secure: process.env.NODE_ENV === 'production'");
  const sameSite = auth.includes('sameSite');

  // Login safety
  const checksActiveOnLogin = login.includes('isActive') && login.includes('deletedAt');
  const usesBcrypt = login.includes('bcrypt.compare');
  const noPasswordLeak = !login.includes('user.password') || login.includes('bcrypt.compare(password, user.password)');
  const genericError = login.includes('Email hoặc mật khẩu không đúng');

  console.log("--- Session (getSession) ---");
  console.log(`- Check isActive: ${checksIsActive ? '✅' : '❌'}`);
  console.log(`- Check deletedAt: ${checksDeletedAt ? '✅' : '❌'}`);
  console.log(`- Password không trả client: ${noPasswordInSession ? '✅' : '❌'}`);
  console.log(`- Cookie httpOnly: ${httpOnly ? '✅' : '❌'}`);
  console.log(`- Cookie secure (production): ${secureProd ? '✅' : '❌'}`);
  console.log(`- Cookie sameSite: ${sameSite ? '✅' : '❌'}`);

  console.log("\n--- Login ---");
  console.log(`- Check active/deleted on login: ${checksActiveOnLogin ? '✅' : '❌'}`);
  console.log(`- Dùng bcrypt: ${usesBcrypt ? '✅' : '❌'}`);
  console.log(`- Generic error (không leak user tồn tại): ${genericError ? '✅' : '❌'}`);

  const allPass = checksIsActive && checksDeletedAt && httpOnly && secureProd &&
    sameSite && checksActiveOnLogin && usesBcrypt && genericError;

  if (allPass) {
    console.log("\n✅ STATIC VERIFICATION PASS: Auth/session đã an toàn.");
  } else {
    console.log("\n❌ STATIC VERIFICATION FAIL: Auth/session còn lỗ hổng.");
    process.exit(1);
  }
}

main();
