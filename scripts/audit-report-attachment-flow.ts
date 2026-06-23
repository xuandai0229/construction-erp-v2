import prisma from '../src/lib/prisma';
import fs from 'fs/promises';
import path from 'path';

const STORAGE_BASE = path.join(process.cwd(), 'storage', 'site-reports');

async function runAudit() {
  console.log('--- BẮT ĐẦU AUDIT ATTACHMENT FLOW ---\n');

  try {
    const reports = await prisma.siteReport.findMany({
      include: {
        attachments: true,
        lines: true
      }
    });

    let emptyReports = 0;
    let missingWorkLinesApproved = 0;
    let missingPhysicalFiles = 0;
    let orphanFiles = 0;

    for (const report of reports) {
      // 1. Check report rỗng (không nội dung công việc đối với DAILY)
      if (report.type === 'DAILY' && report.lines.length === 0) {
        emptyReports++;
        if (report.status === 'APPROVED' || report.status === 'SUBMITTED') {
          missingWorkLinesApproved++;
        }
      }

      // 2. Check DB attachments vs Physical files
      const reportDir = path.join(STORAGE_BASE, report.id);
      let dirExists = false;
      try {
        const stat = await fs.stat(reportDir);
        dirExists = stat.isDirectory();
      } catch (e) {
        // Dir doesn't exist
      }

      let physicalFiles: string[] = [];
      if (dirExists) {
        physicalFiles = await fs.readdir(reportDir);
      }

      const dbFilePaths = new Set(report.attachments.map(a => path.basename(a.storagePath)));
      const physicalFileSet = new Set(physicalFiles);

      for (const a of report.attachments) {
        const basename = path.basename(a.storagePath);
        if (!physicalFileSet.has(basename)) {
          console.warn(`[!] DB Attachment thiếu file vật lý: Report ${report.reportNo} - File ${basename}`);
          missingPhysicalFiles++;
        }
      }

      for (const f of physicalFiles) {
        if (!dbFilePaths.has(f)) {
          console.warn(`[!] File vật lý thiếu DB record (Orphan): Report ${report.reportNo} - File ${f}`);
          orphanFiles++;
        }
      }
    }

    console.log('\n--- KẾT QUẢ DATA AUDIT ---');
    console.log(`Tổng số report: ${reports.length}`);
    console.log(`Số report rỗng (Daily không có dòng công việc): ${emptyReports}`);
    console.log(`Số report Submitted/Approved nhưng rỗng: ${missingWorkLinesApproved}`);
    console.log(`Số attachment có DB nhưng thiếu file vật lý: ${missingPhysicalFiles}`);
    console.log(`Số file vật lý mồ côi (không có trong DB): ${orphanFiles}`);
    
    console.log('\nAudit hoàn tất.');
  } catch (error) {
    console.error('Lỗi khi chạy audit:', error);
  } finally {
    await prisma.$disconnect();
  }
}

runAudit();
