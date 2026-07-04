import 'dotenv/config';
import fs from 'fs';
import path from 'path';

async function main() {
  console.log('Starting QUARANTINE SCRIPT (PHASE 3)');
  
  const isDryRun = process.env.DRY_RUN !== 'false';
  const confirmQuarantine = process.env.CONFIRM_QUARANTINE === 'true';
  const iUnderstand = process.env.I_UNDERSTAND_FILE_MOVE === 'true';

  if (!isDryRun && (!confirmQuarantine || !iUnderstand)) {
    console.error('Aborting. Live quarantine requires CONFIRM_QUARANTINE=true and I_UNDERSTAND_FILE_MOVE=true.');
    process.exit(1);
  }

  const manifestPath = process.env.APPROVED_MANIFEST_PATH || path.join(process.cwd(), 'docs/qa/data-cleanup-approval-manifest-2026-07-03.json');
  if (!fs.existsSync(manifestPath)) {
    console.error('Approval manifest not found:', manifestPath);
    process.exit(1);
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  
  if (manifest.testOnly === true && !isDryRun) {
    console.error('Test manifest cannot be used for live quarantine.');
    process.exit(1);
  }

  if (manifest.liveRunAllowed !== true && !isDryRun) {
    console.error('Manifest is not approved for live run.');
    process.exit(1);
  }

  if (manifest.requiresUserEdit) {
    console.log('Manifest requiresUserEdit=true. Please approve files before continuing.');
    if (!isDryRun) process.exit(1);
  }

  const quarantineBase = path.join(process.cwd(), '.cleanup-quarantine', '2026-07-03', 'storage');
  if (!isDryRun && !fs.existsSync(quarantineBase)) {
    fs.mkdirSync(quarantineBase, { recursive: true });
  }

  const restoreManifestData: any = {
    runDate: new Date().toISOString(),
    restoredFiles: [],
    quarantinedFiles: []
  };

  const files = manifest.fileQuarantineApprovals?.files || [];
  console.log(`Found ${files.length} files approved for quarantine.`);

  for (const file of files) {
    if (!file.approvedForQuarantine || !file.confirmedByUser || !file.approvedAt) {
      console.log(`[SKIPPED] ${file.path} (Lacks explicit approval flags)`);
      continue;
    }

    const isProtected = manifest.keepProtections.protectedPaths.some((p: string) => file.path.includes(p));
    if (isProtected && !file.allowKeepProjectFileQuarantine) {
      console.log(`[SKIPPED] ${file.path} (Protected path. Needs allowKeepProjectFileQuarantine)`);
      continue;
    }

    const sourcePath = file.path;
    const relPath = path.relative(process.cwd(), sourcePath);
    const destPath = path.join(quarantineBase, relPath);

    if (isDryRun) {
      console.log(`[DRY RUN] Would quarantine: ${sourcePath} -> ${destPath}`);
    } else {
      console.log(`[LIVE] Quarantining: ${sourcePath}`);
      if (fs.existsSync(sourcePath)) {
        fs.mkdirSync(path.dirname(destPath), { recursive: true });
        fs.renameSync(sourcePath, destPath);
        restoreManifestData.quarantinedFiles.push({ original: sourcePath, quarantined: destPath });
      } else {
        console.log(`[WARNING] File not found: ${sourcePath}`);
      }
    }
  }

  if (!isDryRun) {
    fs.writeFileSync(
      path.join(process.cwd(), 'docs/qa/quarantine-restore-manifest-2026-07-03.json'),
      JSON.stringify(restoreManifestData, null, 2)
    );
  }

  console.log('\nQuarantine script finished.');
}

main().catch(console.error);
