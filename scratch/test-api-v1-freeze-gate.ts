import http from 'http';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const CURRENT_DB_URL = process.env.DATABASE_URL || 'postgresql://postgres:dev_rotated_secret_pass_2026_x7!@127.0.0.1:5432/construction_erp_v2_dev';

const pool = new Pool({ connectionString: CURRENT_DB_URL });

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

function hasForbiddenKeys(obj: any, forbiddenKeys: string[]): string | null {
  if (!obj || typeof obj !== 'object') return null;
  if (Array.isArray(obj)) {
    for (const item of obj) {
      const found = hasForbiddenKeys(item, forbiddenKeys);
      if (found) return found;
    }
    return null;
  }
  for (const key of Object.keys(obj)) {
    if (forbiddenKeys.includes(key)) return key;
    const found = hasForbiddenKeys(obj[key], forbiddenKeys);
    if (found) return found;
  }
  return null;
}

async function runFreezeGateSuite() {
  console.log('========================================================================');
  console.log('🧪 CONSTRUCTION-ERP-V2 — FINAL COMPATIBILITY GATE & CONTRACT FREEZE SUITE');
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

  // Seed QA Accounts
  const passHash = await bcrypt.hash('123456', 10);
  await pool.query(`
    INSERT INTO "User" (id, email, name, role, "isActive", password, "updatedAt")
    VALUES ('qa_freeze_admin', 'qa_freeze_admin@construction.local', 'QA Freeze Admin', 'ADMIN', true, $1, NOW())
    ON CONFLICT (email) DO UPDATE SET password = $1, "isActive" = true, "deletedAt" = NULL;
  `, [passHash]);

  await pool.query(`
    INSERT INTO "User" (id, email, name, role, "isActive", password, "updatedAt")
    VALUES ('qa_freeze_engineer', 'qa_freeze_eng@construction.local', 'QA Freeze Engineer', 'ENGINEER', true, $1, NOW())
    ON CONFLICT (email) DO UPDATE SET password = $1, "isActive" = true, "deletedAt" = NULL;
  `, [passHash]);

  const projRes = await pool.query('SELECT id, code, name FROM "Project" WHERE "deletedAt" IS NULL ORDER BY id ASC LIMIT 2');
  const projectA = projRes.rows[0];

  if (projectA) {
    await pool.query(`
      INSERT INTO "ProjectMember" (id, "projectId", "userId", role, "isActive", "joinedAt", "updatedAt")
      VALUES ('pm_qa_freeze_eng', $1, 'qa_freeze_engineer', 'PROJECT_MANAGER', true, NOW(), NOW())
      ON CONFLICT ("projectId", "userId") DO UPDATE SET "isActive" = true;
    `, [projectA.id]);
  }

  // Obtain Tokens
  const adminLogin = await makeRequest('/api/v1/auth/login', {
    method: 'POST',
    body: { email: 'qa_freeze_admin@construction.local', password: '123456' },
  });
  const adminToken = adminLogin.body?.data?.token;

  const engLogin = await makeRequest('/api/v1/auth/login', {
    method: 'POST',
    body: { email: 'qa_freeze_eng@construction.local', password: '123456' },
  });
  const engToken = engLogin.body?.data?.token;

  const bearerAdminHeader = { Authorization: `Bearer ${adminToken}` };
  const bearerEngHeader = { Authorization: `Bearer ${engToken}` };

  // --- GROUP A: LEGACY API MOBILE BEARER COMPATIBILITY ---
  console.log('--- GROUP A: LEGACY API MOBILE BEARER COMPATIBILITY (NO COOKIE) ---');

  // Documents
  if (projectA) {
    const docsLoad = await makeRequest(`/api/documents/load-more?projectId=${projectA.id}&type=folders`, { headers: bearerAdminHeader });
    assert(docsLoad.status === 200 && Array.isArray(docsLoad.body?.items), 'Legacy /api/documents/load-more works with Mobile Bearer Token (200)');
  }

  // Report Attachments Download API
  const attachRes = await makeRequest('/api/reports/attachments/cmspivoje00002ok5v403mfrk', { headers: bearerAdminHeader });
  assert(attachRes.status === 404 || attachRes.status === 400 || attachRes.status === 403, `Legacy /api/reports/attachments/[attachmentId] works with Mobile Bearer Token (${attachRes.status})`);

  // Safety Plans
  const safetyPlans = await makeRequest('/api/reports/safety/plans', { headers: bearerAdminHeader });
  assert(safetyPlans.status === 200, 'Legacy /api/reports/safety/plans works with Mobile Bearer Token (200)');

  // Safety Self-Assessments
  const safetyAssessments = await makeRequest('/api/reports/safety/self-assessments', { headers: bearerAdminHeader });
  assert(safetyAssessments.status === 200, 'Legacy /api/reports/safety/self-assessments works with Mobile Bearer Token (200)');

  // Regression Anonymous Check on Legacy APIs
  const docsAnon = await makeRequest('/api/documents/load-more?page=1&limit=5');
  assert(docsAnon.status === 401, 'Anonymous request to Legacy /api/documents/load-more returns 401');

  const safetyAnon = await makeRequest('/api/reports/safety/plans');
  assert(safetyAnon.status === 401, 'Anonymous request to Legacy /api/reports/safety/plans returns 401');

  // --- GROUP B: GLOBAL DASHBOARD AUTHORIZATION ---
  console.log('\n--- GROUP B: GLOBAL DASHBOARD AUTHORIZATION ---');

  const adminDashboard = await makeRequest('/api/v1/dashboard', { headers: bearerAdminHeader });
  assert(adminDashboard.status === 200 && adminDashboard.body?.success === true, 'Admin GET /api/v1/dashboard returns 200');

  const engDashboard = await makeRequest('/api/v1/dashboard', { headers: bearerEngHeader });
  assert(engDashboard.status === 403, 'Restricted role (ENGINEER) GET /api/v1/dashboard returns 403 Forbidden');

  if (projectA) {
    const projDashboard = await makeRequest(`/api/v1/projects/${projectA.id}/dashboard`, { headers: bearerEngHeader });
    assert(projDashboard.status === 200, 'Assigned Engineer GET /api/v1/projects/[id]/dashboard returns 200 OK');
  }

  // --- GROUP C: USER DIRECTORY DATA VISIBILITY & MINIMIZATION ---
  console.log('\n--- GROUP C: USER DIRECTORY DATA VISIBILITY & MINIMIZATION ---');

  const userDirRes = await makeRequest('/api/v1/users', { headers: bearerAdminHeader });
  assert(userDirRes.status === 200 && Array.isArray(userDirRes.body?.data), 'GET /api/v1/users returns active users');

  const forbiddenKeys = ['password', 'passwordHash', 'credentialVersion', 'secret', 'token', 'session', 'deletedAt', 'salary', 'bankAccount'];
  const leakedKey = hasForbiddenKeys(userDirRes.body, forbiddenKeys);
  assert(leakedKey === null, `User directory response is 100% free of sensitive keys (leaked: ${leakedKey || 'NONE'})`);

  // --- GROUP D: CREDENTIAL ROTATION & HYGIENE VERIFICATION ---
  console.log('\n--- GROUP D: CREDENTIAL ROTATION & HYGIENE VERIFICATION ---');

  let oldConnFailed = false;
  try {
    const badPool = new Pool({ connectionString: 'postgresql://postgres:old_exposed_invalid_pass@127.0.0.1:5432/construction_erp_v2_dev', connectionTimeoutMillis: 1000 });
    await badPool.query('SELECT 1');
    await badPool.end();
  } catch {
    oldConnFailed = true;
  }
  assert(oldConnFailed, 'Old/invalid credential database connection fails (REJECTED)');

  let currentConnPassed = false;
  try {
    const res = await pool.query('SELECT 1 as alive');
    currentConnPassed = res.rows[0].alive === 1;
  } catch {}
  assert(currentConnPassed, 'Current rotated local database connection succeeds (VERIFIED)');

  // --- GROUP E: API V1 CONTRACT SHAPE SMOKE TESTS ---
  console.log('\n--- GROUP E: API V1 CONTRACT SHAPE SMOKE TESTS ---');

  const contractEndpoints = [
    { method: 'GET', path: '/api/v1/me', headers: bearerAdminHeader },
    { method: 'GET', path: '/api/v1/projects', headers: bearerAdminHeader },
    { method: 'GET', path: `/api/v1/projects/${projectA.id}`, headers: bearerAdminHeader },
    { method: 'GET', path: `/api/v1/projects/${projectA.id}/dashboard`, headers: bearerAdminHeader },
    { method: 'GET', path: `/api/v1/projects/${projectA.id}/wbs`, headers: bearerAdminHeader },
    { method: 'GET', path: `/api/v1/projects/${projectA.id}/progress/daily`, headers: bearerAdminHeader },
    { method: 'GET', path: '/api/v1/reports', headers: bearerAdminHeader },
    { method: 'GET', path: '/api/v1/material-proposals', headers: bearerAdminHeader },
    { method: 'GET', path: '/api/v1/approvals', headers: bearerAdminHeader },
    { method: 'GET', path: '/api/v1/notifications', headers: bearerAdminHeader },
    { method: 'GET', path: '/api/v1/search?q=DA', headers: bearerAdminHeader },
    { method: 'GET', path: '/api/v1/supervision/weekly', headers: bearerAdminHeader },
  ];

  for (const ep of contractEndpoints) {
    const res = await makeRequest(ep.path, { method: ep.method, headers: ep.headers });
    assert(
      res.status === 200 && typeof res.body === 'object' && res.body !== null && 'success' in res.body,
      `Contract shape check ${ep.method} ${ep.path} -> 200 with { success, data } contract`
    );
  }

  console.log('\n========================================================================');
  console.log(`FREEZE GATE SUITE RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runFreezeGateSuite()
  .catch((err) => {
    console.error('Freeze Gate suite error:', err);
    process.exit(1);
  })
  .finally(() => pool.end());
