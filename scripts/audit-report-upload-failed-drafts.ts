import prisma from '../src/lib/prisma';

async function run() {
  console.log('--- BẮT ĐẦU AUDIT DỮ LIỆU RÁC UPLOAD ---');
  try {
    const today = new Date('2026-06-23T00:00:00.000Z');
    
    const suspiciousReports = await prisma.siteReport.findMany({
      where: {
        createdAt: { gte: today },
      },
      include: {
        attachments: true,
        lines: true
      }
    });

    let failedDraftCount = 0;

    for (const report of suspiciousReports) {
      if (report.attachments.length === 0) {
        failedDraftCount++;
        console.log(`- Report ID: ${report.id} | Code: ${report.reportNo} | Status: ${report.status} | Attachments: 0`);
      }
    }

    console.log(`\nTổng số report khả nghi/rác (không có file đính kèm): ${failedDraftCount}`);

  } catch (error) {
    console.error('Lỗi test:', error);
  } finally {
    await prisma.$disconnect();
  }
}

run();
