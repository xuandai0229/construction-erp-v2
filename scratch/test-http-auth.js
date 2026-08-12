const LOCAL_URL = 'http://localhost:3000';
const TUNNEL_URL = 'https://seeing-students-law-affordable.trycloudflare.com';

async function testAuth(baseUrl, label) {
  console.log(`\n========================================`);
  console.log(`TESTING AUTH ON: ${label} (${baseUrl})`);
  console.log(`========================================`);

  // Step 1: POST /api/auth/login
  const loginUrl = `${baseUrl}/api/auth/login`;
  console.log(`1. Posting credentials to ${loginUrl}...`);

  const loginRes = await fetch(loginUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: 'admin@construction.local',
      password: '123456',
    }),
    redirect: 'manual',
  });

  console.log(`   Status: ${loginRes.status} ${loginRes.statusText}`);
  const loginHeaders = Object.fromEntries(loginRes.headers.entries());
  console.log(`   Set-Cookie:`, loginRes.headers.get('set-cookie'));
  const loginBody = await loginRes.json().catch(() => ({}));
  console.log(`   Body:`, JSON.stringify(loginBody));

  const cookieHeader = loginRes.headers.get('set-cookie');
  if (!cookieHeader) {
    console.log(`   FAIL: No Set-Cookie header returned!`);
    return;
  }

  // Extract auth_session value
  const cookieMatch = cookieHeader.match(/auth_session=([^;]+)/);
  const sessionToken = cookieMatch ? cookieMatch[1] : null;
  console.log(`   Extracted auth_session token: ${sessionToken ? sessionToken.substring(0, 30) + '...' : 'NONE'}`);

  // Step 2: GET / with cookie
  const targetUrl = `${baseUrl}${loginBody.redirectTo || '/'}`;
  console.log(`2. Requesting redirect destination: ${targetUrl} WITH cookie...`);

  const dashRes = await fetch(targetUrl, {
    method: 'GET',
    headers: {
      'Cookie': `auth_session=${sessionToken}`,
    },
    redirect: 'manual',
  });

  console.log(`   Status: ${dashRes.status} ${dashRes.statusText}`);
  console.log(`   Location header: ${dashRes.headers.get('location')}`);
  console.log(`   Set-Cookie in response: ${dashRes.headers.get('set-cookie')}`);

  // Step 3: GET / WITHOUT cookie (expect 307 redirect to /login)
  console.log(`3. Requesting ${targetUrl} WITHOUT cookie...`);
  const noCookieRes = await fetch(targetUrl, {
    method: 'GET',
    redirect: 'manual',
  });
  console.log(`   Status: ${noCookieRes.status} ${noCookieRes.statusText}`);
  console.log(`   Location header: ${noCookieRes.headers.get('location')}`);
}

async function run() {
  await testAuth(LOCAL_URL, 'LOCAL ENVIRONMENT');
  await testAuth(TUNNEL_URL, 'CLOUDFLARE TUNNEL');
}

run().catch(console.error);
