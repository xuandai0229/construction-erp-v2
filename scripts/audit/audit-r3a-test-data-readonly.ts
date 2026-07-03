import prisma from "../src/lib/prisma";
import * as fs from "fs/promises";
import * as path from "path";

async function main() {
  console.log("=== R3A TEST DATA AUDIT (READ-ONLY) ===");

  const r3aReports = await prisma.siteReport.findMany({
    where: {
      OR: [
        { reportNo: { contains: "R3A-" } },
        { summary: { contains: "R3A-" } },
        { title: { contains: "R3A-" } }
      ]
    },
    include: {
      lines: true,
      attachments: true,
    }
  });

  console.log(`\nFound ${r3aReports.length} R3A SiteReports.`);

  let totalLines = 0;
  let totalAttachments = 0;
  let totalAuditLogs = 0;
  let totalFiles = 0;

  for (const r of r3aReports) {
    totalLines += r.lines.length;
    totalAttachments += r.attachments.length;
    
    // Check audit logs
    const logs = await prisma.auditLog.count({
      where: {
        entityType: "SiteReport",
        entityId: r.id
      }
    });
    totalAuditLogs += logs;

    // Check physical files
    const dir = path.join(process.cwd(), "storage", "site-reports", r.id);
    try {
      const files = await fs.readdir(dir);
      totalFiles += files.length;
    } catch (e) {
      // Directory doesn't exist
    }
  }

  // General audit log search
  const generalLogs = await prisma.auditLog.count({
    where: {
      afterData: {
        contains: "R3A"
      }
    }
  });

  console.log(`\nAudit Results:`);
  console.log(`- SiteReports: ${r3aReports.length}`);
  console.log(`- SiteReportLines: ${totalLines}`);
  console.log(`- SiteReportAttachments: ${totalAttachments}`);
  console.log(`- AuditLogs (by reportId): ${totalAuditLogs}`);
  console.log(`- AuditLogs (by R3A keyword in data): ${generalLogs}`);
  console.log(`- Physical Files in storage/site-reports: ${totalFiles}`);
  console.log(`\nThese records remain in DB/storage and should be cleaned up via dry-run later.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
