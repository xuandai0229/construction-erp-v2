import http from 'http';

const BASE_URL = 'http://localhost:3000/api/v1';

async function makeRequest(path: string, options: { method?: string; headers?: Record<string, string>; body?: any } = {}) {
  const fullUrl = `${BASE_URL.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
  const url = new URL(fullUrl);
  return new Promise<{ status: number; body: any }>((resolve, reject) => {
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

async function testPostProgress() {
  const loginRes = await makeRequest('/auth/login', {
    method: 'POST',
    body: { email: 'qa_freeze_admin@construction.local', password: '123456' },
  });
  const token = loginRes.body?.data?.token;
  const headers = { Authorization: `Bearer ${token}` };
  const projectId = 'cms9tydgm0004n4k5luf4qn5n';

  const postRes = await makeRequest(`/projects/${projectId}/progress/daily`, {
    method: 'POST',
    headers,
    body: {
      templateId: 'cmspqa0t40005z8k5x79hifya',
      itemId: 'cmspqan090006isk53ajr3i6c',
      entryDate: '2026-08-12',
      quantity: 15.5,
      note: 'QA_MOBILE_PHASE2_EXECUTION_NOTE_1208',
    },
  });

  console.log('POST /progress/daily status:', postRes.status);
  console.log('POST /progress/daily response:', JSON.stringify(postRes.body, null, 2));

  const getRes = await makeRequest(`/projects/${projectId}/progress/daily`, { headers });
  console.log('GET /progress/daily status:', getRes.status);
  console.log('GET /progress/daily items:', JSON.stringify(getRes.body, null, 2));
}

testPostProgress().catch(console.error);
