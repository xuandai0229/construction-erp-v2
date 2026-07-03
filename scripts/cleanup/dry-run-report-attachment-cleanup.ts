import prisma from '../src/lib/prisma';
import fs from 'fs/promises';
import path from 'path';
import { existsSync, statSync } from 'fs';

async function main() {
  console.log("==========================================");
  console.log(" DRY-RUN: REPORT ATTACHMENT CLEANUP AUDIT ");
  console.log("==========================================");

  const attachments = await prisma.siteReportAttachment.findMany({
    include: {
      report: {
        include: {
          project: true,
        }
      }
    }
  });

  const results = [];
  const stats = {
    totalAttachments: attachments.length,
    totalPhotos: attachments.filter(a => a.kind === 'PHOTO').length,
    totalFiles: attachments.filter(a => a.kind === 'FILE').length,
    missingPhysical: 0,
    zeroSizeDB: 0,
    sizeMismatch: 0,
    unsafePath: 0,
    orphanPhysicalFiles: 0, // Hard to compute without scanning all files
    reportsAffected: new Set<string>(),
  };

  const basePath = process.cwd();

  for (const att of attachments) {
    let issue = '';
    let fileExists = false;
    let physicalSize = 0;
    
    // Check path safety
    if (!att.storagePath || att.storagePath.includes('..') || !att.storagePath.startsWith('storage/')) {
      stats.unsafePath++;
      issue += 'Unsafe path; ';
    }

    const fullPath = att.storagePath ? path.join(basePath, att.storagePath) : '';
    
    if (fullPath && existsSync(fullPath)) {
      fileExists = true;
      try {
        const stat = statSync(fullPath);
        physicalSize = stat.size;
        const dbSize = Number(att.sizeBytes);
        
        if (dbSize === 0) {
          stats.zeroSizeDB++;
          issue += 'DB size 0; ';
        } else if (physicalSize !== dbSize) {
          stats.sizeMismatch++;
          issue += `Size mismatch (DB:${dbSize}, Disk:${physicalSize}); `;
        }
      } catch (e) {
        issue += 'Cannot read stat; ';
      }
    } else {
      stats.missingPhysical++;
      issue += 'Missing file; ';
    }

    if (issue) {
      stats.reportsAffected.add(att.report.id);
    }

    // @ts-ignore - Handle possible soft delete field if it exists, otherwise assume active
    const isReportActive = att.report.deletedAt ? 'DELETED' : 'ACTIVE';

    results.push({
      reportNo: att.report.reportNo,
      type: att.report.type,
      status: att.report.status,
      project: att.report.project.name,
      attachmentId: att.id,
      kind: att.kind,
      fileName: att.originalName || att.fileName,
      storagePath: att.storagePath,
      dbSize: Number(att.sizeBytes),
      fileExists: fileExists ? 'Yes' : 'No',
      issue: issue || 'None',
      reportActive: isReportActive
    });
  }

  // Print Table
  console.log("\n--- DETAILED TABLE ---");
  console.table(results.map(r => ({
    'Report No': r.reportNo,
    'Type': r.type,
    'Status': r.status,
    'Project': r.project?.substring(0, 15),
    'Att ID': r.attachmentId.substring(0, 8) + '...',
    'Kind': r.kind,
    'File': r.fileName?.substring(0, 20),
    'Path': r.storagePath,
    'DB Size': r.dbSize,
    'Exists': r.fileExists,
    'Issue': r.issue
  })));

  // Print Summary
  console.log("\n--- SUMMARY ---");
  console.log(`Total attachments: ${stats.totalAttachments}`);
  console.log(`- Photos: ${stats.totalPhotos}`);
  console.log(`- Files: ${stats.totalFiles}`);
  console.log(`Missing physical files: ${stats.missingPhysical}`);
  console.log(`Zero size in DB: ${stats.zeroSizeDB}`);
  console.log(`Size mismatch: ${stats.sizeMismatch}`);
  console.log(`Unsafe paths: ${stats.unsafePath}`);
  console.log(`Reports affected by issues: ${stats.reportsAffected.size}`);
  console.log(`\nAffected Report IDs: ${Array.from(stats.reportsAffected).join(', ')}`);
  
  console.log("\n[DRY RUN COMPLETE] No data or files were deleted or modified.");
}

main().catch(e => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
