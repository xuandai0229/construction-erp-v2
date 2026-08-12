import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function auditQaDataIsolation() {
  console.log('========================================================================');
  console.log('🔍 QA DATA ISOLATION & RECONCILIATION AUDIT');
  console.log('========================================================================\n');

  const allProjects = await prisma.project.findMany({
    orderBy: { createdAt: 'asc' },
    select: { id: true, code: true, name: true, status: true, _count: { select: { wbsItems: true } } },
  });

  console.log(`Total Projects in Database: ${allProjects.length}`);

  const targetProject = allProjects.find((p) => p.code === 'CT-2026-0003' || p.id === 'cms9tydgm0004n4k5luf4qn5n');

  if (targetProject) {
    console.log(`\nQA Test Target Project: ${targetProject.name} (${targetProject.code} / ${targetProject.id})`);
    console.log(`WBS Items Count in this project: ${targetProject._count.wbsItems}`);
  }

  // Count QA progress entries vs non-QA entries
  const allEntries = await prisma.fieldProgressEntry.findMany({
    select: { id: true, projectId: true, note: true, createdAt: true },
  });

  const qaEntries = allEntries.filter((e) => e.note && e.note.startsWith('QA_MOBILE_PHASE2'));
  console.log(`\nTotal FieldProgressEntry records in DB: ${allEntries.length}`);
  console.log(`QA Marker Entries (QA_MOBILE_PHASE2_*): ${qaEntries.length}`);
  console.log(`Non-QA FieldProgressEntry records: ${allEntries.length - qaEntries.length}`);

  console.log('\nList of all projects and WBS count:');
  allProjects.forEach((p, idx) => {
    console.log(`[${idx + 1}] ${p.code} | ${p.name} | Status: ${p.status} | WBS: ${p._count.wbsItems}`);
  });
}

auditQaDataIsolation().catch(console.error).finally(() => {
  prisma.$disconnect();
  pool.end();
});
