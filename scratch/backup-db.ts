import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

async function backupDatabase() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.resolve('d:/construction-erp-v2/scratch/backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const backupFile = path.join(backupDir, `backup_pre_ai01b_${timestamp}.sql`);
  console.log(`Creating database backup at: ${backupFile}`);

  const databaseUrl = process.env.DATABASE_URL || 'postgresql://postgres:dev_rotated_secret_pass_2026_x7!@127.0.0.1:5432/construction_erp_v2_dev?schema=public';
  
  // Create a logical backup using Prisma introspection or pg_dump if available, or export all table records to json
  const { PrismaClient } = await import('@prisma/client');
  const { Pool } = await import('pg');
  const { PrismaPg } = await import('@prisma/adapter-pg');
  
  const pool = new Pool({ connectionString: databaseUrl });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

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
      console.log(`Backed up ${model}: ${records.length} records`);
    } catch (e: any) {
      console.log(`Model ${model} skipped or error: ${e.message?.slice(0, 60)}`);
    }
  }

  const snapshotJsonFile = path.join(backupDir, `snapshot_pre_ai01b_${timestamp}.json`);
  fs.writeFileSync(snapshotJsonFile, JSON.stringify(snapshot, null, 2), 'utf-8');
  console.log(`Database snapshot JSON successfully written: ${snapshotJsonFile} (${fs.statSync(snapshotJsonFile).size} bytes)`);

  await prisma['$disconnect']();
  await pool.end();
}

backupDatabase().catch(console.error);
