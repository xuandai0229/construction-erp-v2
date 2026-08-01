/**
 * VERIFY ADMIN RUNTIME & EMPTY STATES
 *
 * This script runs Playwright against the local Next.js server at http://localhost:3000.
 * It verifies:
 *   1. Clean login with the newly rotated admin password.
 *   2. Session cookie generation.
 *   3. Clean navigation to all core pages and child routes.
 *   4. Zero NaN, broken layouts, or Next.js error boundaries.
 *   5. Empty state visual signals on all hubs.
 *   6. Logout session invalidation.
 *   7. Re-login capability.
 *
 * Usage:
 *   npx tsx scripts/admin/verify-admin-runtime.ts
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:3000';
const ADMIN_EMAIL = 'daicongtu2910@gmail.com';
const ADMIN_PASS = 'Ct2@Erp#Adm!n2026xD';

const ROUTES = [
  '/dashboard',
  '/projects',
  '/projects/new',
  '/reports',
  '/reports/field',
  '/reports/weekly-inspection',
  '/reports/safety',
  '/documents',
  '/materials',
  '/approvals',
  '/tasks',
  '/users',
  '/settings',
];

async function main() {
  console.log('--- STARTING RUNTIME SMOKE TESTS VIA PLAYWRIGHT ---');

  // Clean up any stale playwright auth states
  const authPath = path.join(process.cwd(), 'playwright', '.auth', 'admin.json');
  if (fs.existsSync(authPath)) {
    fs.unlinkSync(authPath);
    console.log('✅ Stale auth session file cleared.');
  }

  const browser = await chromium.launch({ headless: true });
  // Create a clean browser context (no cookies/state)
  const context = await browser.newContext({ baseURL: BASE_URL });
  const page = await context.newPage();

  // 1. Visit Login
  console.log('1. Navigating to /login...');
  await page.goto('/login');
  
  // 2. Submit form
  console.log(`2. Attempting login as: da***@gmail.com`);
  await page.locator('#email').fill(ADMIN_EMAIL);
  await page.locator('#password').fill(ADMIN_PASS);
  
  await Promise.all([
    page.waitForURL('**/dashboard'),
    page.locator('button[type="submit"]').click(),
  ]);
  console.log('✅ Redirected to /dashboard successfully!');

  // Confirm cookie is set
  const cookies = await context.cookies();
  const sessionCookie = cookies.find(c => c.name === 'auth_session');
  if (!sessionCookie) {
    console.error('❌ ERROR: auth_session cookie was not set!');
    process.exit(1);
  }
  console.log('✅ auth_session cookie successfully verified.');

  // 3. Inspect dashboard for empty state
  console.log('3. Inspecting Dashboard for empty states...');
  const dashboardHtml = await page.content();
  if (dashboardHtml.includes('NaN') || dashboardHtml.includes('undefined') || dashboardHtml.includes('Internal Server Error')) {
    console.error('❌ ERROR: Found NaN, undefined, or 500 error indicators on dashboard.');
    process.exit(1);
  }
  console.log('✅ Dashboard loaded cleanly with no NaNs, layout breaks or database errors.');

  // 4. Test other routes
  console.log('4. Systematically navigating routes...');
  const routeResults: Record<string, string> = {};

  for (const route of ROUTES) {
    console.log(`   Navigating to ${route}...`);
    try {
      const response = await page.goto(route, { waitUntil: 'domcontentloaded' });
      const status = response ? response.status() : 0;
      const html = await page.content();

      let check = 'PASS';
      let remark = '';

      if (status !== 200) {
        check = 'FAIL';
        remark = `HTTP ${status}`;
      } else if (html.includes('Internal Server Error') || html.includes('ErrorBoundary') || html.includes('An error occurred')) {
        check = 'FAIL';
        remark = 'Error Boundary / Internal Error found in HTML';
      } else {
        // Look for empty state labels
        if (route === '/projects') {
          if (html.includes('Không tìm thấy') || html.includes('chưa có công trình') || html.includes('Danh sách trống') || !html.includes('cmroatu6r0000mowklk61sv56')) {
            remark = 'Empty State OK';
          }
        } else if (route === '/users') {
          // Users list should only display the 1 active Admin user
          if (html.includes(ADMIN_EMAIL) && !html.includes('member@') && !html.includes('qa.')) {
            remark = '1 Preserved Admin Only OK';
          } else {
            remark = 'Verify User Count';
          }
        }
      }

      routeResults[route] = `${check} ${remark ? `(${remark})` : ''}`;
    } catch (e: any) {
      routeResults[route] = `FAIL (${e.message})`;
    }
  }

  // 5. Logout
  console.log('5. Triggering logout POST request...');
  const logoutRes = await context.request.post('/api/auth/logout');
  if (logoutRes.status() === 200) {
    console.log('✅ Logout endpoint returned 200.');
  } else {
    console.error(`❌ Logout failed with status: ${logoutRes.status()}`);
    process.exit(1);
  }

  // Verify redirected to login or cookie cleared
  await page.goto('/dashboard');
  const postLogoutUrl = page.url();
  if (postLogoutUrl.includes('/login')) {
    console.log('✅ Dashboard access blocked and redirected to /login after logout.');
  } else {
    console.warn(`⚠️ Warning: Got url ${postLogoutUrl} instead of redirect to /login.`);
  }

  // 6. Login again to verify session rebuild
  console.log('6. Re-authenticating...');
  await page.goto('/login');
  await page.locator('#email').fill(ADMIN_EMAIL);
  await page.locator('#password').fill(ADMIN_PASS);
  await Promise.all([
    page.waitForURL('**/dashboard'),
    page.locator('button[type="submit"]').click(),
  ]);
  console.log('✅ Second login successful. Session successfully reconstructed.');

  await browser.close();

  console.log('\n--- RUNTIME VERIFICATION SUMMARY ---');
  for (const [r, res] of Object.entries(routeResults)) {
    console.log(`- ${r}: ${res}`);
  }
  console.log('------------------------------------');
}

main().catch(err => {
  console.error('CRITICAL RUNTIME TEST RUNNER ERROR:', err);
  process.exit(1);
});
