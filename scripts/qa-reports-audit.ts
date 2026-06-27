import 'dotenv/config';
import prisma from "../src/lib/prisma";

async function main() {
  console.log("=== KIỂM TRA DỮ LIỆU REPORTS HIỆN CÓ ===\n");

  const totalReports = await prisma.siteReport.count();
  const notDeleted = await prisma.siteReport.count({ where: { deletedAt: null } });
  const softDeleted = await prisma.siteReport.count({ where: { deletedAt: { not: null } } });

  console.log(`- Tổng số report: ${totalReports}`);
  console.log(`- Report chưa deleted: ${notDeleted}`);
  console.log(`- Report đã soft-deleted: ${softDeleted}`);

  const byProject = await prisma.siteReport.groupBy({
    by: ['projectId'],
    _count: true,
  });
  console.log("\n- Tổng số report theo project:");
  byProject.forEach((p: { projectId: string; _count: number }) => {
    console.log(`  + Project ${p.projectId}: ${p._count}`);
  });

  const byStatus = await prisma.siteReport.groupBy({
    by: ['status'],
    _count: true,
  });
  console.log("\n- Tổng số report theo status:");
  byStatus.forEach((s: { status: string; _count: number }) => {
    console.log(`  + ${s.status}: ${s._count}`);
  });

  try {
    const missingProject = await prisma.siteReport.count({ where: { projectId: "" } });
    console.log(`\n- Report thiếu projectId: ${missingProject}`);
    
    // Removed orphan checks because relations are required in Prisma schema

    const now = new Date();
    const future = await prisma.siteReport.count({ where: { reportDate: { gt: now } } });
    console.log(`- Report có reportDate tương lai: ${future}`);

    const veryOld = await prisma.siteReport.count({ where: { reportDate: { lt: new Date('2020-01-01') } } });
    console.log(`- Report có reportDate quá cũ bất thường: ${veryOld}`);

    const emptyContent = await prisma.siteReport.count({ where: { summary: "" } });
    console.log(`- Report có summary rỗng: ${emptyContent}`);

    const totalAtt = await prisma.siteReportAttachment.count();
    console.log(`\n- Tổng số Attachment: ${totalAtt}`);

    const testData = await prisma.siteReport.count({
      where: {
        OR: [
          { reportNo: { startsWith: 'QA_REPORTS_' } },
          { title: { startsWith: 'QA_REPORTS_' } }
        ]
      }
    });
    console.log(`- Dữ liệu rác prefix QA_REPORTS_ còn sót: ${testData}`);
  } catch (err: any) {
    console.error(`\nLỖI TRONG QUÁ TRÌNH TRUY VẤN:`);
    console.error(err);
    if (err.meta) {
      console.error(`Chi tiết Meta:`, err.meta);
    }
  }
  
  console.log("\n=> Hoàn tất kiểm tra dữ liệu.");

}

main().catch(console.error);
