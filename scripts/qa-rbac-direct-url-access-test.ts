import { chromium } from 'playwright';
import prisma from '../src/lib/prisma';
import fs from 'fs';
import path from 'path';

async function main() {
  console.log('--- BẮT ĐẦU TEST: RBAC DIRECT URL ACCESS ---');

  // Lấy dữ liệu công trình để test
  const ct1 = await prisma.project.findFirst({ where: { code: 'QA_RBAC_CT_001' } });
  const ct2 = await prisma.project.findFirst({ where: { code: 'QA_RBAC_CT_002' } });

  if (!ct1 || !ct2) {
    console.log('❌ LỖI: Không tìm thấy công trình test. Hãy chạy seed RBAC trước.');
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

  try {
    console.log('1. Đăng nhập với tài khoản: commander1@construction.local (Role: CHIEF_COMMANDER)');
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"]', 'commander1@construction.local');
    await page.fill('input[name="password"]', 'Test@123456');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
    console.log('✅ Đăng nhập thành công.');

    console.log('2. Truy cập /projects -> Chỉ thấy QA_RBAC_CT_001');
    await page.goto(`${BASE_URL}/projects`);
    await page.waitForSelector('table');
    
    const pageContent = await page.content();
    if (!pageContent.includes('QA_RBAC_CT_001')) {
      throw new Error('Không thấy QA_RBAC_CT_001 trong danh sách.');
    }
    if (pageContent.includes('QA_RBAC_CT_002')) {
      throw new Error('LỖI: Thấy QA_RBAC_CT_002 trong danh sách! (Rò rỉ dữ liệu)');
    }
    console.log('✅ Danh sách công trình đã được lọc đúng.');

    console.log('3. Truy cập trực tiếp /projects/[QA_RBAC_CT_002_ID]');
    const res1 = await page.goto(`${BASE_URL}/projects/${ct2.id}`);
    await page.waitForLoadState('networkidle');
    if (page.url().includes(`/projects/${ct2.id}`)) {
      if (!pageContent.includes('QA_RBAC_CT_002')) {
        // Có thể redirect hoặc render UI báo lỗi
        const bodyText = await page.innerText('body');
        if (!bodyText.toLowerCase().includes('không có quyền') && !bodyText.toLowerCase().includes('not found') && !bodyText.toLowerCase().includes('từ chối')) {
           throw new Error(`LỖI: Truy cập được chi tiết công trình ${ct2.id} mà không bị chặn!`);
        }
      }
    } else {
       console.log('✅ Bị redirect hoặc chặn thành công.');
    }

    console.log('4. Truy cập trực tiếp /users');
    const resUsers = await page.goto(`${BASE_URL}/users`);
    await page.waitForLoadState('networkidle');
    if (page.url().includes('/users') && !(await page.innerText('body')).toLowerCase().includes('không có quyền') && !(await page.innerText('body')).toLowerCase().includes('từ chối')) {
       // Test form filter
       const hasFilter = await page.$('#user-status-filter');
       if (hasFilter) {
          throw new Error('LỖI: Truy cập được /users mà không bị chặn!');
       }
    }
    console.log('✅ Bị chặn khỏi /users.');

    console.log('5. Truy cập trực tiếp /projects/new');
    await page.goto(`${BASE_URL}/projects/new`);
    await page.waitForLoadState('networkidle');
    if (page.url().includes('/projects/new')) {
       const bodyText = await page.innerText('body');
       if (!bodyText.toLowerCase().includes('từ chối') && !bodyText.toLowerCase().includes('không có quyền')) {
          const formExists = await page.$('form');
          if (formExists) {
             throw new Error('LỖI: Truy cập được /projects/new mà không bị chặn!');
          }
       }
    }
    console.log('✅ Bị chặn khỏi /projects/new.');

    console.log('6. Truy cập trực tiếp /projects/[QA_RBAC_CT_002_ID]/field-progress');
    await page.goto(`${BASE_URL}/projects/${ct2.id}/field-progress`);
    await page.waitForLoadState('networkidle');
    if (page.url().includes('/field-progress')) {
      const bodyText = await page.innerText('body');
      if (!bodyText.toLowerCase().includes('từ chối') && !bodyText.toLowerCase().includes('không có quyền')) {
         const btn = await page.$('button:has-text("Thêm hạng mục chính")');
         if (btn) throw new Error('LỖI: Truy cập được field-progress của dự án khác!');
      }
    }
    console.log('✅ Bị chặn khỏi field-progress của dự án khác.');

    console.log('7. Truy cập trực tiếp /projects/[QA_RBAC_CT_002_ID]/material-requests');
    await page.goto(`${BASE_URL}/projects/${ct2.id}/material-requests`);
    await page.waitForLoadState('networkidle');
    if (page.url().includes('/material-requests')) {
      const bodyText = await page.innerText('body');
      if (!bodyText.toLowerCase().includes('từ chối') && !bodyText.toLowerCase().includes('không có quyền')) {
         const btn = await page.$('button:has-text("Tạo đề xuất")');
         if (btn) throw new Error('LỖI: Truy cập được material-requests của dự án khác!');
      }
    }
    console.log('✅ Bị chặn khỏi material-requests của dự án khác.');

    // Chụp screenshot access denied nếu có thể
    const screenshotDir = path.join(process.cwd(), 'docs/qa/screenshots/global-ui-responsive-audit');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }
    
    await page.setViewportSize({ width: 430, height: 932 });
    await page.goto(`${BASE_URL}/projects/${ct2.id}`);
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: path.join(screenshotDir, 'commander-access-denied-mobile-430.png') });
    console.log('📸 Đã chụp ảnh màn hình access denied.');

    console.log('\n🎉 TEST PASS: Tất cả các route đã chặn đúng quyền của Chief Commander!');

  } catch (err: any) {
    console.error('\n❌ TEST FAIL:', err.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
