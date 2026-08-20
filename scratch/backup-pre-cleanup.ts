import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import * as fs from 'fs';
import * as path from 'path';

async function backupPreCleanup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.resolve('d:/construction-erp-v2/scratch/backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const backupFile = path.join(backupDir, `backup_pre_ai01c_cleanup_${timestamp}.json`);
  console.log(`Creating full database backup before AI-01C cleanup: ${backupFile}`);

  const { default: prisma } = await import('../src/lib/prisma');

  const snapshot: Record<string, any> = {};
  const models = [
    'project', 'projectMember', 'user', 'employee', 'organizationUnit',
    'position', 'employeeOrganizationAssignment', 'employeeProjectAssignment',
    'fieldProgressTemplate', 'fieldProgressItem', 'fieldProgressEntry',
    'siteReport', 'siteReportLine', 'siteReportPhoto', 'siteReportAttachment',
    'materialItem', 'materialProposal', 'materialProposalItem', 'materialMovement',
    'projectMaterialStock', 'approvalRequest', 'auditLog', 'systemSetting'
  ];

  for (const model of models) {
    try {
      const records = await (prisma as any)[model].findMany();
      snapshot[model] = records;
      console.log(`  - Backed up ${model}: ${records.length} records`);
    } catch (e: any) {
      console.log(`  - Model ${model} skipped or error: ${e.message?.slice(0, 60)}`);
    }
  }

  fs.writeFileSync(backupFile, JSON.stringify(snapshot, null, 2), 'utf-8');
  const stats = fs.statSync(backupFile);
  console.log(`\nBackup Pre-Cleanup successfully created: ${backupFile} (${stats.size} bytes)`);

  // Verify pre-AI01B snapshot exists as well
  const preAI01bSnapshot = path.join(backupDir, 'snapshot_pre_ai01b_2026-08-20T10-06-04-086Z.json');
  if (fs.existsSync(preAI01bSnapshot)) {
    console.log(`Pre-AI01B baseline snapshot verified: ${preAI01bSnapshot} (${fs.statSync(preAI01bSnapshot).size} bytes)`);
  } else {
    console.warn(`WARNING: Pre-AI01B snapshot not found at ${preAI01bSnapshot}`);
  }

  await prisma['$disconnect']();
}

backupPreCleanup().catch(console.error);
