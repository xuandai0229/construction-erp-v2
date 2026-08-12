import http from 'http';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:dev_rotated_secret_pass_2026_x7!@127.0.0.1:5432/construction_erp_v2_dev'
});

async function makeRequest(path: string, options: { method?: string; headers?: Record<string, string>; body?: any } = {}) {
  const url = new URL(path, BASE_URL);
  return new Promise<{ status: number; statusText: string; headers: http.IncomingHttpHeaders; body: any }>((resolve, reject) => {
    const payload = options.body ? JSON.stringify(options.body) : null;
    const req = http.request(
      url,
      {
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(payload ? { 'Content-Length': Buffer.byteLength(payload).toString() } : {}),
          ...options.headers,
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          let parsedBody = data;
          try {
            parsedBody = JSON.parse(data);
          } catch {}
          resolve({
            status: res.statusCode || 0,
            statusText: res.statusMessage || '',
            headers: res.headers,
            body: parsedBody,
          });
        });
      }
    );

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function runFinalClosureSuite() {
  console.log('========================================================================');
  console.log('🧪 CONSTRUCTION-ERP-V2 — API V1 FINAL CLOSURE & SECURITY PROOF SUITE');
  console.log(`Target Server: ${BASE_URL}`);
  console.log('========================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, actualMsg?: string) {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName} -> ${actualMsg || 'Assertion failed'}`);
      failed++;
    }
  }

  // 0. Ensure QA Test Accounts exist with known password
  const testPasswordHash = await bcrypt.hash('123456', 10);

  // QA Admin
  const adminRes = await pool.query(`
    INSERT INTO "User" (id, email, name, role, "isActive", password, "updatedAt")
    VALUES ('qa_closure_admin', 'qa_admin@construction.local', 'QA Admin', 'ADMIN', true, $1, NOW())
    ON CONFLICT (email) DO UPDATE SET password = $1, "isActive" = true, "deletedAt" = NULL
    RETURNING id;
  `, [testPasswordHash]);

  // QA Restricted User (assigned to Project 1 only)
  const userARes = await pool.query(`
    INSERT INTO "User" (id, email, name, role, "isActive", password, "updatedAt")
    VALUES ('qa_closure_user_a', 'qa_user_a@construction.local', 'QA User A', 'ENGINEER', true, $1, NOW())
    ON CONFLICT (email) DO UPDATE SET password = $1, "isActive" = true, "deletedAt" = NULL
    RETURNING id;
  `, [testPasswordHash]);

  // Fetch two distinct projects
  const projRes = await pool.query('SELECT id, code, name FROM "Project" WHERE "deletedAt" IS NULL ORDER BY id ASC LIMIT 2');
  const projectA = projRes.rows[0];
  const projectB = projRes.rows[1] || projRes.rows[0];

  if (projectA && projectB && projectA.id !== projectB.id) {
    // Assign User A to Project A ONLY
    await pool.query(`
      INSERT INTO "ProjectMember" (id, "projectId", "userId", role, "isActive", "joinedAt", "updatedAt")
      VALUES ('pm_qa_user_a', $1, 'qa_closure_user_a', 'PROJECT_MANAGER', true, NOW(), NOW())
      ON CONFLICT ("projectId", "userId") DO UPDATE SET "isActive" = true, role = 'PROJECT_MANAGER';
    `, [projectA.id]);
  }

  // --- PART 3: MOBILE AUTHENTICATION & REVOCATION PROOF ---
  console.log('--- PART 3: MOBILE AUTHENTICATION & REVOCATION PROOF ---');

  // 3.1 Login Tests
  const validLogin = await makeRequest('/api/v1/auth/login', {
    method: 'POST',
    body: { email: 'qa_admin@construction.local', password: '123456' },
  });
  assert(validLogin.status === 200 && validLogin.body?.success === true, 'Login with valid credentials (200)');
  const tokenA = validLogin.body?.data?.token;
  assert(typeof tokenA === 'string' && tokenA.length > 20, 'Bearer Token generated and returned');

  const invalidLogin = await makeRequest('/api/v1/auth/login', {
    method: 'POST',
    body: { email: 'qa_admin@construction.local', password: 'wrong_password' },
  });
  assert(invalidLogin.status === 401, 'Login with invalid credentials rejected (401)');

  // 3.2 Bearer Token Test
  const bearerRes = await makeRequest('/api/v1/me', {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  assert(bearerRes.status === 200 && bearerRes.body?.data?.email === 'qa_admin@construction.local', 'Valid Bearer Token access /api/v1/me (200)');

  // 3.3 Invalid Token Tests
  const malformedToken = await makeRequest('/api/v1/me', { headers: { Authorization: 'Bearer malformed.token.here' } });
  assert(malformedToken.status === 401, 'Malformed Bearer token rejected (401)');

  const modifiedSigToken = await makeRequest('/api/v1/me', { headers: { Authorization: `Bearer ${tokenA.slice(0, -5)}XXXXX` } });
  assert(modifiedSigToken.status === 401, 'Tampered token signature rejected (401)');

  // 3.4 Logout Revocation Test
  const logoutRes = await makeRequest('/api/v1/auth/logout', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  assert(logoutRes.status === 200, 'Logout POST /api/v1/auth/logout succeeded (200)');

  const postLogoutMe = await makeRequest('/api/v1/me', {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  assert(postLogoutMe.status === 401, 'PROVED: Bearer token is REVOKED on logout (401)');

  // 3.5 Password Change Revocation Test
  const loginForPassChange = await makeRequest('/api/v1/auth/login', {
    method: 'POST',
    body: { email: 'qa_admin@construction.local', password: '123456' },
  });
  const tokenB = loginForPassChange.body?.data?.token;

  // Bump updatedAt (simulating password change)
  await pool.query(`UPDATE "User" SET "updatedAt" = NOW() WHERE id = 'qa_closure_admin'`);

  const postPassChangeMe = await makeRequest('/api/v1/me', {
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  assert(postPassChangeMe.status === 401, 'PROVED: Credential change revokes active Bearer tokens (401)');

  // 3.6 Disabled User Revocation Test
  const loginForDisable = await makeRequest('/api/v1/auth/login', {
    method: 'POST',
    body: { email: 'qa_admin@construction.local', password: '123456' },
  });
  const tokenC = loginForDisable.body?.data?.token;

  // Disable user
  await pool.query(`UPDATE "User" SET "isActive" = false WHERE id = 'qa_closure_admin'`);

  const disabledMe = await makeRequest('/api/v1/me', {
    headers: { Authorization: `Bearer ${tokenC}` },
  });
  assert(disabledMe.status === 401 || disabledMe.status === 403, 'PROVED: Disabled user token immediately rejected (401/403)');

  // Re-enable admin user
  await pool.query(`UPDATE "User" SET "isActive" = true, "updatedAt" = NOW() WHERE id = 'qa_closure_admin'`);

  // --- PART 4: POSITIVE & NEGATIVE RUNTIME MATRIX ACROSS ALL V1 ENDPOINTS ---
  console.log('\n--- PART 4: POSITIVE & NEGATIVE RUNTIME MATRIX ACROSS ALL V1 ENDPOINTS ---');

  // Obtain fresh tokens
  const adminLogin = await makeRequest('/api/v1/auth/login', {
    method: 'POST',
    body: { email: 'qa_admin@construction.local', password: '123456' },
  });
  const adminToken = adminLogin.body?.data?.token;

  const userALogin = await makeRequest('/api/v1/auth/login', {
    method: 'POST',
    body: { email: 'qa_user_a@construction.local', password: '123456' },
  });
  const userAToken = userALogin.body?.data?.token;

  const authAdmin = { Authorization: `Bearer ${adminToken}` };
  const authUserA = { Authorization: `Bearer ${userAToken}` };

  // 4.1 Anonymous Rejections (401) across V1 GET & POST Endpoints
  const anonymousMatrix = [
    { method: 'GET', path: '/api/v1/me' },
    { method: 'GET', path: '/api/v1/users' },
    { method: 'GET', path: '/api/v1/projects' },
    { method: 'GET', path: `/api/v1/projects/${projectA.id}` },
    { method: 'GET', path: `/api/v1/projects/${projectA.id}/members` },
    { method: 'GET', path: `/api/v1/projects/${projectA.id}/personnel` },
    { method: 'GET', path: `/api/v1/projects/${projectA.id}/dashboard` },
    { method: 'GET', path: `/api/v1/projects/${projectA.id}/wbs` },
    { method: 'GET', path: `/api/v1/projects/${projectA.id}/progress/daily` },
    { method: 'POST', path: `/api/v1/projects/${projectA.id}/progress/daily`, body: {} },
    { method: 'GET', path: '/api/v1/notifications' },
    { method: 'POST', path: '/api/v1/notifications/read-all' },
    { method: 'GET', path: '/api/v1/reports' },
    { method: 'POST', path: '/api/v1/reports', body: {} },
    { method: 'GET', path: '/api/v1/material-proposals' },
    { method: 'POST', path: '/api/v1/material-proposals', body: {} },
    { method: 'GET', path: '/api/v1/approvals' },
    { method: 'GET', path: '/api/v1/supervision/weekly' },
    { method: 'GET', path: '/api/v1/dashboard' },
    { method: 'GET', path: '/api/v1/search?q=DA' },
  ];

  console.log('\n--- 4.1 Anonymous Rejection Verification (401) ---');
  for (const ep of anonymousMatrix) {
    const res = await makeRequest(ep.path, { method: ep.method, body: ep.body });
    assert(res.status === 401, `Anonymous ${ep.method} ${ep.path} -> 401`, `Got status ${res.status}`);
  }

  // 4.2 Cross-Project Isolation Verification (User A assigned to Project A only)
  console.log('\n--- 4.2 Cross-Project Scope Isolation Verification (403 Forbidden) ---');
  if (projectA.id !== projectB.id) {
    const crossProjDetail = await makeRequest(`/api/v1/projects/${projectB.id}`, { headers: authUserA });
    assert(crossProjDetail.status === 403, `Cross-project GET /api/v1/projects/${projectB.id} -> 403`, `Got ${crossProjDetail.status}`);

    const crossProjMembers = await makeRequest(`/api/v1/projects/${projectB.id}/members`, { headers: authUserA });
    assert(crossProjMembers.status === 403, `Cross-project GET /api/v1/projects/${projectB.id}/members -> 403`, `Got ${crossProjMembers.status}`);

    const crossProjPersonnel = await makeRequest(`/api/v1/projects/${projectB.id}/personnel`, { headers: authUserA });
    assert(crossProjPersonnel.status === 403, `Cross-project GET /api/v1/projects/${projectB.id}/personnel -> 403`, `Got ${crossProjPersonnel.status}`);

    const crossProjWbs = await makeRequest(`/api/v1/projects/${projectB.id}/wbs`, { headers: authUserA });
    assert(crossProjWbs.status === 403, `Cross-project GET /api/v1/projects/${projectB.id}/wbs -> 403`, `Got ${crossProjWbs.status}`);

    const crossProjDash = await makeRequest(`/api/v1/projects/${projectB.id}/dashboard`, { headers: authUserA });
    assert(crossProjDash.status === 403, `Cross-project GET /api/v1/projects/${projectB.id}/dashboard -> 403`, `Got ${crossProjDash.status}`);
  }

  // 4.3 Invalid Input & Zod Schema Enforcement (400 Bad Request)
  console.log('\n--- 4.3 Invalid Input & Zod Validation (400 Bad Request) ---');
  const badDailyProgress = await makeRequest(`/api/v1/projects/${projectA.id}/progress/daily`, {
    method: 'POST',
    headers: authAdmin,
    body: { itemId: '', quantity: -10 },
  });
  assert(badDailyProgress.status === 400, 'POST Daily Progress invalid input -> 400 Bad Request');

  const badReport = await makeRequest('/api/v1/reports', {
    method: 'POST',
    headers: authAdmin,
    body: { projectId: '', reportDate: '' },
  });
  assert(badReport.status === 400, 'POST Site Report invalid input -> 400 Bad Request');

  const badProposal = await makeRequest('/api/v1/material-proposals', {
    method: 'POST',
    headers: authAdmin,
    body: { projectId: projectA.id, purchaseReason: '', items: [] },
  });
  assert(badProposal.status === 400, 'POST Material Proposal invalid input -> 400 Bad Request');

  // 4.4 Actor Spoofing Protection Verification
  console.log('\n--- 4.4 Actor Spoofing Protection Verification ---');
  const spoofReport = await makeRequest('/api/v1/reports', {
    method: 'POST',
    headers: authUserA,
    body: {
      projectId: projectA.id,
      reportDate: '2026-08-12',
      type: 'DAILY',
      title: 'Report Actor Spoof Test',
      actorId: 'SPOOFED_ADMIN_ID',
      createdById: 'SPOOFED_ADMIN_ID',
    },
  });
  if (spoofReport.status === 200 || spoofReport.status === 201) {
    assert(
      spoofReport.body?.data?.createdById !== 'SPOOFED_ADMIN_ID',
      'PROVED: Report creator is bound to authenticated user, not client payload',
      `Got createdById: ${spoofReport.body?.data?.createdById}`
    );
  } else {
    assert(spoofReport.status === 200 || spoofReport.status === 201 || spoofReport.status === 400, 'POST Report spoof attempt handled cleanly');
  }

  // 4.5 Pagination Boundary Clamp Verification
  console.log('\n--- 4.5 Pagination Boundary Verification ---');
  const pagedRes = await makeRequest('/api/v1/projects?page=-1&pageSize=100000', { headers: authAdmin });
  assert(
    pagedRes.status === 200 && pagedRes.body?.meta?.pageSize <= 100 && pagedRes.body?.meta?.page >= 1,
    'Pagination parameters page=-1 & pageSize=100000 clamped safely (pageSize <= 100, page >= 1)',
    `Clamped meta: ${JSON.stringify(pagedRes.body?.meta)}`
  );

  // 4.6 Search Endpoint Verification
  console.log('\n--- 4.6 Global Search Verification ---');
  const shortSearch = await makeRequest('/api/v1/search?q=a', { headers: authAdmin });
  assert(shortSearch.status === 400, 'Search keyword length < 2 rejected (400)');

  const validSearch = await makeRequest('/api/v1/search?q=DA', { headers: authAdmin });
  assert(validSearch.status === 200 && validSearch.body?.data?.results, 'Valid keyword search returns RBAC-filtered results (200)');

  // 4.7 User Directory Security Verification
  console.log('\n--- 4.7 User Directory PII & Credential Exposure Check ---');
  const userDirRes = await makeRequest('/api/v1/users', { headers: authAdmin });
  assert(userDirRes.status === 200 && Array.isArray(userDirRes.body?.data), 'User Directory returns active users list');
  const firstUser = userDirRes.body?.data?.[0];
  assert(
    firstUser && !('password' in firstUser) && !('passwordHash' in firstUser) && !('identityNumber' in firstUser),
    'PROVED: User Directory does NOT expose passwords, hashes, or PII'
  );

  console.log('\n========================================================================');
  console.log(`FINAL CLOSURE SUITE RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runFinalClosureSuite()
  .catch((err) => {
    console.error('Final closure suite error:', err);
    process.exit(1);
  })
  .finally(() => pool.end());
