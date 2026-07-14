import "dotenv/config";
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.QA_RESTORE_DATABASE_URL;
if (!connectionString) throw new Error("QA_RESTORE_DATABASE_URL is required for restore verification.");
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function verify() {
  console.log('--- RESTORED DB VERIFICATION ---');
  let hasError = false;

  const fail = (msg: string) => {
    console.error(`❌ FAIL: ${msg}`);
    hasError = true;
  };

  const pass = (msg: string) => {
    console.log(`✅ PASS: ${msg}`);
  };

  // 1. Project
  const project = await prisma.project.findUnique({ where: { code: 'TH-1234' } });
  if (!project) {
    fail('Project TH-1234 not found in restored DB');
    process.exit(1);
  }
  pass('Project TH-1234 exists');

  // 2. WBS & Entries
  const wbsGroups = await prisma.fieldProgressItem.count({ where: { projectId: project.id, parentId: null } });
  if (wbsGroups !== 4) fail(`WBS groups count is ${wbsGroups}, expected 4`);
  else pass('4 WBS groups exist');

  const wbsWorks = await prisma.fieldProgressItem.count({ where: { projectId: project.id, parentId: { not: null } } });
  if (wbsWorks !== 16) fail(`WBS works count is ${wbsWorks}, expected 16`);
  else pass('16 WBS works exist');

  const entries = await prisma.fieldProgressEntry.count({ where: { projectId: project.id } });
  if (entries !== 39) fail(`Daily entries count is ${entries}, expected 39`);
  else pass('39 daily entries exist');

  // 3. Documents
  const folders = await prisma.documentFolder.count({ where: { projectId: project.id } });
  if (folders !== 8) fail(`Document folders count is ${folders}, expected 8`);
  else pass('8 document folders exist');

  const docs = await prisma.document.count({ where: { projectId: project.id } });
  if (docs !== 16) fail(`Documents count is ${docs}, expected 16`);
  else pass('16 documents exist');

  // 4. Reports
  const dailyReports = await prisma.siteReport.count({ where: { projectId: project.id, type: 'DAILY' } });
  if (dailyReports !== 14) fail(`Daily reports count is ${dailyReports}, expected 14`);
  else pass('14 daily reports exist');

  const weeklyReportsCount = await prisma.siteReport.count({ where: { projectId: project.id, type: 'WEEKLY' } });
  if (weeklyReportsCount !== 2) fail(`Weekly reports count is ${weeklyReportsCount}, expected 2`);
  else pass('2 weekly reports exist');

  // Weekly creator & history
  const weeklyReports = await prisma.siteReport.findMany({ where: { projectId: project.id, type: 'WEEKLY' }, include: { createdBy: true } });
  for (const wr of weeklyReports) {
    if (!wr.createdBy || !wr.createdById || !wr.reporterName) {
      fail(`Weekly report ${wr.reportNo} missing creator info`);
    } else {
      pass(`Weekly report ${wr.reportNo} creator is valid: ${wr.reporterName}`);
    }
  }

  // 5. Audit logs
  const logsCount = await prisma.auditLog.count({ where: { projectId: project.id } });
  if (logsCount < 10) fail(`Audit logs count is ${logsCount}, expected >= 10`);
  else pass(`Audit logs exist (Count: ${logsCount})`);

  // ReportNo null/dup
  const allReports = await prisma.siteReport.findMany({ select: { reportNo: true } });
  const reportNos = new Set();
  for (const r of allReports) {
    if (!r.reportNo) fail('Found report with null reportNo');
    if (reportNos.has(r.reportNo)) fail(`Duplicate reportNo found: ${r.reportNo}`);
    reportNos.add(r.reportNo);
  }
  pass('All reportNo are valid and unique');

  // Attachments
  const attachments = await prisma.siteReportAttachment.count();
  if (attachments === 0) fail('No attachments found in restored DB');
  else pass(`Attachments metadata exists (Count: ${attachments})`);

  if (hasError) {
    console.error('\n❌ RESTORE VERIFICATION FAILED');
    process.exit(1);
  } else {
    console.log('\n✅ RESTORE VERIFICATION PASSED');
    process.exit(0);
  }
}

verify().catch(console.error).finally(() => prisma.$disconnect());
