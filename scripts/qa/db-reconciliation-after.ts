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
    const afterCounts = {
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

    console.log('RECONCILIATION CHECK (AFTER):');
    console.table(afterCounts);

    const beforeFilePath = path.join(process.cwd(), 'docs', 'qa', 'DB_RECONCILIATION_BASELINE_BEFORE.json');
    if (fs.existsSync(beforeFilePath)) {
      const beforeCounts = JSON.parse(fs.readFileSync(beforeFilePath, 'utf-8'));
      let mismatch = false;
      for (const [key, value] of Object.entries(afterCounts)) {
        if (beforeCounts[key] !== value) {
          console.error(`MISMATCH FOUND IN ${key}: Before=${beforeCounts[key]}, After=${value}`);
          mismatch = true;
        }
      }
      if (!mismatch) {
        console.log('SUCCESS: All non-task table record counts match the pre-migration baseline 100%!');
      } else {
        process.exit(1);
      }
    }
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
