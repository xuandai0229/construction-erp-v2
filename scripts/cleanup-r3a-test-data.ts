import prisma from "../src/lib/prisma";
import * as fs from "fs/promises";
import * as path from "path";

const isDryRun = process.argv.includes("--dry-run");
const isExecute = process.argv.includes("--execute");

async function verifyDataset() {
  const project = await prisma.project.findFirst({
    where: { code: "TH-1234", deletedAt: null }
  });
  if (!project) throw new Error("Dataset verification failed: Project TH-1234 not found");

  const dailyCount = await prisma.siteReport.count({
    where: { projectId: project.id, type: "DAILY", reportNo: { startsWith: "BCN-" }, deletedAt: null }
  });
  if (dailyCount !== 14) throw new Error(`Dataset verification failed: Expected 14 daily reports, found ${dailyCount}`);

  const weeklyCount = await prisma.siteReport.count({
    where: { projectId: project.id, type: "WEEKLY", reportNo: { startsWith: "BCT-" }, deletedAt: null }
  });
  if (weeklyCount !== 2) throw new Error(`Dataset verification failed: Expected 2 weekly reports, found ${weeklyCount}`);

  const docCount = await prisma.document.count({
    where: { projectId: project.id, deletedAt: null }
  });
  if (docCount !== 16) throw new Error(`Dataset verification failed: Expected 16 documents, found ${docCount}`);

  const entriesCount = await prisma.fieldProgressEntry.count({
    where: { projectId: project.id, deletedAt: null }
  });
  if (entriesCount !== 39) throw new Error(`Dataset verification failed: Expected 39 field progress entries, found ${entriesCount}`);

  const r3aReports = await prisma.siteReport.count({
    where: {
      OR: [
        { reportNo: { contains: "R3A-" } },
        { summary: { contains: "R3A-" } },
        { title: { contains: "R3A-" } }
      ]
    }
  });

  const r3aLogs = await prisma.auditLog.count({
    where: {
      afterData: { contains: "R3A" }
    }
  });

  console.log("Dataset integrity verified successfully!");
  console.log(`Remaining R3A Reports: ${r3aReports}`);
  console.log(`Remaining R3A AuditLogs (by content): ${r3aLogs}`);
}

async function main() {
  if (!isDryRun && !isExecute) {
    console.error("Please specify --dry-run or --execute");
    process.exit(1);
  }

  console.log(`=== R3A TEST DATA CLEANUP (${isDryRun ? "DRY-RUN" : "EXECUTE"}) ===`);

  const reportsToDelete = await prisma.siteReport.findMany({
    where: {
      OR: [
        { reportNo: { contains: "R3A-" } },
        { summary: { contains: "R3A-" } },
        { title: { contains: "R3A-" } }
      ]
    },
    include: {
      lines: true,
      attachments: true
    }
  });

  if (reportsToDelete.length === 0) {
    console.log("No R3A test reports found.");
    await verifyDataset();
    return;
  }

  console.log(`\nFound ${reportsToDelete.length} reports to delete:`);
  console.table(
    reportsToDelete.map(r => ({
      id: r.id,
      reportNo: r.reportNo,
      title: r.title,
      type: r.type,
      status: r.status,
      projectId: r.projectId,
      createdAt: r.createdAt
    }))
  );

  let hasUnexpectedData = false;
  let totalAuditLogs = 0;

  for (const r of reportsToDelete) {
    if (r.lines.length > 0 || r.attachments.length > 0) {
      console.error(`ERROR: Report ${r.id} has unexpected lines (${r.lines.length}) or attachments (${r.attachments.length}).`);
      hasUnexpectedData = true;
    }
    const logsCount = await prisma.auditLog.count({
      where: { entityType: "SiteReport", entityId: r.id }
    });
    totalAuditLogs += logsCount;
  }

  if (hasUnexpectedData) {
    console.error("UNEXPECTED RELATED DATA FOUND. Aborting.");
    process.exit(1);
  }

  console.log(`\nWill delete ${reportsToDelete.length} SiteReports and ${totalAuditLogs} AuditLogs.`);

  if (isExecute) {
    console.log("\nExecuting deletion...");
    const reportIds = reportsToDelete.map(r => r.id);

    const deletedLogs = await prisma.auditLog.deleteMany({
      where: { entityType: "SiteReport", entityId: { in: reportIds } }
    });
    console.log(`Deleted ${deletedLogs.count} AuditLogs.`);

    const deletedReports = await prisma.siteReport.deleteMany({
      where: { id: { in: reportIds } }
    });
    console.log(`Deleted ${deletedReports.count} SiteReports.`);
  }

  console.log("\nVerifying dataset...");
  await verifyDataset();
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
