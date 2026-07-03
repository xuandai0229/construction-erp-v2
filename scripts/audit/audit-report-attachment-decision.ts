import prisma from '../src/lib/prisma';
import fs from 'fs/promises';
import path from 'path';
import { existsSync, statSync } from 'fs';

async function main() {
  console.log("==========================================");
  console.log(" REPORT ATTACHMENT DECISION AUDIT ");
  console.log("==========================================");

  const attachments = await prisma.siteReportAttachment.findMany({
    include: {
      report: {
        include: {
          project: true,
          createdBy: true,
        }
      }
    }
  });

  const results = [];
  const stats = {
    total: attachments.length,
    groupA: 0,
    groupB: 0,
    groupC: 0,
    groupD: 0,
  };

  const basePath = process.cwd();

  for (const att of attachments) {
    let fileExists = false;
    let actualSize = 0;
    
    // Check path
    let isPathSafe = true;
    if (!att.storagePath || att.storagePath.includes('..') || path.isAbsolute(att.storagePath)) {
      isPathSafe = false;
    }

    // Backend typically resolves missing 'storage/' prefix in the API:
    // `const physicalPath = path.join(process.cwd(), 'storage', ...)` or just `process.cwd(), a.storagePath`
    // Let's check both possibilities.
    let fullPath = '';
    if (att.storagePath) {
       fullPath = path.join(basePath, att.storagePath);
       if (!existsSync(fullPath) && !att.storagePath.startsWith('storage')) {
         fullPath = path.join(basePath, 'storage', att.storagePath);
       }
    }
    
    if (fullPath && existsSync(fullPath)) {
      fileExists = true;
      try {
        const stat = statSync(fullPath);
        actualSize = stat.size;
      } catch (e) {
        // ignore
      }
    }

    const isReportActive = att.report.deletedAt == null;
    const isApproved = att.report.status === 'APPROVED';
    const isSubmitted = att.report.status === 'SUBMITTED';
    const isDraft = att.report.status === 'DRAFT';
    
    const isTh1234 = att.report.project.code === 'TH-1234';
    const reportNoShort = att.report.reportNo.length < 30 && !att.report.reportNo.includes('-'); // Rough check
    const isTestFileName = /test|fake|sample|anh_hien_truong|tai_lieu_dinh_kem/i.test(att.fileName) || /test/i.test(att.originalName || '');
    
    let classification = '';
    let action = '';
    let reason = '';

    if (!isPathSafe && !att.storagePath.startsWith('storage') && att.storagePath.includes('\\')) {
       // It's a windows path from old seed. We will still flag it in Group D below
       isPathSafe = true; 
    }

    if (!fileExists) {
       if (isTh1234 && isApproved && isTestFileName) {
         classification = 'Group B — Old seeded missing files';
         action = 'keep_fallback_or_reupload';
         reason = 'Seed TH-1234, APPROVED but missing file';
         stats.groupB++;
       } else if (isDraft || (isTestFileName && !isApproved)) {
         classification = 'Group A — Safe test/seed garbage candidate';
         action = 'candidate_cleanup';
         reason = 'Draft/Submitted test report with missing file';
         stats.groupA++;
       } else {
         classification = 'Group C — Potential real data risk';
         action = 'do_not_delete';
         reason = 'Missing file but looks like real data';
         stats.groupC++;
       }
    } else {
    if (!isPathSafe) {
       classification = 'Group D — Storage/path issue';
       action = 'path_resolution_check_required';
       reason = 'File exists but path looks unsafe or lacks storage/ prefix';
       stats.groupD++;
    } else if (!att.storagePath.startsWith('storage')) {
       classification = 'Group D — Storage/path issue';
       action = 'path_resolution_check_required';
       reason = 'Missing storage/ prefix breaking UI';
       stats.groupD++;
    } else {
       classification = 'Valid';
       action = 'none';
       reason = 'File exists and valid';
    }
    }

    results.push({
      Report: {
        reportId: att.report.id,
        reportNo: att.report.reportNo,
        type: att.report.type,
        status: att.report.status,
        projectName: att.report.project.name,
        creatorName: att.report.createdBy?.name,
        date: att.report.type === 'WEEKLY' ? `${att.report.weekStartDate} to ${att.report.weekEndDate}` : att.report.reportDate
      },
      Attachment: {
        attachmentId: att.id,
        kind: att.kind,
        fileName: att.fileName,
        originalName: att.originalName,
        mimeType: att.mimeType,
        fileSize: att.sizeBytes,
        storagePath: att.storagePath
      },
      Disk: {
        resolvedPath: fullPath,
        fileExists,
        actualSize,
        sizeMatch: actualSize === att.sizeBytes
      },
      Safety: {
        pathSafe: isPathSafe,
        isActiveReport: isReportActive,
        isApprovedReport: isApproved,
        isSubmittedReport: isSubmitted
      },
      Classification: {
        group: classification,
        recommendedAction: action,
        reason
      }
    });
  }

  // Write JSON
  const outputJsonPath = path.join(process.cwd(), 'docs/qa/attachment-decision-audit.json');
  await fs.writeFile(outputJsonPath, JSON.stringify(results, null, 2));

  // Print Summary
  console.log("\n--- AUDIT CLASSIFICATION SUMMARY ---");
  console.log(`Total attachments: ${stats.total}`);
  console.log(`Group A (Safe test/seed garbage): ${stats.groupA}`);
  console.log(`Group B (Old seeded missing files): ${stats.groupB}`);
  console.log(`Group C (Potential real data risk): ${stats.groupC}`);
  console.log(`Group D (Path issue): ${stats.groupD}`);
  
  console.log(`\nDetailed JSON saved to: ${outputJsonPath}`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
