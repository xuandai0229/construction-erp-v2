import prisma from '../src/lib/prisma';

async function verify() {
  console.log("--- DB Verification ---");
  const projectCount = await prisma.project.count();
  const reportCount = await prisma.siteReport.count();
  const lineCount = await prisma.siteReportLine.count();
  const attachmentCount = await prisma.siteReportAttachment.count();
  
  console.log(`Projects: ${projectCount}`);
  console.log(`SiteReports: ${reportCount}`);
  console.log(`SiteReportLines: ${lineCount}`);
  console.log(`SiteReportAttachments: ${attachmentCount}`);
  
  const testReports = await prisma.siteReport.findMany({
    where: { OR: [{ title: { contains: 'TEST-REPORT' } }, { reportNo: { contains: 'TEST-REPORT' } }] }
  });
  console.log(`Test Reports found: ${testReports.length}`);
  if (testReports.length > 0) {
    console.log(`- IDs: ${testReports.map(r => r.id).join(', ')}`);
  }

  // Count reports with null or empty reportNo
  const nullReportNo = await prisma.siteReport.count({
    where: { reportNo: '' }
  });
  console.log(`Reports with empty reportNo: ${nullReportNo}`);
  
  console.log("--- Done ---");
}

verify().catch(console.error).finally(() => prisma.$disconnect());
