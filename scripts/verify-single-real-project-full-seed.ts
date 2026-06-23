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

async function verify() {
  console.log('--- VERIFYING SEED DATA ---');
  let hasError = false;

  const fail = (msg: string) => {
    console.error(`❌ FAIL: ${msg}`);
    hasError = true;
  };

  const pass = (msg: string) => {
    console.log(`✅ PASS: ${msg}`);
  };

  const projects = await prisma.project.findMany();
  if (projects.length !== 1) fail(`Project count is ${projects.length}, expected 1`);
  else if (projects[0].code !== 'TH-1234') fail(`Project code is ${projects[0].code}, expected TH-1234`);
  else pass('Only 1 project exists with code TH-1234');

  if (projects.length === 0) {
    process.exit(1);
  }

  const project = projects[0];

  const folders = await prisma.documentFolder.findMany({ where: { projectId: project.id } });
  if (folders.length !== 8) fail(`Folder count is ${folders.length}, expected 8`);
  else pass('Document folders count is 8');

  const docs = await prisma.document.findMany({ where: { projectId: project.id } });
  if (docs.length !== 16) fail(`Document count is ${docs.length}, expected 16`);
  else pass('Document count is 16');

  // Verify documents physical files
  const storageRoot = path.join(process.cwd(), 'storage');
  for (const doc of docs) {
    if (doc.storagePath.includes('C:') || doc.storagePath.startsWith('/')) {
      fail(`Absolute storage path found: ${doc.storagePath}`);
    }
    const fullPath = path.join(storageRoot, doc.storagePath);
    if (!fs.existsSync(fullPath)) fail(`Document file missing: ${fullPath}`);
  }

  const wbsGroups = await prisma.fieldProgressItem.findMany({ where: { projectId: project.id, itemType: 'GROUP' } });
  if (wbsGroups.length !== 4) fail(`WBS Groups count is ${wbsGroups.length}, expected 4`);
  else pass('WBS Groups count is 4');

  const wbsWorks = await prisma.fieldProgressItem.findMany({ where: { projectId: project.id, itemType: 'WORK' } });
  if (wbsWorks.length !== 16) fail(`WBS Works count is ${wbsWorks.length}, expected 16`);
  else pass('WBS Works count is 16');

  const entries = await prisma.fieldProgressEntry.findMany({ where: { projectId: project.id } });
  // There are 39 entries in 14 days according to the seed script
  if (entries.length !== 39) fail(`Daily entries count is ${entries.length}, expected 39`);
  else pass('Daily entries count is 39');

  // Verify design quantity not exceeded
  const worksWithEntries = await prisma.fieldProgressItem.findMany({
    where: { projectId: project.id, itemType: 'WORK' },
    include: { entries: true }
  });

  for (const work of worksWithEntries) {
    if (work.designQuantity) {
      const sum = work.entries.reduce((a, b) => a + Number(b.quantity), 0);
      if (sum > Number(work.designQuantity)) {
        fail(`Work ${work.workContent} exceeded design quantity: ${sum} > ${work.designQuantity}`);
      }
    }
  }

  const dailyReports = await prisma.siteReport.findMany({ where: { projectId: project.id, type: 'DAILY' } });
  if (dailyReports.length !== 14) fail(`Daily reports count is ${dailyReports.length}, expected 14`);
  else pass('Daily reports count is 14');

  const statusCount = dailyReports.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (statusCount['APPROVED'] !== 10) fail(`Daily APPROVED count is ${statusCount['APPROVED']}, expected 10`);
  if (statusCount['SUBMITTED'] !== 2) fail(`Daily SUBMITTED count is ${statusCount['SUBMITTED']}, expected 2`);
  if (statusCount['DRAFT'] !== 1) fail(`Daily DRAFT count is ${statusCount['DRAFT']}, expected 1`);
  if (statusCount['REJECTED'] !== 1) fail(`Daily REJECTED count is ${statusCount['REJECTED']}, expected 1`);
  
  if (statusCount['APPROVED'] === 10 && statusCount['SUBMITTED'] === 2 && statusCount['DRAFT'] === 1 && statusCount['REJECTED'] === 1) {
    pass('Daily reports status distribution is correct');
  }

  // Daily reports verify workflow history
  const rejected = dailyReports.find(r => r.status === 'REJECTED');
  if (rejected && !rejected.rejectedReason) fail('REJECTED report is missing rejectedReason');

  for (const dr of dailyReports) {
    const logs = await prisma.auditLog.findMany({ where: { entityId: dr.id, entityType: 'SITE_REPORT' } });
    if (dr.status === 'APPROVED' && !logs.find(l => l.action === 'APPROVE_SITE_REPORT')) {
      fail(`APPROVED report ${dr.reportNo} missing APPROVE_SITE_REPORT log`);
    }
  }

  const weeklyReports = await prisma.siteReport.findMany({ where: { projectId: project.id, type: 'WEEKLY' } },);
  if (weeklyReports.length !== 2) fail(`Weekly reports count is ${weeklyReports.length}, expected 2`);
  else pass('Weekly reports count is 2');

  for (const wr of weeklyReports) {
    if (!wr.createdById) fail(`Weekly report ${wr.reportNo} creator is null`);
    else if (!wr.reporterName) fail(`Weekly report ${wr.reportNo} reporterName is null`);
    
    const lines = await prisma.siteReportLine.findMany({ where: { siteReportId: wr.id } });
    if (lines.length === 0) fail(`Weekly report ${wr.reportNo} has 0 lines`);
    
    const attachments = await prisma.siteReportAttachment.findMany({ where: { reportId: wr.id } });
    if (attachments.length === 0) fail(`Weekly report ${wr.reportNo} has 0 attachments`);

    const logs = await prisma.auditLog.findMany({ where: { entityId: wr.id, entityType: 'SITE_REPORT' } });
    if (logs.length === 0) fail(`Weekly report ${wr.reportNo} missing AuditLog`);
  }

  // Verify attachments physical files
  const attachments = await prisma.siteReportAttachment.findMany({ where: { report: { projectId: project.id } } });
  for (const att of attachments) {
    if (att.storagePath.includes('C:') || att.storagePath.startsWith('/')) {
      fail(`Absolute storage path found: ${att.storagePath}`);
    }
    const fullPath = path.join(storageRoot, att.storagePath);
    if (!fs.existsSync(fullPath)) fail(`Attachment file missing: ${fullPath}`);
  }

  // Orphan checks
  const allReportIds = [...dailyReports.map(r => r.id), ...weeklyReports.map(r => r.id)];
  const orphanAttachments = await prisma.siteReportAttachment.findMany({
    where: { reportId: { notIn: allReportIds } }
  });
  if (orphanAttachments.length > 0) fail(`Found ${orphanAttachments.length} orphan attachments`);

  // ReportNo null/trùng check
  const reportNos = new Set();
  for (const r of [...dailyReports, ...weeklyReports]) {
    if (!r.reportNo) fail(`Report missing reportNo`);
    if (reportNos.has(r.reportNo)) fail(`Duplicate reportNo: ${r.reportNo}`);
    reportNos.add(r.reportNo);
  }

  if (hasError) {
    console.error('\n❌ INTEGRITY CHECK FAILED');
    process.exit(1);
  } else {
    console.log('\n✅ INTEGRITY CHECK PASSED SUCCESSFULLY');
    process.exit(0);
  }
}

verify().catch(console.error).finally(() => prisma.$disconnect());
