import prisma from '../src/lib/prisma';

async function main() {
  console.log('=== DATA INTEGRITY AUDIT: DELETED PROJECT ORPHAN DATA ===');

  // Projects
  const totalProjects = await prisma.project.count();
  const activeProjects = await prisma.project.count({ where: { deletedAt: null } });
  const deletedProjects = await prisma.project.count({ where: { deletedAt: { not: null } } });

  // Reports
  const totalReports = await prisma.siteReport.count();
  const activeProjectReports = await prisma.siteReport.count({ 
    where: { project: { deletedAt: null } } 
  });
  const deletedProjectReports = await prisma.siteReport.count({ 
    where: { project: { deletedAt: { not: null } } } 
  });
  // To find orphans where project doesn't exist at all
  // Usually Prisma will enforce foreign key, but let's check
  const allReports = await prisma.siteReport.findMany({ select: { projectId: true } });
  const projectIds = await prisma.project.findMany({ select: { id: true } }).then(ps => ps.map(p => p.id));
  const orphanReports = allReports.filter(r => !projectIds.includes(r.projectId)).length;
  
  const deletedReports = await prisma.siteReport.count({ where: { deletedAt: { not: null } } });

  // Attachments
  const totalAttachments = await prisma.siteReportAttachment.count();
  const activeProjectAttachments = await prisma.siteReportAttachment.count({
    where: { report: { project: { deletedAt: null } } }
  });
  const deletedProjectAttachments = await prisma.siteReportAttachment.count({
    where: { report: { project: { deletedAt: { not: null } } } }
  });

  // Documents
  const totalDocuments = await prisma.document.count();
  const activeProjectDocuments = await prisma.document.count({
    where: { project: { deletedAt: null } }
  });
  const deletedProjectDocuments = await prisma.document.count({
    where: { project: { deletedAt: { not: null } } }
  });

  // Field Progress
  const totalItems = await prisma.wBSItem.count();
  const activeProjectItems = await prisma.wBSItem.count({
    where: { project: { deletedAt: null } }
  });
  const deletedProjectItems = await prisma.wBSItem.count({
    where: { project: { deletedAt: { not: null } } }
  });

  // Audit Logs
  const totalLogs = await prisma.auditLog.count();
  const activeProjectLogs = 0; // Skip
  const deletedProjectLogs = 0; // Skip

  console.log('\n| Nhóm dữ liệu | Tổng | Active project | Deleted project | Orphan / Khác | Ghi chú |');
  console.log('| ------------ | ---: | -------------: | --------------: | -----: | ------- |');
  console.log(`| Project | ${totalProjects} | ${activeProjects} | ${deletedProjects} | 0 | |`);
  console.log(`| SiteReport | ${totalReports} | ${activeProjectReports} | ${deletedProjectReports} | ${orphanReports} | Deleted reports: ${deletedReports} |`);
  console.log(`| Attachment | ${totalAttachments} | ${activeProjectAttachments} | ${deletedProjectAttachments} | ${totalAttachments - activeProjectAttachments - deletedProjectAttachments} | |`);
  console.log(`| Document | ${totalDocuments} | ${activeProjectDocuments} | ${deletedProjectDocuments} | ${totalDocuments - activeProjectDocuments - deletedProjectDocuments} | |`);
  console.log(`| WBSItem | ${totalItems} | ${activeProjectItems} | ${deletedProjectItems} | ${totalItems - activeProjectItems - deletedProjectItems} | |`);
  console.log(`| AuditLog | ${totalLogs} | ${activeProjectLogs} | ${deletedProjectLogs} | ${totalLogs - activeProjectLogs - deletedProjectLogs} | |`);

  console.log('\nAudit complete.');
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
