/**
 * Phase 3 Error Upload Tests
 * Tests API-level upload validation (wrong extension, non-existent report, etc.)
 * Run with: node scripts/test-upload-errors.mjs
 */
import { readFileSync } from 'fs';

const BASE = 'http://localhost:3000';

// We need to get a session cookie first
async function getSessionCookie() {
  // Try to login with admin credentials
  const loginRes = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin', password: 'Admin@123' }),
    redirect: 'manual'
  });
  
  const cookies = loginRes.headers.getSetCookie?.() || [];
  const sessionCookie = cookies.find(c => c.includes('session'));
  if (sessionCookie) {
    return sessionCookie.split(';')[0];
  }
  
  // If login didn't work with those creds, try reading from existing session
  console.log('Login response status:', loginRes.status);
  console.log('Could not get session cookie automatically. Tests may fail with 401.');
  return null;
}

async function testUpload(testName, reportId, formDataBuilder, cookie) {
  console.log(`\n--- TEST: ${testName} ---`);
  try {
    const formData = formDataBuilder();
    const headers = {};
    if (cookie) headers['Cookie'] = cookie;
    
    const res = await fetch(`${BASE}/api/reports/${reportId}/attachments`, {
      method: 'POST',
      body: formData,
      headers
    });
    
    let body;
    try {
      body = await res.json();
    } catch {
      body = { text: await res.text() };
    }
    console.log(`  Status: ${res.status}`);
    console.log(`  Body: ${JSON.stringify(body)}`);
    return { status: res.status, body };
  } catch (err) {
    console.log(`  Error: ${err.message}`);
    return { error: err.message };
  }
}

async function testServe(testName, attachmentId, cookie) {
  console.log(`\n--- TEST: ${testName} ---`);
  try {
    const headers = {};
    if (cookie) headers['Cookie'] = cookie;
    
    const res = await fetch(`${BASE}/api/reports/attachments/${attachmentId}`, { headers });
    console.log(`  Status: ${res.status}`);
    console.log(`  Content-Type: ${res.headers.get('content-type')}`);
    console.log(`  Cache-Control: ${res.headers.get('cache-control')}`);
    console.log(`  X-Content-Type-Options: ${res.headers.get('x-content-type-options')}`);
    return { status: res.status };
  } catch (err) {
    console.log(`  Error: ${err.message}`);
    return { error: err.message };
  }
}

async function main() {
  console.log('=== Phase 3: Upload Error Tests ===\n');
  
  const cookie = await getSessionCookie();
  console.log('Session cookie:', cookie ? 'obtained' : 'NOT obtained');
  
  const results = [];
  
  // Test 1: Upload to non-existent report
  results.push(await testUpload(
    '1. Upload to non-existent report ID',
    'nonexistent-report-id-12345',
    () => {
      const fd = new FormData();
      fd.append('kind', 'PHOTO');
      fd.append('files', new Blob(['dummy']), 'test.jpg');
      return fd;
    },
    cookie
  ));
  
  // Test 2: Upload with invalid kind
  results.push(await testUpload(
    '2. Upload with invalid kind "EXECUTABLE"',
    'cmqoq7ts0000hkowkkrtq9v5u', // Use a known report ID
    () => {
      const fd = new FormData();
      fd.append('kind', 'EXECUTABLE');
      fd.append('files', new Blob(['dummy']), 'test.exe');
      return fd;
    },
    cookie
  ));
  
  // Test 3: Upload .exe file as PHOTO
  results.push(await testUpload(
    '3. Upload .exe file as PHOTO',
    'cmqoq7ts0000hkowkkrtq9v5u',
    () => {
      const fd = new FormData();
      fd.append('kind', 'PHOTO');
      fd.append('files', new Blob(['MZ executable content']), 'malware.exe');
      return fd;
    },
    cookie
  ));
  
  // Test 4: Upload .txt renamed as .pdf (magic byte mismatch)
  results.push(await testUpload(
    '4. Upload text file renamed as .pdf (magic byte check)',
    'cmqoq7ts0000hkowkkrtq9v5u',
    () => {
      const fd = new FormData();
      fd.append('kind', 'FILE');
      const fakeContent = Buffer.from('This is not a real PDF file, just plain text');
      fd.append('files', new Blob([fakeContent]), 'fake-document.pdf');
      return fd;
    },
    cookie
  ));
  
  // Test 5: Upload with no files
  results.push(await testUpload(
    '5. Upload with no files attached',
    'cmqoq7ts0000hkowkkrtq9v5u',
    () => {
      const fd = new FormData();
      fd.append('kind', 'PHOTO');
      return fd;
    },
    cookie
  ));
  
  // Test 6: Serve non-existent attachment
  results.push(await testServe(
    '6. Serve non-existent attachment ID',
    'cxxxxxxxxxxxxxxxxxxxxxxxxx',
    cookie
  ));
  
  // Test 7: Serve without session
  results.push(await testServe(
    '7. Serve attachment without login (no cookie)',
    'cxxxxxxxxxxxxxxxxxxxxxxxxx',
    null // No cookie
  ));
  
  // Test 8: Upload without session
  results.push(await testUpload(
    '8. Upload without login (no cookie)',
    'cmqoq7ts0000hkowkkrtq9v5u',
    () => {
      const fd = new FormData();
      fd.append('kind', 'PHOTO');
      fd.append('files', new Blob(['dummy']), 'test.jpg');
      return fd;
    },
    null // No cookie
  ));
  
  console.log('\n=== SUMMARY ===');
  console.log('All tests completed. Review results above.');
}

main().catch(console.error);
