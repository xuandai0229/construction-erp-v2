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

const STORAGE_ROOT = path.join(process.cwd(), 'storage');

async function checkIntegrity() {
  console.log('--- STARTING RIGOROUS INTEGRITY CHECK ---');

  // Check that ONLY 1 UAT project exists
  const uatProjects = await prisma.project.findMany({
    where: {
      OR: [
        { code: { startsWith: 'UAT' } },
        { name: { contains: 'UAT' } }
      ]
    }
  });

  if (uatProjects.length !== 1) {
    console.error(`FAIL: Expected exactly 1 UAT project, found ${uatProjects.length}.`);
    return;
  }
  const project = uatProjects[0];
  console.log('PASS: Only 1 UAT Project exists.');

  // 1. Field Progress
  const template = await prisma.fieldProgressTemplate.findFirst({ where: { projectId: project.id } });
  if (!template) {
    console.error('FAIL: Field Progress Template not found.');
  } else {
    const itemsCount = await prisma.fieldProgressItem.count({ where: { templateId: template.id } });
    if (itemsCount !== 12) console.error(`FAIL: Expected 12 Field Progress Items, found ${itemsCount}.`);
    else console.log('PASS: Exactly 12 Field Progress Items found.');

    const entriesCount = await prisma.fieldProgressEntry.count({ where: { templateId: template.id } });
    if (entriesCount < 14) console.error(`FAIL: Expected at least 14 Field Progress Entries (for 7 days), found ${entriesCount}.`);
    else console.log('PASS: Enough Field Progress Entries found.');
  }

  // 2. Documents
  const foldersCount = await prisma.documentFolder.count({ where: { projectId: project.id } });
  if (foldersCount !== 8) console.error(`FAIL: Expected 8 Document Folders, found ${foldersCount}.`);
  else console.log('PASS: Exactly 8 Document Folders found.');

  const docs = await prisma.document.findMany({ where: { projectId: project.id } });
  if (docs.length !== 10) console.error(`FAIL: Expected 10 Documents, found ${docs.length}.`);
  else console.log('PASS: Exactly 10 Documents found.');

  let absolutePaths = 0;
  let missingFiles = 0;
  for (const d of docs) {
    if (d.storagePath.startsWith('C:') || d.storagePath.startsWith('/')) absolutePaths++;
    const absPath = path.join(STORAGE_ROOT, d.storagePath);
    if (!fs.existsSync(absPath)) {
      missingFiles++;
      console.error(`Missing document file on disk: ${absPath}`);
    }
  }
  if (absolutePaths > 0) console.error(`FAIL: Found ${absolutePaths} documents with absolute storage paths.`);
  else console.log('PASS: No absolute storage paths in Documents.');
  if (missingFiles > 0) console.error(`FAIL: Found ${missingFiles} missing document files on disk.`);
  else console.log('PASS: All Document files exist on disk.');

  // 3. Site Reports
  const dailyReports = await prisma.siteReport.findMany({ where: { projectId: project.id, type: 'DAILY' }, include: { attachments: true } });
  if (dailyReports.length !== 7) console.error(`FAIL: Expected 7 Daily Reports, found ${dailyReports.length}.`);
  else console.log('PASS: Exactly 7 Daily Reports found.');

  const statusCount = { APPROVED: 0, DRAFT: 0, SUBMITTED: 0, REJECTED: 0 };
  for (const r of dailyReports) {
    statusCount[r.status as keyof typeof statusCount] = (statusCount[r.status as keyof typeof statusCount] || 0) + 1;
    if (r.status === 'REJECTED' && !r.rejectedReason) console.error(`FAIL: Rejected report ${r.id} missing reason.`);
    
    // Check audit logs for approved
    if (r.status === 'APPROVED') {
      const logs = await prisma.auditLog.count({ where: { entityId: r.id, action: 'APPROVE_SITE_REPORT' } });
      if (logs === 0) console.error(`FAIL: Approved report ${r.id} missing audit log.`);
    }
  }
  
  if (statusCount.APPROVED === 4 && statusCount.DRAFT === 1 && statusCount.SUBMITTED === 1 && statusCount.REJECTED === 1) {
    console.log('PASS: Daily Report status distribution is exactly 4/1/1/1.');
  } else {
    console.error(`FAIL: Incorrect status distribution: ${JSON.stringify(statusCount)}`);
  }

  const weeklyReports = await prisma.siteReport.findMany({ where: { projectId: project.id, type: 'WEEKLY' }, include: { lines: true, attachments: true } });
  if (weeklyReports.length !== 1) {
    console.error(`FAIL: Expected exactly 1 Weekly Report, found ${weeklyReports.length}.`);
  } else {
    const w = weeklyReports[0];
    console.log('PASS: Exactly 1 Weekly Report found.');
    if (w.status !== 'APPROVED') console.error('FAIL: Weekly report status not APPROVED.');
    if (!w.createdById || !w.reporterName) console.error('FAIL: Weekly report missing creator ID or Name (N/A bug).');
    else console.log('PASS: Weekly Report has valid creator.');
    if (w.lines.length === 0) console.error('FAIL: Weekly report has no lines.');
    else console.log('PASS: Weekly Report has lines.');
    if (w.attachments.length === 0) console.error('FAIL: Weekly report has no attachments.');
    else console.log('PASS: Weekly Report has attachments.');
    const wLogs = await prisma.auditLog.count({ where: { entityId: w.id } });
    if (wLogs < 2) console.error('FAIL: Weekly report missing audit logs.');
    else console.log('PASS: Weekly Report has audit logs.');
  }

  const allReports = [...dailyReports, ...weeklyReports];
  const reportNos = new Set();
  let duplicateNos = 0;
  let nullNos = 0;
  for (const r of allReports) {
    if (!r.reportNo) nullNos++;
    else if (reportNos.has(r.reportNo)) duplicateNos++;
    else reportNos.add(r.reportNo);
    
    // Check attachments
    for (const a of r.attachments) {
      if (a.storagePath.startsWith('C:') || a.storagePath.startsWith('/')) absolutePaths++;
      const absPath = path.join(STORAGE_ROOT, a.storagePath);
      if (!fs.existsSync(absPath)) {
        missingFiles++;
        console.error(`Missing attachment file on disk: ${absPath}`);
      }
    }
  }
  if (nullNos > 0) console.error(`FAIL: Found ${nullNos} reports with null reportNo.`);
  else if (duplicateNos > 0) console.error(`FAIL: Found ${duplicateNos} reports with duplicate reportNo.`);
  else console.log('PASS: All reportNos are unique and not null.');
  
  if (missingFiles === 0) console.log('PASS: All Attachment files exist on disk.');

  // Check git tracking of storage
  // Normally .gitignore should have storage/*, we assume it does if it's setup right, but checking via node
  const gitIgnorePath = path.join(process.cwd(), '.gitignore');
  if (fs.existsSync(gitIgnorePath)) {
    const gitIgnore = fs.readFileSync(gitIgnorePath, 'utf8');
    if (gitIgnore.includes('storage/') || gitIgnore.includes('storage/*')) {
       console.log('PASS: storage/ is in .gitignore');
    } else {
       console.error('FAIL: storage/ not explicitly in .gitignore');
    }
  }

  console.log('--- INTEGRITY CHECK COMPLETED ---');
}

checkIntegrity()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
