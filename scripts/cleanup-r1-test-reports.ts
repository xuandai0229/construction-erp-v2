import prisma from "../src/lib/prisma";

const args = process.argv.slice(2);
const isExecute = args.includes("--execute");

async function run() {
  console.log("=== R1.1: CLEANUP TEST REPORTS ===");
  console.log(`Mode: ${isExecute ? "EXECUTE" : "DRY-RUN"}\n`);

  const allReports = await prisma.siteReport.findMany({
    where: { deletedAt: null },
    include: {
      lines: true,
      attachments: true
    }
  });

  const targets = allReports.filter(r => {
    const isTestNo = !r.reportNo.startsWith("BCN-") && !r.reportNo.startsWith("BCT-");
    const isToday = r.reportDate.toISOString().startsWith("2026-06-23");
    const noAttachments = r.attachments.length === 0;
    
    return isTestNo && isToday && noAttachments;
  });

  console.log(`Found ${targets.length} test reports to cleanup.`);
  
  if (targets.length === 0) {
    console.log("Nothing to clean.");
    return;
  }

  for (const t of targets) {
    console.log(`- ID: ${t.id} | No: ${t.reportNo} | Status: ${t.status}`);
  }

  if (isExecute) {
    console.log("\nExecuting cleanup...");
    
    for (const t of targets) {
      // Delete lines
      await prisma.siteReportLine.deleteMany({ where: { siteReportId: t.id } });
      
      // Delete audit logs
      await prisma.auditLog.deleteMany({ where: { entityId: t.id } });
      
      // Delete report
      await prisma.siteReport.delete({ where: { id: t.id } });
      
      console.log(`Deleted ${t.id}`);
    }
    
    console.log("Cleanup completed!");
  } else {
    console.log("\nRun with --execute to actually delete them.");
  }
}

run().catch(console.error).finally(() => prisma.$disconnect());
