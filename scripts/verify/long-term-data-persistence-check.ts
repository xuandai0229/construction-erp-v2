import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function checkPersistence() {
  console.log('--- LONG-TERM DATA PERSISTENCE CHECK ---');
  let hasError = false;

  const fail = (msg: string) => {
    console.error(`❌ FAIL: ${msg}`);
    hasError = true;
  };

  const pass = (msg: string) => {
    console.log(`✅ PASS: ${msg}`);
  };

  // 1. Check Project
  const project = await prisma.project.findUnique({ where: { code: 'TH-1234' } });
  if (!project) {
    fail('Project TH-1234 not found');
    process.exit(1);
  }
  pass('Project TH-1234 exists in database');

  // 2. WBS & Entries
  const wbsItems = await prisma.fieldProgressItem.count({ where: { projectId: project.id } });
  if (wbsItems !== 20) fail(`WBS items count is ${wbsItems}, expected 20`);
  else pass('WBS items (4 groups + 16 works) exist');

  const entries = await prisma.fieldProgressEntry.count({ where: { projectId: project.id } });
  if (entries !== 39) fail(`Daily entries count is ${entries}, expected 39`);
  else pass('39 daily entries exist');

  // 3. Documents
  const folders = await prisma.documentFolder.count({ where: { projectId: project.id } });
  if (folders !== 8) fail(`Document folders count is ${folders}, expected 8`);
  else pass('8 document folders exist');

  const docs = await prisma.document.findMany({ where: { projectId: project.id } });
  if (docs.length !== 16) fail(`Documents count is ${docs.length}, expected 16`);
  else pass('16 documents exist in database');

  const storageRoot = path.join(process.cwd(), 'storage');
  for (const doc of docs) {
    const fullPath = path.join(storageRoot, doc.storagePath);
    if (!fs.existsSync(fullPath)) fail(`Document file missing on disk: ${fullPath}`);
  }
  pass('All document files exist on disk');

  // 4. Reports
  const dailyReports = await prisma.siteReport.count({ where: { projectId: project.id, type: 'DAILY' } });
  if (dailyReports !== 14) fail(`Daily reports count is ${dailyReports}, expected 14`);
  else pass('14 daily reports exist');

  const weeklyReports = await prisma.siteReport.count({ where: { projectId: project.id, type: 'WEEKLY' } });
  if (weeklyReports !== 2) fail(`Weekly reports count is ${weeklyReports}, expected 2`);
  else pass('2 weekly reports exist');

  // 5. Attachments
  const attachments = await prisma.siteReportAttachment.findMany({ where: { report: { projectId: project.id } } });
  for (const att of attachments) {
    if (att.storagePath.includes('..') || path.isAbsolute(att.storagePath)) {
      fail(`Invalid absolute/traversal path in DB: ${att.storagePath}`);
    }
    const fullPath = path.join(storageRoot, att.storagePath);
    if (!fs.existsSync(fullPath)) fail(`Attachment file missing on disk: ${fullPath}`);
  }
  pass(`All ${attachments.length} attachments exist on disk and paths are safe`);

  // 6. Audit logs
  const logsCount = await prisma.auditLog.count({ where: { projectId: project.id } });
  if (logsCount < 10) fail(`Audit logs count is ${logsCount}, expected >= 10`);
  else pass(`Audit logs exist (Count: ${logsCount})`);

  // 7. Query Date Range Test
  const now = new Date('2026-06-22T12:00:00Z'); // Fake now since data is around 2026-06-14
  
  // 1 week query: (15th to 22nd) -> Should be 0 since our data is 01 to 14
  const oneWeekAgo = new Date(now); oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const weekEntries = await prisma.fieldProgressEntry.count({
    where: { projectId: project.id, entryDate: { gte: oneWeekAgo, lte: now } }
  });
  if (weekEntries !== 0) fail(`1-week query got ${weekEntries}, expected 0`);
  else pass('1-week query returns correct count (0)');

  // 1 month query: (May 22 to Jun 22) -> Should be all 39 since data is Jun 01 to Jun 14
  const oneMonthAgo = new Date(now); oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
  const monthEntries = await prisma.fieldProgressEntry.count({
    where: { projectId: project.id, entryDate: { gte: oneMonthAgo, lte: now } }
  });
  if (monthEntries !== 39) fail(`1-month query got ${monthEntries}, expected 39`);
  else pass('1-month query returns correct count (39)');

  // 1 year query: Should be all 39
  const oneYearAgo = new Date(now); oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const yearEntries = await prisma.fieldProgressEntry.count({
    where: { projectId: project.id, entryDate: { gte: oneYearAgo, lte: now } }
  });
  if (yearEntries !== 39) fail(`1-year query got ${yearEntries}, expected 39`);
  else pass('1-year query returns correct count (39)');

  if (hasError) {
    console.error('\n❌ LONG-TERM DATA PERSISTENCE CHECK FAILED');
    process.exit(1);
  } else {
    console.log('\n✅ LONG-TERM DATA PERSISTENCE CHECK PASSED');
    process.exit(0);
  }
}

checkPersistence().catch(console.error).finally(() => prisma.$disconnect());
