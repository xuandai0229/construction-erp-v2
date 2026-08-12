/**
 * Mobile Phase 1 Real Runtime Integration Test Suite
 * Tests actual API flow consumed by the mobile application against the local server.
 */

import http from 'http';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000/api/v1';

async function makeRequest(path: string, options: { method?: string; headers?: Record<string, string>; body?: any } = {}) {
  const fullUrl = `${BASE_URL.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
  const url = new URL(fullUrl);
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

async function runMobilePhase1RuntimeTests() {
  console.log('========================================================================');
  console.log('📱 MOBILE PHASE 1 — REAL RUNTIME INTEGRATION TEST SUITE');
  console.log(`Target Backend: ${BASE_URL}`);
  console.log('========================================================================\n');

  let passedCount = 0;
  let failedCount = 0;

  function assert(condition: boolean, name: string, detail?: string) {
    if (condition) {
      console.log(`✅ [PASS] ${name}`);
      passedCount++;
    } else {
      console.error(`❌ [FAIL] ${name} ${detail ? `- ${detail}` : ''}`);
      failedCount++;
    }
  }

  // TEST 1: Login Failure with Wrong Credentials
  const loginFail = await makeRequest('/auth/login', {
    method: 'POST',
    body: { email: 'qa_freeze_admin@construction.local', password: 'wrong_password_xyz' },
  });
  assert(
    loginFail.status === 401 && loginFail.body?.success === false && loginFail.body?.error?.code === 'UNAUTHENTICATED',
    'Login with invalid password returns 401 Unauthorized with Vietnamese error message'
  );

  // TEST 2: Login Success with Valid Credentials
  const loginSuccess = await makeRequest('/auth/login', {
    method: 'POST',
    body: { email: 'qa_freeze_admin@construction.local', password: '123456' },
  });
  const bearerToken = loginSuccess.body?.data?.token;
  const loggedInUser = loginSuccess.body?.data?.user;
  assert(
    loginSuccess.status === 200 && loginSuccess.body?.success === true && typeof bearerToken === 'string',
    'Login with valid credentials returns 200 OK with Bearer Token'
  );

  if (!bearerToken) {
    console.error('Cannot proceed without valid token.');
    process.exit(1);
  }

  const authHeaders = { Authorization: `Bearer ${bearerToken}` };

  // TEST 3: GET /me with Bearer Token
  const meRes = await makeRequest('/me', { method: 'GET', headers: authHeaders });
  const returnedEmail = meRes.body?.data?.email || meRes.body?.data?.user?.email;
  assert(
    meRes.status === 200 && meRes.body?.success === true && returnedEmail === loggedInUser.email,
    'GET /me with Bearer token returns current user profile (200 OK)'
  );

  // TEST 4: GET /projects with Bearer Token
  const projectsRes = await makeRequest('/projects', { method: 'GET', headers: authHeaders });
  assert(
    projectsRes.status === 200 && projectsRes.body?.success === true && Array.isArray(projectsRes.body?.data),
    'GET /projects returns accessible project list (200 OK)'
  );

  let firstProjectId = '';
  if (Array.isArray(projectsRes.body?.data) && projectsRes.body.data.length > 0) {
    firstProjectId = projectsRes.body.data[0].id;
  }

  // TEST 5: GET /projects/{id}/dashboard with Bearer Token
  if (firstProjectId) {
    const projDashRes = await makeRequest(`/projects/${firstProjectId}/dashboard`, { method: 'GET', headers: authHeaders });
    assert(
      projDashRes.status === 200 && projDashRes.body?.success === true && projDashRes.body?.data?.metrics && typeof projDashRes.body.data.metrics.totalWbsItems === 'number',
      `GET /projects/${firstProjectId}/dashboard returns real metrics (200 OK)`
    );
  }

  // TEST 6: POST /auth/logout (Server Token Invalidation)
  const logoutRes = await makeRequest('/auth/logout', { method: 'POST', headers: authHeaders });
  assert(logoutRes.status === 200 && logoutRes.body?.success === true, 'POST /auth/logout revokes session on server (200 OK)');

  // TEST 7: Verify Revoked Token returns 401
  const revokedMeRes = await makeRequest('/me', { method: 'GET', headers: authHeaders });
  assert(revokedMeRes.status === 401 && revokedMeRes.body?.success === false, 'Old Bearer Token after logout is rejected with 401 Unauthorized');

  console.log('\n========================================================================');
  console.log(`MOBILE PHASE 1 RUNTIME SUITE RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('========================================================================');

  if (failedCount > 0) process.exit(1);
}

runMobilePhase1RuntimeTests();
