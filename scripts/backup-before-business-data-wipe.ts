import 'dotenv/config';
import prisma from '../src/lib/prisma';
import fs from 'fs';
import path from 'path';

async function main() {
  console.log('Starting DB Backup (JSON Export) before wipe...');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(process.cwd(), 'backups', 'business-data-wipe', `json-export-${timestamp}`);
  
  fs.mkdirSync(backupDir, { recursive: true });

  const models = [
    'project', 'projectMember', 'wBSItem', 'documentFolder', 'document',
    'siteReport', 'siteReportLine', 'siteReportAttachment', 'siteReportPhoto',
    'contract', 'paymentPlan', 'paymentRecord', 'paymentRequest', 'approvalRequest',
    'materialRequest', 'materialRequestItem', 'materialMovement', 'projectMaterialStock',
    'fieldProgressTemplate', 'fieldProgressItem', 'fieldProgressEntry', 'fieldMaterialRequest', 'fieldMaterialRequestItem',
    'notification', 'auditLog', 'chatMessage', 'supplier', 'materialItem', 'user', 'systemSetting'
  ];

  const metadata: any = {
    runDate: new Date().toISOString(),
    databaseUrl: process.env.DATABASE_URL ? process.env.DATABASE_URL.replace(/:[^:@]*@/, ':***@') : 'unknown',
    modelCounts: {},
    exportStatus: 'RUNNING'
  };

  try {
    for (const model of models) {
      console.log(`Exporting ${model}...`);
      const delegate = (prisma as any)[model];
      if (!delegate) {
        console.warn(`Model ${model} not found on Prisma Client. Skipping.`);
        continue;
      }

      const data = await delegate.findMany();
      metadata.modelCounts[model] = data.length;

      fs.writeFileSync(
        path.join(backupDir, `${model}.json`),
        JSON.stringify(data, null, 2)
      );
    }
    metadata.exportStatus = 'SUCCESS';
    console.log(`Backup completed successfully to ${backupDir}`);
  } catch (error: any) {
    metadata.exportStatus = 'FAILED';
    metadata.error = error.message;
    console.error('Backup failed:', error);
    process.exit(1);
  } finally {
    fs.writeFileSync(
      path.join(backupDir, 'metadata.json'),
      JSON.stringify(metadata, null, 2)
    );
    await prisma.$disconnect();
  }
}

main();
