import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import fs from 'fs';
import path from 'path';

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    const counts = {
      User: await prisma.user.count(),
      Project: await prisma.project.count(),
      ProjectMember: await prisma.projectMember.count(),
      WBSItem: await prisma.wBSItem.count(),
      DocumentFolder: await prisma.documentFolder.count(),
      Document: await prisma.document.count(),
      SiteReport: await prisma.siteReport.count(),
      MaterialRequest: await prisma.materialRequest.count(),
      ApprovalRequest: await prisma.approvalRequest.count(),
      FieldProgressEntry: await prisma.fieldProgressEntry.count(),
      SystemSetting: await prisma.systemSetting.count(),
    };

    console.log('RECONCILIATION BASELINE (BEFORE):');
    console.table(counts);

    const outPath = path.join(process.cwd(), 'docs', 'qa', 'DB_RECONCILIATION_BASELINE_BEFORE.json');
    fs.writeFileSync(outPath, JSON.stringify(counts, null, 2), 'utf-8');
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
