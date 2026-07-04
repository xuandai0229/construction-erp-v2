import 'dotenv/config';
import fs from 'fs';
import path from 'path';

async function main() {
  console.log('Starting BUSINESS FILES QUARANTINE...');
  
  const isDryRun = process.env.DRY_RUN !== 'false';
  
  const manifestPath = process.env.APPROVED_WIPE_MANIFEST || path.join(process.cwd(), 'docs/qa/business-data-wipe-approval-manifest-2026-07-03.json');
  if (!fs.existsSync(manifestPath)) {
    console.error('Approval manifest not found:', manifestPath);
    process.exit(1);
  }
  
  const approval = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

  if (!isDryRun) {
    const confirm = process.env.CONFIRM_QUARANTINE_BUSINESS_FILES === 'true';
    const iUnderstand = process.env.I_UNDERSTAND_FILE_MOVE === 'true';
    const backupConfirmed = process.env.BACKUP_PATH_CONFIRMED;

    if (!confirm || !iUnderstand || !backupConfirmed) {
      console.error('Aborting. Missing required env vars for live file quarantine.');
      process.exit(1);
    }

    if (approval.requiresUserEdit || !approval.liveRunAllowed) {
      console.error('Aborting. Approval manifest requires user edit or liveRunAllowed is false.');
      process.exit(1);
    }

    if (!fs.existsSync(backupConfirmed)) {
      console.error('Aborting. Backup path does not exist:', backupConfirmed);
      process.exit(1);
    }
  }

  const auditManifestPath = path.join(process.cwd(), 'docs/qa/business-data-wipe-audit-manifest-2026-07-03.json');
  if (!fs.existsSync(auditManifestPath)) {
    console.error('Audit manifest not found:', auditManifestPath);
    process.exit(1);
  }
  const audit = JSON.parse(fs.readFileSync(auditManifestPath, 'utf-8'));
  const files = audit.filesToQuarantine || [];

  const quarantineBase = path.join(process.cwd(), '.cleanup-quarantine', 'business-data-wipe-2026-07-03');
  const restoreManifestData: any = { runDate: new Date().toISOString(), quarantinedFiles: [] };

  const approveAll = approval.approveAllBusinessFilesForQuarantine === true && !!approval.approvedAt && !!approval.approvedByUser;

  for (const f of files) {
    const sourcePath = f.resolvedPhysicalPath;
    if (!sourcePath) {
      console.log(`[SKIPPED] File has no resolved physical path: ${f.dbPath}`);
      continue;
    }

    const relPath = path.relative(process.cwd(), sourcePath);
    const destPath = path.join(quarantineBase, relPath);

    const protectedPatterns = ['.git', 'node_modules', 'docs/qa', 'src', 'prisma', 'backups'];
    if (protectedPatterns.some(p => sourcePath.includes(p))) {
      console.log(`[SKIPPED] Protected path: ${sourcePath}`);
      continue;
    }

    if (!fs.existsSync(sourcePath)) {
      if (isDryRun) {
         console.log(`[WARNING] Source file not found, would skip: ${sourcePath}`);
      } else {
         console.log(`[SKIPPED] Missing source file: ${sourcePath}`);
      }
      continue;
    }

    const isFileApproved = approveAll || (f.approvedForQuarantine === true && f.confirmedByUser === true && !!f.approvedAt);

    if (isDryRun) {
      if (isFileApproved) {
        console.log(`[DRY RUN][APPROVED] Would quarantine:`);
      } else {
        console.log(`[DRY RUN][NOT APPROVED] Would quarantine (requires approval):`);
      }
      console.log(`   Source: ${sourcePath}`);
      console.log(`   Dest:   ${destPath}`);
      console.log(`   Size:   ${f.size} bytes`);
      console.log(`   Reason: ${f.reason}`);
    } else {
      if (!isFileApproved) {
        console.log(`[LIVE][SKIPPED] File not approved for quarantine: ${sourcePath}`);
        continue;
      }
      
      console.log(`[LIVE] Quarantining: ${sourcePath}`);
      fs.mkdirSync(path.dirname(destPath), { recursive: true });
      fs.renameSync(sourcePath, destPath);
      restoreManifestData.quarantinedFiles.push({ 
        original: sourcePath, 
        quarantined: destPath,
        size: f.size,
        reason: f.reason
      });
    }
  }

  if (!isDryRun) {
    fs.writeFileSync(
      path.join(process.cwd(), 'docs/qa/business-storage-quarantine-restore-manifest-2026-07-03.json'),
      JSON.stringify(restoreManifestData, null, 2)
    );
  }

  console.log('Quarantine finished.');
}
main().catch(e => { console.error(e); process.exit(1); });
