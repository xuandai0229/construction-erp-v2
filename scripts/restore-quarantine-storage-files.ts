import 'dotenv/config';
import fs from 'fs';
import path from 'path';

async function main() {
  console.log('Starting RESTORE QUARANTINE SCRIPT (PHASE 3.1)');
  
  const isDryRun = process.env.DRY_RUN !== 'false';
  const confirmRestore = process.env.CONFIRM_RESTORE === 'true';
  const iUnderstand = process.env.I_UNDERSTAND_FILE_RESTORE === 'true';
  const overwriteExisting = process.env.OVERWRITE_EXISTING === 'true';

  if (!isDryRun && (!confirmRestore || !iUnderstand)) {
    console.error('Aborting. Live restore requires CONFIRM_RESTORE=true and I_UNDERSTAND_FILE_RESTORE=true.');
    process.exit(1);
  }

  const manifestPath = path.join(process.cwd(), 'docs/qa/quarantine-restore-manifest-2026-07-03.json');
  if (!fs.existsSync(manifestPath)) {
    if (isDryRun) {
      console.log('No restore manifest found. Nothing to restore in dry-run.');
      process.exit(0);
    } else {
      console.error('Restore manifest not found:', manifestPath);
      process.exit(1);
    }
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  const files = manifest.quarantinedFiles || [];

  console.log(`Found ${files.length} files to restore.`);
  if (files.length === 0) {
    console.log('Nothing to restore.');
    process.exit(0);
  }

  for (const file of files) {
    const destPath = file.original;
    const srcPath = file.quarantined;

    if (!fs.existsSync(srcPath)) {
      console.log(`[WARNING] Quarantined file not found: ${srcPath}`);
      continue;
    }

    if (fs.existsSync(destPath) && !overwriteExisting) {
      console.log(`[SKIPPED] Destination already exists: ${destPath}. Requires OVERWRITE_EXISTING=true.`);
      continue;
    }

    if (isDryRun) {
      console.log(`[DRY RUN] Would restore: ${srcPath} -> ${destPath}`);
    } else {
      console.log(`[LIVE] Restoring: ${srcPath} -> ${destPath}`);
      fs.mkdirSync(path.dirname(destPath), { recursive: true });
      fs.renameSync(srcPath, destPath);
    }
  }

  console.log('\nRestore script finished successfully.');
}

main().catch(console.error);
