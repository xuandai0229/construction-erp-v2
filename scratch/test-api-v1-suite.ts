import http from 'http';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3001';

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

async function runV1Suite() {
  console.log('========================================================================');
  console.log('🧪 RUNNING COMPREHENSIVE RUNTIME SUITE FOR REST API V1');
  console.log(`Targeting Server: ${BASE_URL}`);
  console.log('========================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, actualMsg: string) {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName} -> ${actualMsg}`);
      failed++;
    }
  }

  // 1. Unauthenticated Anonymous Rejection Tests
  console.log('--- 1. ANONYMOUS ACCESS REJECTION TESTS (401 UNAUTHORIZED) ---');
  const protectedEndpoints = [
    { method: 'GET', path: '/api/v1/me' },
    { method: 'GET', path: '/api/v1/projects' },
    { method: 'GET', path: '/api/v1/notifications' },
    { method: 'GET', path: '/api/v1/reports' },
    { method: 'GET', path: '/api/v1/material-proposals' },
    { method: 'GET', path: '/api/v1/approvals' },
    { method: 'GET', path: '/api/v1/dashboard' },
    { method: 'GET', path: '/api/v1/users' },
  ];

  for (const ep of protectedEndpoints) {
    const res = await makeRequest(ep.path, { method: ep.method });
    assert(
      res.status === 401,
      `Anonymous ${ep.method} ${ep.path}`,
      `Expected 401, got Status: ${res.status}`
    );
  }

  // 2. Authentication Test - Login Endpoint (Web Cookie & Bearer Token)
  console.log('\n--- 2. DUAL-MODE AUTHENTICATION TEST (POST /api/v1/auth/login) ---');
  let loginRes = await makeRequest('/api/v1/auth/login', {
    method: 'POST',
    body: { email: 'admin@construction.local', password: '123456' },
  });

  if (loginRes.status !== 200) {
    loginRes = await makeRequest('/api/v1/auth/login', {
      method: 'POST',
      body: { email: 'admin@construction.local', password: 'password123' },
    });
  }

  assert(
    loginRes.status === 200 && loginRes.body?.success === true,
    'Login with valid credentials',
    `Status: ${loginRes.status}, Body: ${JSON.stringify(loginRes.body)}`
  );

  const bearerToken = loginRes.body?.data?.token;
  assert(
    typeof bearerToken === 'string' && bearerToken.length > 20,
    'Mobile Bearer Token returned in login response',
    `Token: ${bearerToken}`
  );

  if (!bearerToken) {
    console.error('❌ Aborting authenticated tests due to missing token.');
    process.exit(1);
  }

  const authHeaders = { Authorization: `Bearer ${bearerToken}` };

  // 3. Mobile Core APIs Verification with Bearer Token
  console.log('\n--- 3. MOBILE CORE APIS VERIFICATION (WITH BEARER TOKEN) ---');

  // Me
  const meRes = await makeRequest('/api/v1/me', { headers: authHeaders });
  assert(
    meRes.status === 200 && meRes.body?.data?.email === 'admin@construction.local',
    'GET /api/v1/me (Profile & Assignments)',
    `Status: ${meRes.status}, Body: ${JSON.stringify(meRes.body)}`
  );

  // Projects List
  const projectsRes = await makeRequest('/api/v1/projects', { headers: authHeaders });
  assert(
    projectsRes.status === 200 && Array.isArray(projectsRes.body?.data),
    'GET /api/v1/projects (Scoped Projects)',
    `Status: ${projectsRes.status}`
  );

  const firstProject = projectsRes.body?.data?.[0];
  if (firstProject) {
    // Project Detail
    const projDetailRes = await makeRequest(`/api/v1/projects/${firstProject.id}`, { headers: authHeaders });
    assert(
      projDetailRes.status === 200 && projDetailRes.body?.data?.id === firstProject.id,
      `GET /api/v1/projects/${firstProject.id} (Project Detail)`,
      `Status: ${projDetailRes.status}`
    );

    // Project Members
    const membersRes = await makeRequest(`/api/v1/projects/${firstProject.id}/members`, { headers: authHeaders });
    assert(
      membersRes.status === 200 && Array.isArray(membersRes.body?.data),
      `GET /api/v1/projects/${firstProject.id}/members`,
      `Status: ${membersRes.status}`
    );

    // Project Personnel
    const personnelRes = await makeRequest(`/api/v1/projects/${firstProject.id}/personnel`, { headers: authHeaders });
    assert(
      personnelRes.status === 200 && Array.isArray(personnelRes.body?.data),
      `GET /api/v1/projects/${firstProject.id}/personnel`,
      `Status: ${personnelRes.status}`
    );

    // WBS Items
    const wbsRes = await makeRequest(`/api/v1/projects/${firstProject.id}/wbs`, { headers: authHeaders });
    assert(
      wbsRes.status === 200 && Array.isArray(wbsRes.body?.data),
      `GET /api/v1/projects/${firstProject.id}/wbs`,
      `Status: ${wbsRes.status}`
    );

    // Project Dashboard
    const projDashRes = await makeRequest(`/api/v1/projects/${firstProject.id}/dashboard`, { headers: authHeaders });
    assert(
      projDashRes.status === 200 && projDashRes.body?.data?.metrics,
      `GET /api/v1/projects/${firstProject.id}/dashboard`,
      `Status: ${projDashRes.status}`
    );
  }

  // Notifications
  const notifRes = await makeRequest('/api/v1/notifications', { headers: authHeaders });
  assert(
    notifRes.status === 200 && Array.isArray(notifRes.body?.data),
    'GET /api/v1/notifications',
    `Status: ${notifRes.status}`
  );

  // Read all notifications
  const readAllRes = await makeRequest('/api/v1/notifications/read-all', { method: 'POST', headers: authHeaders });
  assert(
    readAllRes.status === 200 && readAllRes.body?.success === true,
    'POST /api/v1/notifications/read-all',
    `Status: ${readAllRes.status}`
  );

  // Global Dashboard
  const dashRes = await makeRequest('/api/v1/dashboard', { headers: authHeaders });
  assert(
    dashRes.status === 200 && dashRes.body?.data?.summary,
    'GET /api/v1/dashboard',
    `Status: ${dashRes.status}`
  );

  // Global Search
  const searchRes = await makeRequest('/api/v1/search?q=DA', { headers: authHeaders });
  assert(
    searchRes.status === 200 && searchRes.body?.data?.results,
    'GET /api/v1/search?q=DA',
    `Status: ${searchRes.status}`
  );

  // User Directory
  const usersRes = await makeRequest('/api/v1/users', { headers: authHeaders });
  assert(
    usersRes.status === 200 && Array.isArray(usersRes.body?.data),
    'GET /api/v1/users',
    `Status: ${usersRes.status}`
  );

  console.log('\n------------------------------------------------------------------------');
  console.log(`API V1 SUITE RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('------------------------------------------------------------------------\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runV1Suite().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
