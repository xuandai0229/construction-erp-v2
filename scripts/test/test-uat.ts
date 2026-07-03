import prisma from '../src/lib/prisma';

async function check() {
  const reports = await prisma.siteReport.findMany({
    include: { lines: true, _count: { select: { attachments: true, photos: true } } }
  });
  
  const total = reports.length;
  // Look for UAT Phase 2.1
  const uatReport = reports.find(r => r.lines.some(l => l.workContent.includes('UAT Phase 2.1')));
  
  console.log(`Total reports: ${total}`);
  if (uatReport) {
    console.log(`UAT Report Found: ${uatReport.id}`);
    console.log(`- createdById: ${uatReport.createdById}`);
    console.log(`- reporterName: ${uatReport.reporterName}`);
  } else {
    console.log('UAT Report not found!');
  }
}

check().catch(console.error).finally(() => prisma.$disconnect());
