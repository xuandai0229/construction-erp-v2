import http from 'http';

const BASE_URL = 'http://localhost:3000';

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

async function runTests() {
  console.log('========================================================================');
  console.log('🧪 RUNNING AUTOMATED NEGATIVE RUNTIME SECURITY TESTS FOR SAFETY REST API');
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

  // 1. Unauthenticated Anonymous Tests (14 HTTP Methods across 10 route files)
  const anonymousEndpoints = [
    { method: 'GET', path: '/api/reports/safety/plans' },
    { method: 'POST', path: '/api/reports/safety/plans', body: { title: 'Test Plan' } },
    { method: 'GET', path: '/api/reports/safety/plans/test-plan-id' },
    { method: 'DELETE', path: '/api/reports/safety/plans/test-plan-id' },
    { method: 'POST', path: '/api/reports/safety/plans/test-plan-id/submit' },
    { method: 'POST', path: '/api/reports/safety/plans/test-plan-id/approve', body: { approve: true } },
    { method: 'GET', path: '/api/reports/safety/plans/test-plan-id/export' },
    { method: 'GET', path: '/api/reports/safety/self-assessments' },
    { method: 'POST', path: '/api/reports/safety/self-assessments', body: { title: 'Test Assessment' } },
    { method: 'GET', path: '/api/reports/safety/self-assessments/test-report-id' },
    { method: 'DELETE', path: '/api/reports/safety/self-assessments/test-report-id' },
    { method: 'POST', path: '/api/reports/safety/self-assessments/test-report-id/submit' },
    { method: 'POST', path: '/api/reports/safety/self-assessments/test-report-id/approve', body: { approve: true } },
    { method: 'GET', path: '/api/reports/safety/self-assessments/test-report-id/export' },
  ];

  console.log('--- 1. ANONYMOUS ACCESS REJECTION TESTS ---');
  for (const ep of anonymousEndpoints) {
    const res = await makeRequest(ep.path, { method: ep.method, body: ep.body });
    assert(
      res.status === 401,
      `Anonymous ${ep.method} ${ep.path}`,
      `Expected 401, got Status: ${res.status}`
    );
  }

  // 2. Authenticated Login & Actor Binding Test
  console.log('\n--- 2. AUTHENTICATED & ACTOR BINDING TESTS ---');
  const loginRes = await makeRequest('/api/auth/login', {
    method: 'POST',
    body: { email: 'admin@construction.local', password: 'password123' },
  });

  const cookies = loginRes.headers['set-cookie'];
  let cookieHeader = '';
  if (cookies && cookies.length > 0) {
    cookieHeader = cookies.map((c) => c.split(';')[0]).join('; ');
  }

  if (cookieHeader) {
    console.log('  🔑 Authenticated successfully as admin@construction.local');

    // Authenticated GET plans
    const authedGet = await makeRequest('/api/reports/safety/plans', {
      method: 'GET',
      headers: { Cookie: cookieHeader },
    });

    assert(
      authedGet.status === 200,
      'Authenticated GET /api/reports/safety/plans',
      `Expected 200, got Status: ${authedGet.status}`
    );

    // Actor Spoofing Test: send body with actorId = 'FAKE_SPOOF_USER'
    const spoofRes = await makeRequest('/api/reports/safety/plans', {
      method: 'POST',
      headers: { Cookie: cookieHeader },
      body: {
        title: 'KẾ HOẠCH TEST BẢO MẬT',
        actorId: 'FAKE_SPOOF_USER_ID',
        approvedBy: 'FAKE_SPOOF_USER_ID',
        entries: [],
      },
    });

    if (spoofRes.status === 201) {
      assert(
        spoofRes.body.createdById !== 'FAKE_SPOOF_USER_ID',
        'Actor spoofing rejected (createdById is derived from session.id)',
        `createdById was set to: ${spoofRes.body.createdById}`
      );
    } else {
      assert(
        spoofRes.status === 200 || spoofRes.status === 201,
        'Authenticated POST /api/reports/safety/plans processed',
        `Status: ${spoofRes.status}`
      );
    }
  } else {
    console.log('⚠️ [NOTE] Admin login returned status: ' + loginRes.status);
  }

  console.log('\n------------------------------------------------------------------------');
  console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('------------------------------------------------------------------------\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
