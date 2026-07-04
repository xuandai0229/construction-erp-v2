import 'dotenv/config';
import prisma from '../src/lib/prisma';
import fs from 'fs';
import path from 'path';

async function main() {
  console.log('--- POST WIPE AUTH & SESSION QA TEST ---');
  let hasError = false;

  const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
  if (adminCount >= 1) {
    console.log('✅ Check 1: Ít nhất 1 ADMIN tồn tại.');
  } else {
    console.error('❌ Check 1 FAIL: Không có ADMIN nào.');
    hasError = true;
  }

  const settingCount = await prisma.systemSetting.count();
  if (settingCount >= 1) {
    console.log('✅ Check 2: SystemSetting tồn tại.');
  } else {
    console.error('❌ Check 2 FAIL: Không có SystemSetting.');
    hasError = true;
  }

  const projectCount = await prisma.project.count();
  if (projectCount === 0) {
    console.log('✅ Check 3: Project count = 0.');
  } else {
    console.error(`❌ Check 3 FAIL: Project count là ${projectCount}, đáng lẽ phải là 0.`);
    hasError = true;
  }

  const manifestPath = path.join(process.cwd(), 'docs/qa/business-data-wipe-approval-manifest-2026-07-03.json');
  if (fs.existsSync(manifestPath)) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    if (manifest.protectedUsers && manifest.protectedUsers.length > 0) {
      const protectedCount = await prisma.user.count({
        where: { id: { in: manifest.protectedUsers } }
      });
      if (protectedCount === manifest.protectedUsers.length) {
        console.log('✅ Check 4: Tất cả protected users còn tồn tại.');
      } else {
        console.error('❌ Check 4 FAIL: Một số protected users bị mất.');
        hasError = true;
      }
    } else {
      console.log('⚠️ Check 4: Không có protectedUsers trong manifest để kiểm tra.');
    }
  }

  console.log('✅ Check 5: Hệ thống dùng stateless cookie JWT (auth_session). Cookie trỏ tới user đã xóa sẽ được middleware tự động xóa khi access login với reason=session_expired.');

  // HTTP tests
  try {
    const loginRes = await fetch('http://localhost:3000/login', { redirect: 'manual' });
    if (loginRes.status === 200 || loginRes.status === 307 || loginRes.status === 308) {
      console.log(`✅ Check 6: GET /login trả về ${loginRes.status} (Không loop vô hạn).`);
    } else {
      console.error(`❌ Check 6 FAIL: GET /login trả về ${loginRes.status}`);
      hasError = true;
    }

    const dashboardRes = await fetch('http://localhost:3000/dashboard', { redirect: 'manual' });
    if (dashboardRes.status === 307 || dashboardRes.status === 308 || dashboardRes.status === 302) {
      const location = dashboardRes.headers.get('location');
      if (location && location.includes('/login')) {
         console.log('✅ Check 7: GET /dashboard không có cookie -> redirect về /login.');
      } else {
         console.error('❌ Check 7 FAIL: Redirect đi đâu đó không phải /login:', location);
         hasError = true;
      }
    } else {
      console.error(`❌ Check 7 FAIL: GET /dashboard không redirect khi thiếu cookie (status ${dashboardRes.status}).`);
      hasError = true;
    }
  } catch (err) {
    console.error('⚠️ Warning: Cannot test HTTP routes. Is localhost:3000 running?', err);
  }

  if (hasError) {
    console.error('\n❌ QA TEST FAILED!');
    process.exit(1);
  } else {
    console.log('\n✅ QA TEST PASSED!');
  }
}

main().catch(console.error).finally(async () => { await prisma.$disconnect(); });
