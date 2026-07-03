import "dotenv/config";
import prisma from "../src/lib/prisma";
import fs from "fs";
import path from "path";

async function main() {
  console.log("--- BẮT ĐẦU KIỂM TRA DATA REPORTS ---");

  const totalReports = await prisma.siteReport.count();
  console.log(`Tổng reports (bao gồm deleted): ${totalReports}`);

  const counts = await prisma.siteReport.groupBy({
    by: ['status'],
    _count: { status: true }
  });
  console.log("Số lượng theo status:");
  counts.forEach(c => console.log(` - ${c.status}: ${c._count.status}`));

  const weeklyCount = await prisma.siteReport.count({ where: { type: 'WEEKLY' }});
  console.log(`Số báo cáo WEEKLY: ${weeklyCount}`);

  const deletedCount = await prisma.siteReport.count({ where: { deletedAt: { not: null } }});
  console.log(`Số báo cáo đã bị xóa (deletedAt != null): ${deletedCount}`);

  const testReports = await prisma.siteReport.count({
    where: {
      OR: [
        { summary: { contains: 'test', mode: 'insensitive' } },
        { title: { contains: 'test', mode: 'insensitive' } },
      ]
    }
  });
  console.log(`Số báo cáo có chữ 'test' (test/rác): ${testReports}`);

  // Report thiếu nội dung: count daily reports with no lines or no content
  const reportsWithoutLines = await prisma.siteReport.count({
    where: {
      type: 'DAILY',
      lines: { none: {} }
    }
  });
  console.log(`Số báo cáo DAILY thiếu dòng công việc: ${reportsWithoutLines}`);

  // Check attachments
  const attachments = await prisma.siteReportAttachment.findMany();
  let missingFiles = 0;
  for (const att of attachments) {
    if (att.storagePath) {
      const fullPath = path.join(process.cwd(), att.storagePath);
      if (!fs.existsSync(fullPath)) {
        missingFiles++;
      }
    }
  }
  console.log(`Số attachment DB bị thiếu file vật lý: ${missingFiles} / ${attachments.length}`);

  // Check AuditLog
  const auditCounts = await prisma.auditLog.groupBy({
    by: ['action'],
    where: { entityType: 'SiteReport' },
    _count: { action: true }
  });
  console.log("Số lượng AuditLog theo action:");
  auditCounts.forEach(c => console.log(` - ${c.action}: ${c._count.action}`));

  console.log("--- HOÀN THÀNH KIỂM TRA ---");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
