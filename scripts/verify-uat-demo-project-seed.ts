import prisma from '../src/lib/prisma';
import fs from 'fs';
import path from 'path';

async function main() {
  console.log('=== VERIFY UAT DEMO SEED ===\n');

  let passed = true;

  const verify = async (entity: string, expected: number | '>0', actual: number) => {
    let result = '';
    if (expected === '>0') {
      result = actual > 0 ? 'PASS' : 'FAIL';
    } else {
      result = actual === expected ? 'PASS' : 'FAIL';
    }

    if (result === 'FAIL') passed = false;

    console.log(`| ${entity.padEnd(30)} | ${expected.toString().padStart(8)} | ${actual.toString().padStart(6)} | ${result.padEnd(6)} |`);
  };

  console.log('| Entity                         | Expected | Actual | Result |');
  console.log('| ------------------------------ | -------: | -----: | ------ |');

  const uatProject = await prisma.project.findUnique({ where: { code: 'UAT-DEMO-001' } });
  
  await verify('Projects', 1, await prisma.project.count());
  await verify('Project UAT-DEMO-001 exists', 1, uatProject ? 1 : 0);
  
  if (uatProject) {
    const pid = uatProject.id;
    await verify('DocumentFolders', 8, await prisma.documentFolder.count({ where: { projectId: pid } }));
    await verify('Documents', 4, await prisma.document.count({ where: { projectId: pid } }));
    await verify('FieldProgressTemplate', 1, await prisma.fieldProgressTemplate.count({ where: { projectId: pid } }));
    await verify('FieldProgress groups', 4, await prisma.fieldProgressItem.count({ where: { projectId: pid, itemType: 'GROUP' } }));
    await verify('FieldProgress work items', 16, await prisma.fieldProgressItem.count({ where: { projectId: pid, itemType: 'WORK' } }));
    await verify('FieldProgress entries', '>0', await prisma.fieldProgressEntry.count({ where: { item: { projectId: pid } } }));
    await verify('Daily reports', 5, await prisma.siteReport.count({ where: { projectId: pid, type: 'DAILY' } }));
    await verify('Weekly reports', 1, await prisma.siteReport.count({ where: { projectId: pid, type: 'WEEKLY' } }));
    
    let storageCount = 0;
    const storagePaths = [
      path.join(process.cwd(), 'storage', 'documents', pid)
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
    await verify('Storage files', 4, storageCount);
  }

  // Removed orphan reports check because projectId is required.
  
  const deletedData = await prisma.project.count({ where: { deletedAt: { not: null } } });
  await verify('Project deleted data', 0, deletedData);

  const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
  await verify('Admin exists', '>0', adminCount);

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
