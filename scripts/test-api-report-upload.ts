import fs from 'fs';
import path from 'path';
import prisma from '../src/lib/prisma';

async function main() {
  console.log('=== TEST API REPORT UPLOAD ===\n');

  // 1. Get DRAFT report
  const report = await prisma.siteReport.findFirst({
    where: { status: 'DRAFT', project: { code: 'UAT-DEMO-001' } }
  });

  if (!report) {
    throw new Error('No DRAFT report found.');
  }

  const reportId = report.id;
  console.log(`Using report: ${report.reportNo} (${reportId})`);

  const adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN', deletedAt: null } });
  if (!adminUser) throw new Error('No ADMIN user found.');
  const { createSessionToken } = await import('../src/lib/session-token');
  const token = createSessionToken(adminUser.id);
  const cookie = `auth_session=${token}`;
  console.log('Session token created for Admin.');

  // 3. Helper to upload
  async function uploadFile(filePath: string, kind: string, expectedStatus: number) {
    const fileName = path.basename(filePath);
    console.log(`\nUploading: ${fileName} as ${kind}`);
    
    const buffer = fs.readFileSync(filePath);
    const blob = new Blob([buffer]);
    const formData = new FormData();
    formData.append('kind', kind);
    formData.append('files', blob, fileName);

    const res = await fetch(`http://localhost:3000/api/reports/${reportId}/attachments`, {
      method: 'POST',
      headers: {
        'Cookie': cookie!
      },
      body: formData
    });

    const data = await res.json().catch(() => ({}));
    console.log(`Status: ${res.status}`);
    console.log(`Response:`, data);

    if (res.status !== expectedStatus) {
      console.error(`ERROR: Expected status ${expectedStatus}, got ${res.status}`);
    } else {
      console.log(`SUCCESS: Expected status matched.`);
    }
  }

  // 4. Upload valid PNG
  await uploadFile(path.join(process.cwd(), 'storage', 'uat-upload-fixtures', 'UAT_REAL_SITE_PHOTO_001.png'), 'PHOTO', 200);

  // 5. Upload valid PDF
  await uploadFile(path.join(process.cwd(), 'storage', 'uat-upload-fixtures', 'UAT_REAL_REPORT_ATTACHMENT_001.pdf'), 'FILE', 200);

  // 6. Upload invalid Fake JPG
  await uploadFile(path.join(process.cwd(), 'storage', 'uat-upload-fixtures', 'UAT_FAKE_IMAGE.jpg'), 'PHOTO', 400);

  console.log('\n[!] Test complete.');
}

main().catch(console.error).finally(() => process.exit(0));
