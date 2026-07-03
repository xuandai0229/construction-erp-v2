/**
 * Phase 3 Verification Script: Verify Report Attachments in DB and Disk
 * Run with: npx tsx scripts/verify-report-attachments.ts
 * NOTE: Requires database to be accessible (run within same context as dev server)
 */
import prisma from "../src/lib/prisma";
import { existsSync, statSync } from "fs";
import path from "path";

async function main() {
  console.log("=== Phase 3: Report Attachment Verification ===\n");

  // 1. Find all reports with attachments
  const reportsWithAttachments = await prisma.siteReport.findMany({
    where: { deletedAt: null },
    include: {
      attachments: true,
      _count: { select: { attachments: true } }
    },
    orderBy: { createdAt: 'desc' }
  });

  console.log(`Total reports: ${reportsWithAttachments.length}`);
  const reportsWithFiles = reportsWithAttachments.filter(r => r._count.attachments > 0);
  console.log(`Reports with attachments: ${reportsWithFiles.length}\n`);

  let totalPhotos = 0;
  let totalFiles = 0;
  let missingOnDisk = 0;
  let pathTraversalFound = 0;
  let zeroSizeFound = 0;
  let invalidMimeFound = 0;
  let absolutePathFound = 0;

  for (const report of reportsWithFiles) {
    console.log(`--- Report: ${report.reportNo} (${report.id}) ---`);
    const photos = report.attachments.filter(a => a.kind === 'PHOTO');
    const files = report.attachments.filter(a => a.kind === 'FILE');
    totalPhotos += photos.length;
    totalFiles += files.length;
    console.log(`  Photos: ${photos.length}, Files: ${files.length}`);

    for (const att of report.attachments) {
      const checks: string[] = [];

      // Check path traversal
      if (att.storagePath.includes('..')) {
        checks.push("❌ PATH TRAVERSAL DETECTED");
        pathTraversalFound++;
      }

      // Check absolute path
      if (path.isAbsolute(att.storagePath)) {
        // Try to resolve relative path from absolute
        const cwd = process.cwd();
        if (att.storagePath.startsWith(cwd)) {
          checks.push(`⚠️ ABSOLUTE PATH (legacy): ${att.storagePath}`);
        } else {
          checks.push(`❌ FOREIGN ABSOLUTE PATH: ${att.storagePath}`);
        }
        absolutePathFound++;
      }

      // Check file exists on disk
      const resolvedPath = path.isAbsolute(att.storagePath)
        ? att.storagePath
        : path.join(process.cwd(), att.storagePath);

      if (existsSync(resolvedPath)) {
        const stat = statSync(resolvedPath);
        if (stat.size === 0) {
          checks.push("❌ ZERO SIZE FILE ON DISK");
          zeroSizeFound++;
        } else {
          checks.push(`✅ File exists (${(stat.size / 1024).toFixed(1)} KB)`);
        }
      } else {
        checks.push(`❌ MISSING ON DISK: ${resolvedPath}`);
        missingOnDisk++;
      }

      // Check sizeBytes
      if (att.sizeBytes <= 0) {
        checks.push("❌ sizeBytes <= 0 in DB");
        zeroSizeFound++;
      }

      // Check mimeType
      const validMimes = [
        'image/jpeg', 'image/png', 'image/webp',
        'application/pdf', 'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/zip', 'application/x-rar-compressed',
        'application/octet-stream'
      ];
      if (!validMimes.includes(att.mimeType)) {
        checks.push(`⚠️ Unusual mimeType: ${att.mimeType}`);
        invalidMimeFound++;
      }

      console.log(`  [${att.kind}] ${att.originalName || att.fileName}`);
      checks.forEach(c => console.log(`    ${c}`));
    }
  }

  // 2. Check for orphan attachments (report deleted but attachments remain)
  const orphanAttachments = await prisma.siteReportAttachment.findMany({
    where: {
      report: { deletedAt: { not: null } }
    }
  });

  // 3. Check for duplicate reportNo
  const reportNos = reportsWithAttachments.map(r => r.reportNo);
  const duplicateNos = reportNos.filter((item, index) => reportNos.indexOf(item) !== index);

  // 4. Check for null reportNo
  const nullReportNos = reportsWithAttachments.filter(r => !r.reportNo);

  console.log("\n=== SUMMARY ===");
  console.log(`Total PHOTO attachments: ${totalPhotos}`);
  console.log(`Total FILE attachments: ${totalFiles}`);
  console.log(`Missing on disk: ${missingOnDisk}`);
  console.log(`Path traversal detected: ${pathTraversalFound}`);
  console.log(`Absolute paths (legacy): ${absolutePathFound}`);
  console.log(`Zero-size entries: ${zeroSizeFound}`);
  console.log(`Invalid MIME types: ${invalidMimeFound}`);
  console.log(`Orphan attachments (soft-deleted report): ${orphanAttachments.length}`);
  console.log(`Duplicate reportNo: ${duplicateNos.length > 0 ? duplicateNos.join(', ') : 'None'}`);
  console.log(`Null reportNo: ${nullReportNos.length}`);

  const hasCriticalIssues = missingOnDisk > 0 || pathTraversalFound > 0 || zeroSizeFound > 0;
  const hasWarnings = absolutePathFound > 0 || invalidMimeFound > 0 || orphanAttachments.length > 0;

  console.log(`\nVerdict: ${hasCriticalIssues ? '❌ FAIL' : hasWarnings ? '⚠️ PASS WITH WARNINGS' : '✅ PASS'}`);

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
