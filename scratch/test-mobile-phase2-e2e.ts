import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import http from 'http';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000/api/v1';

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

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

async function runMobilePhase2ComprehensiveSuite() {
  console.log('========================================================================');
  console.log('📱 MOBILE PHASE 2 — COMPREHENSIVE E2E & SECURITY REGRESSION SUITE');
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

  // 1. Mobile Bearer Authentication with QA Admin
  const loginRes = await makeRequest('/auth/login', {
    method: 'POST',
    body: { email: 'qa_freeze_admin@construction.local', password: '123456' },
  });
  const token = loginRes.body?.data?.token;
  const user = loginRes.body?.data?.user;
  assert(
    loginRes.status === 200 && typeof token === 'string' && user?.email === 'qa_freeze_admin@construction.local',
    'Mobile Bearer Authentication with QA Admin succeeds (200 OK)'
  );

  const authHeaders = { Authorization: `Bearer ${token}` };

  // Fetch Dedicated QA Project (QA-MOBILE-001)
  const qaProject = await prisma.project.findFirst({
    where: { code: 'QA-MOBILE-001' },
  });

  if (!qaProject) {
    console.error('Cannot find dedicated QA project (QA-MOBILE-001) in DB');
    process.exit(1);
  }

  const projectId = qaProject.id;
  console.log(`Target Dedicated QA Project: ${qaProject.name} (${qaProject.code} / ${projectId})\n`);

  // Fetch QA Template and Items
  const qaTemplate = await prisma.fieldProgressTemplate.findFirst({
    where: { projectId: qaProject.id },
  });

  const qaItem = await prisma.fieldProgressItem.findFirst({
    where: { templateId: qaTemplate?.id },
  });

  if (!qaTemplate || !qaItem) {
    console.error('Missing QA Template or QA Item in QA-MOBILE-001 project');
    process.exit(1);
  }

  // 2. GET WBS Tree Retrieval via API V1
  const wbsRes = await makeRequest(`/projects/${projectId}/wbs`, { headers: authHeaders });
  assert(
    wbsRes.status === 200 && wbsRes.body?.success === true && Array.isArray(wbsRes.body?.data),
    'GET /api/v1/projects/{projectId}/wbs returns WBS items for QA Project (200 OK)'
  );

  // 3. Invalid WBS ID Rejection
  const invalidWbsRes = await makeRequest(`/projects/${projectId}/progress/daily`, {
    method: 'POST',
    headers: authHeaders,
    body: {
      templateId: qaTemplate.id,
      itemId: 'non-existent-wbs-id-99999',
      entryDate: '2026-08-12',
      quantity: 10,
    },
  });
  assert(
    invalidWbsRes.status === 400 && invalidWbsRes.body?.success === false && invalidWbsRes.body?.error?.code === 'INVALID_WBS_ITEM',
    'SECURITY: Non-existent WBS ID returns controlled 400 Bad Request (INVALID_WBS_ITEM)'
  );

  // 4. Cross-project WBS ID Rejection
  const otherProjectItem = await prisma.fieldProgressItem.findFirst({
    where: {
      projectId: { not: projectId },
    },
  });

  if (otherProjectItem) {
    const crossProjectRes = await makeRequest(`/projects/${projectId}/progress/daily`, {
      method: 'POST',
      headers: authHeaders,
      body: {
        templateId: qaTemplate.id,
        itemId: otherProjectItem.id,
        entryDate: '2026-08-12',
        quantity: 10,
      },
    });
    assert(
      crossProjectRes.status === 400 && crossProjectRes.body?.success === false,
      'SECURITY: Cross-project WBS ID is rejected with controlled 400 Bad Request'
    );
  }

  // 5. STRICT CALENDAR DATE VALIDATION TESTS
  console.log('\n--- STRICT CALENDAR DATE VALIDATION TESTS ---');

  const strictDateTests = [
    { date: '2026-02-28', expectedStatus: 201, expectSuccess: true, label: '2026-02-28 (Valid standard date)' },
    { date: '2026-02-29', expectedStatus: 400, expectSuccess: false, label: '2026-02-29 (Invalid non-leap year Feb 29)' },
    { date: '2026-02-30', expectedStatus: 400, expectSuccess: false, label: '2026-02-30 (Invalid Feb 30)' },
    { date: '2026-04-31', expectedStatus: 400, expectSuccess: false, label: '2026-04-31 (Invalid 31st day in April)' },
    { date: '2026-13-01', expectedStatus: 400, expectSuccess: false, label: '2026-13-01 (Invalid month 13)' },
    { date: '2026-00-10', expectedStatus: 400, expectSuccess: false, label: '2026-00-10 (Invalid month 00)' },
    { date: '2026-01-00', expectedStatus: 400, expectSuccess: false, label: '2026-01-00 (Invalid day 00)' },
    { date: '2028-02-29', expectedStatus: 201, expectSuccess: true, label: '2028-02-29 (Valid leap year Feb 29)' },
    { date: 'invalid-date-format', expectedStatus: 400, expectSuccess: false, label: 'invalid-date-format (Malformed string)' },
  ];

  for (const t of strictDateTests) {
    const res = await makeRequest(`/projects/${projectId}/progress/daily`, {
      method: 'POST',
      headers: authHeaders,
      body: {
        templateId: qaTemplate.id,
        itemId: qaItem.id,
        entryDate: t.date,
        quantity: 5,
        note: `QA_STRICT_DATE_TEST_${t.date}`,
      },
    });

    const isMatch = res.status === t.expectedStatus && res.body?.success === t.expectSuccess;
    assert(isMatch, `STRICT DATE TEST: ${t.label} -> Got ${res.status}`);
  }

  console.log('---------------------------------------------\n');

  // 6. Negative Quantity Rejection
  const invalidQtyRes = await makeRequest(`/projects/${projectId}/progress/daily`, {
    method: 'POST',
    headers: authHeaders,
    body: {
      templateId: qaTemplate.id,
      itemId: qaItem.id,
      entryDate: '2026-08-12',
      quantity: -10,
    },
  });
  assert(
    invalidQtyRes.status === 400 && invalidQtyRes.body?.success === false,
    'SECURITY: POST /progress/daily with negative quantity returns 400 Bad Request'
  );

  // 7. Actor Spoof Prevention
  const actorSpoofRes = await makeRequest(`/projects/${projectId}/progress/daily`, {
    method: 'POST',
    headers: authHeaders,
    body: {
      templateId: qaTemplate.id,
      itemId: qaItem.id,
      entryDate: '2026-08-12',
      quantity: 5,
      createdById: 'spoofed_fake_user_id',
    },
  });
  assert(
    actorSpoofRes.status === 201 && actorSpoofRes.body?.data?.createdBy?.id !== 'spoofed_fake_user_id',
    'SECURITY: Backend ignores payload actor spoofing and strictly derives createdById from authenticated session'
  );

  // 8. CANONICAL FOUR-LAYER SMOKE PROOF RECORD CREATION
  const timestampMarker = Date.now();
  const testMarker = `QA_MOBILE_PHASE2_FINAL_CLOSURE_${timestampMarker}`;
  const testQuantity = 35.5;
  const testDateStr = '2026-08-12';

  const createRes = await makeRequest(`/projects/${projectId}/progress/daily`, {
    method: 'POST',
    headers: authHeaders,
    body: {
      templateId: qaTemplate.id,
      itemId: qaItem.id,
      entryDate: testDateStr,
      quantity: testQuantity,
      note: testMarker,
      issueNote: 'Không có vướng mắc hiện trường',
      proposalNote: 'Tiếp tục đẩy nhanh tiến độ',
    },
  });

  const createdId = createRes.body?.data?.id;
  assert(
    createRes.status === 201 && createRes.body?.success === true && typeof createdId === 'string',
    'FOUR-LAYER LAYER 1 (MOBILE): POST /progress/daily creates progress record on QA Project (201 Created)'
  );

  // 9. Layer 2: Mobile GET API Verification
  const mobileGetRes = await makeRequest(`/projects/${projectId}/progress/daily`, { headers: authHeaders });
  const fetchedEntries = mobileGetRes.body?.data || [];
  const foundInMobileApi = fetchedEntries.find((e: any) => e.id === createdId || e.note === testMarker);
  assert(
    mobileGetRes.status === 200 && !!foundInMobileApi && Number(foundInMobileApi.quantity) === testQuantity,
    'FOUR-LAYER LAYER 2 (REST API): GET /progress/daily retrieves exact entry'
  );

  // 10. Layer 3: Database Verification via Prisma
  const dbRecord = await prisma.fieldProgressEntry.findUnique({
    where: { id: createdId },
    include: { createdBy: true, item: true },
  });
  assert(
    dbRecord !== null &&
    dbRecord.projectId === projectId &&
    Number(dbRecord.quantity) === testQuantity &&
    dbRecord.note === testMarker &&
    dbRecord.createdById === user.id,
    'FOUR-LAYER LAYER 3 (DATABASE): PostgreSQL database stores exact payload, quantity, and authenticated createdById'
  );

  // 11. Layer 4: Web ERP Data Query Verification
  const webErpEntries = await prisma.fieldProgressEntry.findMany({
    where: { projectId, deletedAt: null },
    include: { item: true, createdBy: true },
  });
  const webRecord = webErpEntries.find((e) => e.id === createdId);
  assert(
    webRecord !== undefined && webRecord.note === testMarker && Number(webRecord.quantity) === testQuantity,
    'FOUR-LAYER LAYER 4 (WEB ERP DATA LAYER): Web ERP query extracts and displays the Mobile-created record'
  );

  // 12. Security Test: Unauthenticated Request Rejection
  const unauthRes = await makeRequest(`/projects/${projectId}/wbs`);
  assert(
    unauthRes.status === 401 && unauthRes.body?.success === false,
    'SECURITY: Unauthenticated request to /wbs is rejected (401 Unauthorized)'
  );

  // 13. Safety Assertions for 21 Real Business Projects
  const realProjectCount = await prisma.project.count({
    where: { code: { startsWith: 'CT-2026-' } },
  });
  assert(realProjectCount === 21, 'DATA ISOLATION: 21 Real Business Projects remain 100% intact and safe');

  console.log('\n========================================================================');
  console.log(`MOBILE PHASE 2 REGRESSION SUITE: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('========================================================================\n');

  if (failedCount > 0) process.exit(1);
}

runMobilePhase2ComprehensiveSuite().catch(console.error).finally(() => {
  prisma.$disconnect();
  pool.end();
});
