import prisma from '../src/lib/prisma';
import fs from 'fs';
import path from 'path';

async function main() {
  console.log('=== VERIFY EMPTY BUSINESS BASELINE ===\n');

  let passed = true;

  const verify = async (entity: string, expected: number | '>0', actual: number) => {
    let result = '';
    if (expected === '>0') {
      result = actual > 0 ? 'PASS' : 'FAIL';
    } else {
      result = actual === expected ? 'PASS' : 'FAIL';
    }

    if (result === 'FAIL') passed = false;

    console.log(`| ${entity.padEnd(25)} | ${expected.toString().padStart(8)} | ${actual.toString().padStart(6)} | ${result.padEnd(6)} |`);
  };

  console.log('| Entity                    | Expected | Actual | Result |');
  console.log('| ------------------------- | -------: | -----: | ------ |');

  await verify('Projects', 0, await prisma.project.count());
  await verify('SiteReports', 0, await prisma.siteReport.count());
  await verify('SiteReportLines', 0, await prisma.siteReportLine.count());
  await verify('SiteReportAttachments', 0, await prisma.siteReportAttachment.count());
  await verify('DocumentFolders', 0, await prisma.documentFolder.count());
  await verify('Documents', 0, await prisma.document.count());
  await verify('FieldProgressTemplates', 0, await prisma.fieldProgressTemplate.count());
  await verify('FieldProgressItems', 0, await prisma.fieldProgressItem.count());
  await verify('FieldProgressEntries', 0, await prisma.fieldProgressEntry.count());
  
  await verify('Business AuditLogs', 0, await prisma.auditLog.count({ where: { entityType: { in: ['Project', 'SiteReport', 'Document', 'FieldProgress'] } } }));
  await verify('Users', '>0', await prisma.user.count());
  
  const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
  await verify('Admin user exists', '>0', adminCount);

  let storageCount = 0;
  const storagePaths = [
    path.join(process.cwd(), 'storage', 'site-reports'),
    path.join(process.cwd(), 'storage', 'documents')
  ];

  const countFilesRecursive = (dir: string): number => {
    let c = 0;
    if (fs.existsSync(dir)) {
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const fullPath = path.join(dir, item);
        if (fs.statSync(fullPath).isDirectory()) {
          c += countFilesRecursive(fullPath);
        } else {
          c++;
        }
      }
    }
    return c;
  };

  for (const p of storagePaths) {
    storageCount += countFilesRecursive(p);
  }

  await verify('Storage business files', 0, storageCount);

  console.log('\nVerification result:', passed ? 'SUCCESS' : 'FAILED');
  if (!passed) {
    process.exit(1);
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
