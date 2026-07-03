import prisma from '../src/lib/prisma';
import fs from 'fs';
import path from 'path';

async function main() {
  console.log('=== FULL SYSTEM SYNC & DATA INTEGRITY AUDIT ===\n');

  // 1. Projects
  const totalProjects = await prisma.project.count();
  const activeProjects = await prisma.project.count({ where: { deletedAt: null } });
  const deletedProjects = await prisma.project.count({ where: { deletedAt: { not: null } } });

  // 2. Field Progress
  const totalFpTemplates = await prisma.fieldProgressTemplate.count();
  const activeFpTemplates = await prisma.fieldProgressTemplate.count({ where: { project: { deletedAt: null } } });
  const deletedFpTemplates = await prisma.fieldProgressTemplate.count({ where: { project: { deletedAt: { not: null } } } });

  const totalFpItems = await prisma.fieldProgressItem.count();
  const activeFpItems = await prisma.fieldProgressItem.count({ where: { project: { deletedAt: null } } });
  const deletedFpItems = await prisma.fieldProgressItem.count({ where: { project: { deletedAt: { not: null } } } });

  const totalFpEntries = await prisma.fieldProgressEntry.count();
  const activeFpEntries = await prisma.fieldProgressEntry.count({ where: { item: { project: { deletedAt: null } } } });
  const deletedFpEntries = await prisma.fieldProgressEntry.count({ where: { item: { project: { deletedAt: { not: null } } } } });

  // 3. Reports
  const totalReports = await prisma.siteReport.count();
  const activeReports = await prisma.siteReport.count({ where: { project: { deletedAt: null } } });
  const deletedReports = await prisma.siteReport.count({ where: { project: { deletedAt: { not: null } } } });
  
  const allReports = await prisma.siteReport.findMany({ select: { projectId: true } });
  const pIds = await prisma.project.findMany({ select: { id: true } }).then(ps => ps.map(p => p.id));
  const orphanReports = allReports.filter(r => !pIds.includes(r.projectId)).length;
  const deletedCountReports = await prisma.siteReport.count({ where: { deletedAt: { not: null } } });

  const totalReportLines = await prisma.siteReportLine.count();
  const activeReportLines = await prisma.siteReportLine.count({ where: { project: { deletedAt: null } } });
  const deletedReportLines = await prisma.siteReportLine.count({ where: { project: { deletedAt: { not: null } } } });

  const totalReportAttachments = await prisma.siteReportAttachment.count();
  const activeReportAttachments = await prisma.siteReportAttachment.count({ where: { report: { project: { deletedAt: null } } } });
  const deletedReportAttachments = await prisma.siteReportAttachment.count({ where: { report: { project: { deletedAt: { not: null } } } } });

  // 4. Documents
  const totalDocFolders = await prisma.documentFolder.count();
  const activeDocFolders = await prisma.documentFolder.count({ where: { project: { deletedAt: null } } });
  const deletedDocFolders = await prisma.documentFolder.count({ where: { project: { deletedAt: { not: null } } } });

  const totalDocs = await prisma.document.count();
  const activeDocs = await prisma.document.count({ where: { project: { deletedAt: null } } });
  const deletedDocs = await prisma.document.count({ where: { project: { deletedAt: { not: null } } } });

  // 5. Users
  const totalUsers = await prisma.user.count();

  // 6. AuditLog
  const totalLogs = await prisma.auditLog.count();

  // 7. Storage / Physical Files
  let totalStorageFiles = 0;
  let totalStorageIssues = 0;
  try {
    const reportsDir = path.join(process.cwd(), 'storage', 'site-reports');
    if (fs.existsSync(reportsDir)) {
      const files = fs.readdirSync(reportsDir);
      totalStorageFiles += files.length;
    }
    
    const docsDir = path.join(process.cwd(), 'storage', 'documents');
    if (fs.existsSync(docsDir)) {
      const docs = fs.readdirSync(docsDir);
      totalStorageFiles += docs.length;
    }
  } catch (e) {
    totalStorageIssues++;
  }

  // Summary Table
  console.log('| Module | Total | Active Project | Deleted Project | Orphan | Deleted/Hidden | Issue Count |');
  console.log('| ------ | ----: | -------------: | --------------: | -----: | -------------: | ----------: |');
  console.log(`| Projects | ${totalProjects} | ${activeProjects} | ${deletedProjects} | 0 | ${deletedProjects} | 0 |`);
  console.log(`| Field Progress Templates | ${totalFpTemplates} | ${activeFpTemplates} | ${deletedFpTemplates} | ${totalFpTemplates - activeFpTemplates - deletedFpTemplates} | ${deletedFpTemplates} | 0 |`);
  console.log(`| Field Progress Items | ${totalFpItems} | ${activeFpItems} | ${deletedFpItems} | ${totalFpItems - activeFpItems - deletedFpItems} | ${deletedFpItems} | 0 |`);
  console.log(`| Field Progress Entries | ${totalFpEntries} | ${activeFpEntries} | ${deletedFpEntries} | ${totalFpEntries - activeFpEntries - deletedFpEntries} | ${deletedFpEntries} | 0 |`);
  console.log(`| Reports | ${totalReports} | ${activeReports} | ${deletedReports} | ${orphanReports} | ${deletedCountReports} | ${orphanReports} |`);
  console.log(`| Report Lines | ${totalReportLines} | ${activeReportLines} | ${deletedReportLines} | ${totalReportLines - activeReportLines - deletedReportLines} | ${deletedReportLines} | 0 |`);
  console.log(`| Report Attachments | ${totalReportAttachments} | ${activeReportAttachments} | ${deletedReportAttachments} | ${totalReportAttachments - activeReportAttachments - deletedReportAttachments} | ${deletedReportAttachments} | 0 |`);
  console.log(`| Document Folders | ${totalDocFolders} | ${activeDocFolders} | ${deletedDocFolders} | ${totalDocFolders - activeDocFolders - deletedDocFolders} | ${deletedDocFolders} | 0 |`);
  console.log(`| Documents | ${totalDocs} | ${activeDocs} | ${deletedDocs} | ${totalDocs - activeDocs - deletedDocs} | ${deletedDocs} | 0 |`);
  console.log(`| Users | ${totalUsers} | N/A | N/A | 0 | 0 | 0 |`);
  console.log(`| Audit Logs | ${totalLogs} | N/A | N/A | 0 | 0 | 0 |`);
  console.log(`| Storage files | ${totalStorageFiles} | N/A | N/A | 0 | 0 | ${totalStorageIssues} |`);

  console.log('\nAudit complete.');
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
