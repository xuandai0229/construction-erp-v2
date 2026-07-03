import prisma from '../src/lib/prisma';

async function main() {
  console.log('=== DRY-RUN: CLEANUP DELETED PROJECT DATA ===\n');

  // Find all deleted projects
  const deletedProjects = await prisma.project.findMany({
    where: { deletedAt: { not: null } },
    select: { id: true, name: true, code: true, deletedAt: true }
  });

  if (deletedProjects.length === 0) {
    console.log('No deleted projects found. Nothing to clean up.');
    return;
  }

  const projectIds = deletedProjects.map(p => p.id);

  console.log('| Entity | ID | Name/No | Project | Status | Proposed action | Risk |');
  console.log('| ------ | -- | ------- | ------- | ------ | --------------- | ---- |');

  // Reports
  const reports = await prisma.siteReport.findMany({
    where: { projectId: { in: projectIds }, deletedAt: null },
    select: { id: true, reportNo: true, project: { select: { code: true } } }
  });

  reports.forEach(r => {
    console.log(`| SiteReport | ${r.id} | ${r.reportNo} | ${r.project.code} | Active | SOFT_DELETE_CHILD | Low |`);
  });

  const attachments = await prisma.siteReportAttachment.findMany({
    where: { report: { projectId: { in: projectIds } } },
    select: { id: true, storagePath: true, report: { select: { project: { select: { code: true } } } } }
  });

  attachments.forEach(a => {
    console.log(`| Attachment | ${a.id} | ${(a.storagePath || "unknown").substring(0, 20)}... | ${a.report.project.code} | N/A | KEEP_HIDDEN | Medium |`);
  });

  const documents = await prisma.document.findMany({
    where: { projectId: { in: projectIds }, deletedAt: null },
    select: { id: true, originalName: true, project: { select: { code: true } } }
  });

  documents.forEach(d => {
    console.log(`| Document | ${d.id} | ${d.originalName} | ${d.project.code} | Active | SOFT_DELETE_CHILD | Low |`);
  });

  // Field Progress Items
  const wbsItems = await prisma.wBSItem.findMany({
    where: { projectId: { in: projectIds }, deletedAt: null },
    select: { id: true, name: true, project: { select: { code: true } } }
  });

  wbsItems.forEach(w => {
    console.log(`| WBSItem | ${w.id} | ${w.name} | ${w.project.code} | Active | SOFT_DELETE_CHILD | Low |`);
  });

  console.log('\nDRY RUN ONLY — NO DATABASE OR FILE CHANGES WERE MADE');
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
