import prisma from '../src/lib/prisma';
import fs from 'fs';
import path from 'path';
import { canUploadReportAttachment } from '../src/lib/reports/report-workflow-policy';

async function main() {
  console.log('=== AUDIT REPORT ATTACHMENT REAL UPLOAD ===\n');

  const uatProject = await prisma.project.findUnique({ where: { code: 'UAT-DEMO-001' } });
  if (!uatProject) {
    console.error('UAT-DEMO-001 project not found.');
    return;
  }

  const pid = uatProject.id;
  
  const dailyReports = await prisma.siteReport.findMany({
    where: { projectId: pid, type: 'DAILY' },
    include: {
      attachments: true
    },
    orderBy: { reportDate: 'asc' }
  });

  console.log('| Report No | Status | Attachment Count | Missing Files | Can Upload By Policy | Notes |');
  console.log('| --------- | ------ | ---------------: | ------------: | -------------------- | ----- |');

  for (const r of dailyReports) {
    let missingFiles = 0;
    for (const att of r.attachments) {
      const p = path.join(process.cwd(), att.storagePath);
      if (!fs.existsSync(p)) missingFiles++;
    }
    const canUpload = canUploadReportAttachment(r.status);
    console.log(`| ${r.reportNo} | ${r.status} | ${r.attachments.length} | ${missingFiles} | ${canUpload ? 'YES' : 'NO'} | - |`);
  }

  console.log('\n## Attachment Details\n');
  console.log('| Attachment ID | Report No | Kind | File name | MIME | DB size | Actual size | Exists | Path safe | Download URL check |');
  console.log('| ------------- | --------- | ---- | --------- | ---- | ------: | ----------: | ------ | --------- | ------------------ |');

  for (const r of dailyReports) {
    for (const att of r.attachments) {
      const p = path.join(process.cwd(), att.storagePath);
      const exists = fs.existsSync(p);
      const actualSize = exists ? fs.statSync(p).size : 0;
      const pathSafe = !att.storagePath.includes('..') && !att.storagePath.startsWith('/');
      
      console.log(`| ${att.id.substring(0,8)}... | ${r.reportNo} | ${att.kind} | ${att.originalName} | ${att.mimeType} | ${att.sizeBytes} | ${actualSize} | ${exists ? 'YES' : 'NO'} | ${pathSafe ? 'YES' : 'NO'} | /api/reports/attachments/${att.id} |`);
    }
  }

  console.log('\n[!] Audit complete.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
