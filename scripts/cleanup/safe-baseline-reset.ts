import prisma from '../src/lib/prisma';
import fs from 'fs';
import path from 'path';

const isExecute = process.argv.includes('--execute');

async function main() {
  console.log(`=== SAFE BASELINE RESET: ${isExecute ? 'EXECUTE' : 'DRY-RUN'} MODE ===\n`);

  if (isExecute) {
    // Basic checks before execute
    const backupDir = path.join(process.cwd(), 'backups', 'before-safe-baseline-reset');
    if (!fs.existsSync(backupDir)) {
      throw new Error("No backup directory found!");
    }
    const backups = fs.readdirSync(backupDir);
    if (backups.length === 0) {
      throw new Error("No backups found in backups/before-safe-baseline-reset");
    }
    const latestBackup = path.join(backupDir, backups[backups.length - 1]);
    if (!fs.existsSync(path.join(latestBackup, 'database.sql')) || fs.statSync(path.join(latestBackup, 'database.sql')).size === 0) {
      throw new Error("database.sql missing or empty");
    }
    if (!fs.existsSync(path.join(latestBackup, 'storage.zip')) || fs.statSync(path.join(latestBackup, 'storage.zip')).size === 0) {
      throw new Error("storage.zip missing or empty");
    }
    if (!fs.existsSync(path.join(latestBackup, 'backup-manifest.json'))) {
      throw new Error("backup-manifest.json missing");
    }
    
    console.log(`[!] Found valid backup: ${latestBackup}`);
    console.log(`[!] Executing business data reset...\n`);
  }

  // Count to report
  const counts: Record<string, number> = {};

  const countAndLog = async (entity: string, countQuery: () => Promise<number>, deleteQuery?: () => Promise<any>) => {
    const count = await countQuery();
    counts[entity] = count;
    console.log(`| ${entity} | ${count} | ${count > 0 ? (isExecute ? 'DELETED' : 'TO BE DELETED') : 'N/A'} |`);
    if (isExecute && count > 0 && deleteQuery) {
      await deleteQuery();
    }
  };

  console.log('| Entity | Count to delete | Notes |');
  console.log('| ------ | --------------: | ----- |');

  // Deletion order (child -> parent)
  
  // AuditLog (Business ones)
  await countAndLog('AuditLog (Business)', 
    () => prisma.auditLog.count({ where: { entityType: { in: ['Project', 'SiteReport', 'Document', 'FieldProgress'] } } }),
    () => prisma.auditLog.deleteMany({ where: { entityType: { in: ['Project', 'SiteReport', 'Document', 'FieldProgress'] } } })
  );

  // SiteReportAttachment
  await countAndLog('SiteReportAttachment', 
    () => prisma.siteReportAttachment.count(),
    () => prisma.siteReportAttachment.deleteMany()
  );

  // SiteReportPhoto
  await countAndLog('SiteReportPhoto', 
    () => prisma.siteReportPhoto.count(),
    () => prisma.siteReportPhoto.deleteMany()
  );

  // SiteReportLine
  await countAndLog('SiteReportLine', 
    () => prisma.siteReportLine.count(),
    () => prisma.siteReportLine.deleteMany()
  );

  // SiteReport
  await countAndLog('SiteReport', 
    () => prisma.siteReport.count(),
    () => prisma.siteReport.deleteMany()
  );

  // Document
  await countAndLog('Document', 
    () => prisma.document.count(),
    () => prisma.document.deleteMany()
  );

  // DocumentFolder
  await countAndLog('DocumentFolder', 
    () => prisma.documentFolder.count(),
    () => prisma.documentFolder.deleteMany()
  );

  // Contract
  await countAndLog('Contract', 
    () => prisma.contract.count(),
    () => prisma.contract.deleteMany()
  );

  // Supplier
  await countAndLog('Supplier', 
    () => prisma.supplier.count(),
    () => prisma.supplier.deleteMany()
  );

  // FieldProgressEntry
  await countAndLog('FieldProgressEntry', 
    () => prisma.fieldProgressEntry.count(),
    () => prisma.fieldProgressEntry.deleteMany()
  );

  // FieldProgressItem
  await countAndLog('FieldProgressItem', 
    () => prisma.fieldProgressItem.count(),
    () => prisma.fieldProgressItem.deleteMany()
  );

  // FieldProgressTemplate
  await countAndLog('FieldProgressTemplate', 
    () => prisma.fieldProgressTemplate.count(),
    () => prisma.fieldProgressTemplate.deleteMany()
  );

  // WBSItem
  await countAndLog('WBSItem', 
    () => prisma.wBSItem.count(),
    () => prisma.wBSItem.deleteMany()
  );

  // ProjectMember
  await countAndLog('ProjectMember', 
    () => prisma.projectMember.count(),
    () => prisma.projectMember.deleteMany()
  );

  // Project
  await countAndLog('Project', 
    () => prisma.project.count(),
    () => prisma.project.deleteMany()
  );

  // Physical Storage Cleanup
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

  console.log(`| Storage Files | ${storageCount} | ${storageCount > 0 ? (isExecute ? 'DELETED' : 'TO BE DELETED') : 'N/A'} |`);

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
      fs.mkdirSync(p, { recursive: true });
    }
    console.log('\n[!] EXECUTION COMPLETED. DATABASE AND STORAGE HAVE BEEN RESET.');
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
