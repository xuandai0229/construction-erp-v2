import prisma from '../src/lib/prisma';
import fs from 'fs';
import path from 'path';

const isExecute = process.argv.includes('--execute');

async function main() {
  console.log(`=== CLEANUP UAT DEMO PROJECT: ${isExecute ? 'EXECUTE' : 'DRY-RUN'} MODE ===\n`);

  const uatProject = await prisma.project.findUnique({ where: { code: 'UAT-DEMO-001' } });
  if (!uatProject) {
    console.log('Project UAT-DEMO-001 not found. Nothing to clean.');
    return;
  }

  const projectId = uatProject.id;
  const counts: Record<string, number> = {};

  const countAndLog = async (entity: string, countQuery: () => Promise<number>, deleteQuery?: () => Promise<any>) => {
    const count = await countQuery();
    counts[entity] = count;
    console.log(`| ${entity.padEnd(25)} | ${count.toString().padStart(6)} | ${count > 0 ? (isExecute ? 'DELETED' : 'TO BE DELETED') : 'N/A'} |`);
    if (isExecute && count > 0 && deleteQuery) {
      await deleteQuery();
    }
  };

  console.log('| Entity                    | Count  | Notes |');
  console.log('| ------------------------- | ------ | ----- |');

  // AuditLogs (Business)
  await countAndLog('AuditLog', 
    () => prisma.auditLog.count({ where: { entityId: projectId } }),
    () => prisma.auditLog.deleteMany({ where: { entityId: projectId } })
  );

  // FieldProgressEntry
  await countAndLog('FieldProgressEntry', 
    () => prisma.fieldProgressEntry.count({ where: { item: { projectId } } }),
    () => prisma.fieldProgressEntry.deleteMany({ where: { item: { projectId } } })
  );

  // FieldProgressItem
  await countAndLog('FieldProgressItem', 
    () => prisma.fieldProgressItem.count({ where: { projectId } }),
    () => prisma.fieldProgressItem.deleteMany({ where: { projectId } })
  );

  // FieldProgressTemplate
  await countAndLog('FieldProgressTemplate', 
    () => prisma.fieldProgressTemplate.count({ where: { projectId } }),
    () => prisma.fieldProgressTemplate.deleteMany({ where: { projectId } })
  );

  // SiteReportLine
  await countAndLog('SiteReportLine', 
    () => prisma.siteReportLine.count({ where: { siteReport: { projectId } } }),
    () => prisma.siteReportLine.deleteMany({ where: { siteReport: { projectId } } })
  );

  // SiteReportAttachment
  await countAndLog('SiteReportAttachment', 
    () => prisma.siteReportAttachment.count({ where: { report: { projectId } } }),
    () => prisma.siteReportAttachment.deleteMany({ where: { report: { projectId } } })
  );

  // SiteReport
  await countAndLog('SiteReport', 
    () => prisma.siteReport.count({ where: { projectId } }),
    () => prisma.siteReport.deleteMany({ where: { projectId } })
  );

  // Document
  await countAndLog('Document', 
    () => prisma.document.count({ where: { projectId } }),
    () => prisma.document.deleteMany({ where: { projectId } })
  );

  // DocumentFolder
  await countAndLog('DocumentFolder', 
    () => prisma.documentFolder.count({ where: { projectId } }),
    () => prisma.documentFolder.deleteMany({ where: { projectId } })
  );

  // Project
  await countAndLog('Project', 
    () => prisma.project.count({ where: { id: projectId } }),
    () => prisma.project.deleteMany({ where: { id: projectId } })
  );

  // Storage Cleanup
  let storageCount = 0;
  // We need to find all report IDs for this project to clean their storage
  const reports = await prisma.siteReport.findMany({ where: { projectId }, select: { id: true } });
  
  const storagePaths = [
    path.join(process.cwd(), 'storage', 'documents', projectId),
    ...reports.map(r => path.join(process.cwd(), 'storage', 'site-reports', r.id))
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

  console.log(`| Storage Files             | ${storageCount.toString().padStart(6)} | ${storageCount > 0 ? (isExecute ? 'DELETED' : 'TO BE DELETED') : 'N/A'} |`);

  if (isExecute) {
    const deleteFolderRecursive = (dir: string) => {
      if (fs.existsSync(dir)) {
        fs.readdirSync(dir).forEach((file) => {
          const curPath = path.join(dir, file);
          if (fs.statSync(curPath).isDirectory()) {
            deleteFolderRecursive(curPath);
          } else {
            fs.unlinkSync(curPath);
          }
        });
        fs.rmdirSync(dir);
      }
    };

    for (const p of storagePaths) {
      deleteFolderRecursive(p);
    }
    console.log('\n[!] EXECUTION COMPLETED. UAT DEMO DATA HAS BEEN CLEANED.');
  } else {
    console.log('\nDRY RUN ONLY — NO DATABASE OR FILE CHANGES WERE MADE');
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
