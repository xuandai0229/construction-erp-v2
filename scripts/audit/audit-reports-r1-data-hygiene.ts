import prisma from "../src/lib/prisma";

async function run() {
  console.log("=== R1.1: REPORTS DATA HYGIENE AUDIT ===");

  const total = await prisma.siteReport.count({ where: { deletedAt: null } });
  const daily = await prisma.siteReport.count({ where: { type: 'DAILY', deletedAt: null } });
  const weekly = await prisma.siteReport.count({ where: { type: 'WEEKLY', deletedAt: null } });

  console.log(`Total active reports: ${total}`);
  console.log(`DAILY: ${daily}`);
  console.log(`WEEKLY: ${weekly}`);

  const allReports = await prisma.siteReport.findMany({
    where: { deletedAt: null },
    include: {
      lines: true,
      attachments: true
    },
    orderBy: { reportDate: 'desc' }
  });

  console.log("\nSuspected Test Reports & Empty Reports:");
  console.log("id | reportNo | title | type | status | reportDate | reporterName | lineCount | attachmentCount | suspectedTest");
  
  for (const r of allReports) {
    const isTestNo = !r.reportNo.startsWith("BCN-") && !r.reportNo.startsWith("BCT-");
    const isDateMatch = r.reportDate.toISOString().startsWith("2026-06-23");
    const hasEmptyLines = r.lines.length === 0;
    const has0QtyLines = r.lines.length > 0 && r.lines.every(l => Number(l.quantityToday) === 0 && !l.workName);
    const noContentText = r.summary === "No content" || (r.lines.length === 1 && r.lines[0].workContent === "No content");
    
    // Test if it's suspected test
    const suspected = isTestNo || isDateMatch || hasEmptyLines || has0QtyLines || noContentText;
    
    if (suspected) {
      console.log(`${r.id.split('-')[0]} | ${r.reportNo} | ${r.title || 'N/A'} | ${r.type} | ${r.status} | ${r.reportDate.toISOString().split('T')[0]} | ${r.reporterName} | ${r.lines.length} | ${r.attachments.length} | YES`);
    }
  }
}

run().catch(console.error).finally(() => prisma.$disconnect());
