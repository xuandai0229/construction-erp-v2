import 'dotenv/config';
import prisma from '../src/lib/prisma';
import * as bcrypt from 'bcryptjs';
import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:3000';
const DEFAULT_PASSWORD = 'HanoiSeed@2026!';

async function main() {
  console.log("=== BẮT ĐẦU CHẠY PLAYWRIGHT UAT TEST CHO PROJECTS DETAIL ===");
  
  // 1. Tạo các tài khoản kiểm thử
  const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  
  const adminEmail = 'qa_projects_detail_admin@example.test';
  const directorEmail = 'qa_projects_detail_director@example.test';
  const staffEmail = 'qa_projects_detail_staff@example.test';
  
  // Dọn dẹp trước đề phòng
  await prisma.projectMember.deleteMany({
    where: {
      OR: [
        { user: { email: adminEmail } },
        { user: { email: directorEmail } },
        { user: { email: staffEmail } },
        { project: { code: { startsWith: 'QA_PROJECTS_DETAIL_' } } }
      ]
    }
  });
  await prisma.project.deleteMany({
    where: { code: { startsWith: 'QA_PROJECTS_DETAIL_' } }
  });
  await prisma.user.deleteMany({
    where: {
      email: { in: [adminEmail, directorEmail, staffEmail] }
    }
  });

  const testAdmin = await prisma.user.create({
    data: {
      email: adminEmail,
      name: 'QA Admin Detail Test',
      username: 'qa_admin_detail',
      password: hashedPassword,
      role: 'ADMIN',
      isActive: true,
    }
  });
  console.log(`- Đã tạo Admin Test: ${testAdmin.email}`);

  const testDirector = await prisma.user.create({
    data: {
      email: directorEmail,
      name: 'QA Director Detail Test',
      username: 'qa_director_detail',
      password: hashedPassword,
      role: 'DIRECTOR',
      isActive: true,
    }
  });
  console.log(`- Đã tạo Director Test: ${testDirector.email}`);

  const testStaff = await prisma.user.create({
    data: {
      email: staffEmail,
      name: 'QA Staff Detail Test',
      username: 'qa_staff_detail',
      password: hashedPassword,
      role: 'STAFF',
      isActive: true,
    }
  });
  console.log(`- Đã tạo Staff Test: ${testStaff.email}`);

  // 2. Khởi chạy Playwright
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Log console của browser ra console của test
  page.on('console', msg => {
    console.log(`[Browser Console] ${msg.type().toUpperCase()}: ${msg.text()}`);
  });

  // Log errors từ page
  page.on('pageerror', err => {
    console.log(`[Browser PageError] ${err.message}`);
  });

  const createdProjectIds: string[] = [];

  const cleanupDb = async () => {
    console.log("\n[Cleanup] Dọn dẹp dữ liệu DB...");
    if (createdProjectIds.length > 0) {
      await prisma.projectMember.deleteMany({
        where: { projectId: { in: createdProjectIds } }
      });
      await prisma.project.deleteMany({
        where: { id: { in: createdProjectIds } }
      });
      console.log(`- Đã dọn dẹp các dự án:`, createdProjectIds);
    }
    await prisma.projectMember.deleteMany({
      where: {
        OR: [
          { userId: testAdmin.id },
          { userId: testDirector.id },
          { userId: testStaff.id }
        ]
      }
    });
    await prisma.user.deleteMany({
      where: { id: { in: [testAdmin.id, testDirector.id, testStaff.id] } }
    });
    console.log("- Dọn dẹp user test hoàn tất.");
  };

  try {
    // -----------------------------------------------------------------
    // TEST 1: GUEST REDIRECT
    // -----------------------------------------------------------------
    console.log("\n[Test 1] Kiểm tra Guest truy cập các trang...");
    await page.goto(`${BASE_URL}/projects/new`);
    await page.waitForTimeout(1000);
    console.log(`  - Đi tới /projects/new: URL hiện tại = ${page.url()}`);
    if (page.url().includes('/login')) {
      console.log("    => PASS: Guest bị redirect về /login");
    } else {
      console.log("    => FAIL: Guest không bị redirect");
    }

    // -----------------------------------------------------------------
    // TEST 2: STAFF NO PRIVILEGES REDIRECT
    // -----------------------------------------------------------------
    console.log("\n[Test 2] Đăng nhập bằng tài khoản Staff (không có quyền)...");
    await page.goto(`${BASE_URL}/login`);
    console.log("  - Đợi input email hiển thị...");
    await page.waitForSelector('#email', { timeout: 10000 });
    await page.fill('#email', staffEmail);
    await page.fill('#password', DEFAULT_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    console.log(`  - Đăng nhập xong, URL hiện tại = ${page.url()}`);

    // Thử vào /projects/new
    console.log("  - STAFF thử vào /projects/new...");
    await page.goto(`${BASE_URL}/projects/new`);
    await page.waitForTimeout(1500);
    console.log(`    => URL hiện tại: ${page.url()}`);
    if (page.url().endsWith('/projects') || page.url().endsWith('/projects/')) {
      console.log("    => PASS: STAFF bị redirect về /projects (không có quyền manage)");
    } else {
      console.log("    => FAIL: STAFF vào được trang tạo mới");
    }

    // Đăng xuất
    console.log("  - Đăng xuất STAFF...");
    await page.evaluate(async () => {
      await fetch('/api/auth/logout', { method: 'POST' });
    });
    await page.waitForTimeout(1500);

    // -----------------------------------------------------------------
    // TEST 3: ADMIN FULL FLOW
    // -----------------------------------------------------------------
    console.log("\n[Test 3] Đăng nhập bằng tài khoản Admin...");
    await page.goto(`${BASE_URL}/login`);
    await page.waitForSelector('#email', { timeout: 10000 });
    await page.fill('#email', adminEmail);
    await page.fill('#password', DEFAULT_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    console.log(`  - Admin đăng nhập xong, URL hiện tại = ${page.url()}`);

    // Vào /projects/new
    console.log("  - Admin vào /projects/new...");
    await page.goto(`${BASE_URL}/projects/new`);
    await page.waitForTimeout(1500);
    
    const formHeading = await page.locator('h1').innerText();
    console.log(`    => Heading trang: "${formHeading}"`);
    if (formHeading.includes("Tạo mới công trình")) {
      console.log("    => PASS: Trang tạo mới hiển thị đúng heading");
    } else {
      console.log("    => FAIL: Heading không chính xác");
    }

    // 3.1. Test validation: startDate > endDate
    console.log("  - Nhập dữ liệu có startDate > endDate...");
    await page.fill('#code', 'QA_PROJECTS_DETAIL_CT01');
    await page.fill('#name', 'Dự án kiểm thử chi tiết QA');
    await page.fill('#investor', 'Chủ đầu tư QA');
    await page.fill('#location', 'Địa điểm QA');
    await page.fill('#startDate', '2026-05-10');
    await page.fill('#endDate', '2026-05-01'); // Kết thúc trước bắt đầu
    await page.click('button[type="submit"]');
    
    // Check lỗi
    console.log("  - Đợi hiển thị thông báo lỗi...");
    await page.waitForSelector('div:has-text("Ngày kết thúc không được nhỏ hơn ngày bắt đầu.")', { timeout: 5000 });
    console.log("    => PASS: Chặn thành công startDate > endDate trên server action và hiển thị lỗi tiếng Việt");

    // 3.2. Tạo công trình thành công
    console.log("  - Nhập lại TOÀN BỘ dữ liệu hợp lệ và click Tạo mới...");
    await page.fill('#code', 'QA_PROJECTS_DETAIL_CT01');
    await page.fill('#name', 'Dự án kiểm thử chi tiết QA');
    await page.fill('#investor', 'Chủ đầu tư QA');
    await page.fill('#location', 'Địa điểm QA');
    await page.fill('#startDate', '2026-05-10');
    await page.fill('#endDate', '2026-05-20');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2500);
    
    console.log(`    => Sau khi submit, URL = ${page.url()}`);
    if (page.url().endsWith('/projects') || page.url().endsWith('/projects/')) {
      console.log("    => PASS: Tạo công trình thành công và redirect về /projects");
    } else {
      const pageText = await page.evaluate(() => document.body.innerText);
      console.log(`    => FAIL: Không redirect về /projects. Nội dung trang:\n${pageText}`);
    }

    // Lấy ID dự án vừa tạo từ database
    const createdProject = await prisma.project.findFirst({
      where: { code: 'QA_PROJECTS_DETAIL_CT01', deletedAt: null }
    });
    if (createdProject) {
      createdProjectIds.push(createdProject.id);
      console.log(`  - Dự án mới được tạo có ID = ${createdProject.id}`);

      // 3.3. Xem trang chi tiết /projects/[id]
      console.log(`  - Đi tới trang chi tiết: /projects/${createdProject.id}...`);
      await page.goto(`${BASE_URL}/projects/${createdProject.id}`);
      await page.waitForTimeout(1500);

      const detailHeading = await page.locator('h1').innerText();
      console.log(`    => Tên dự án trong chi tiết: "${detailHeading}"`);
      if (detailHeading === createdProject.name) {
        console.log("    => PASS: Tên dự án khớp chính xác");
      } else {
        console.log("    => FAIL: Tên dự án không khớp");
      }

      // Kiểm tra định dạng ngày có đúng formatDateVN
      const startDateText = await page.locator('p:has-text("10/05/2026")').count();
      const endDateText = await page.locator('p:has-text("20/05/2026")').count();
      if (startDateText > 0 && endDateText > 0) {
        console.log("    => PASS: Ngày bắt đầu/kết thúc được hiển thị đúng định dạng dd/MM/yyyy");
      } else {
        console.log("    => FAIL: Ngày hiển thị sai định dạng hoặc lệch múi giờ");
      }

      // 3.4. Đi tới trang sửa /projects/[id]/edit
      console.log(`  - Đi tới trang sửa: /projects/${createdProject.id}/edit...`);
      await page.goto(`${BASE_URL}/projects/${createdProject.id}/edit`);
      await page.waitForTimeout(1500);

      const editHeading = await page.locator('h1').innerText();
      console.log(`    => Heading trang sửa: "${editHeading}"`);
      
      // Đổi trạng thái sang COMPLETED để test chặn sửa ở các vai trò thấp hơn
      console.log("  - Đổi trạng thái dự án sang Hoàn thành (COMPLETED) và lưu...");
      await page.selectOption('select[name="status"]', 'COMPLETED');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(2500);

      // -----------------------------------------------------------------
      // TEST 4: DIRECTOR ACCESS COMPLETED PROJECT EDIT (BLOCKED TO DETAIL PAGE)
      // -----------------------------------------------------------------
      console.log("\n[Test 4] Đăng xuất Admin và Đăng nhập Director để kiểm chứng completed project block...");
      await page.evaluate(async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
      });
      await page.waitForTimeout(1000);

      await page.goto(`${BASE_URL}/login`);
      await page.waitForSelector('#email', { timeout: 10000 });
      await page.fill('#email', directorEmail);
      await page.fill('#password', DEFAULT_PASSWORD);
      await page.click('button[type="submit"]');
      await page.waitForTimeout(2000);

      // Vào trang chi tiết dự án (Director là high-level nên được xem mọi dự án)
      console.log(`  - Director vào xem chi tiết /projects/${createdProject.id}...`);
      await page.goto(`${BASE_URL}/projects/${createdProject.id}`);
      await page.waitForTimeout(1500);
      console.log(`    => URL hiện tại: ${page.url()}`);
      if (page.url().includes(createdProject.id)) {
        console.log("    => PASS: Director xem được dự án");
      } else {
        console.log("    => FAIL: Director không xem được dự án");
      }

      // Thử vào trang sửa (Director bị chặn và redirect về detail page do dự án đã COMPLETED)
      console.log(`  - Director thử vào trang sửa /projects/${createdProject.id}/edit...`);
      await page.goto(`${BASE_URL}/projects/${createdProject.id}/edit`);
      await page.waitForTimeout(1500);
      console.log(`    => URL hiện tại: ${page.url()}`);
      if (page.url().endsWith(`/projects/${createdProject.id}`) || page.url().endsWith(`/projects/${createdProject.id}/`)) {
        console.log("    => PASS: Director bị chặn sửa dự án đã hoàn thành và redirect về trang chi tiết thành công");
      } else {
        console.log("    => FAIL: Director không bị redirect về trang chi tiết");
      }
    } else {
      console.log("  - LỖI: Không tìm thấy dự án test vừa tạo trong DB.");
    }

  } catch (error) {
    console.error("LỖI RUNTIME TRONG QUÁ TRÌNH CHẠY PLAYWRIGHT:", error);
  } finally {
    await browser.close();
    await cleanupDb();
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
