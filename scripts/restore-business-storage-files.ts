import 'dotenv/config';
import fs from 'fs';
import path from 'path';

async function main() {
  console.log('Starting BUSINESS FILES RESTORE...');
  const isDryRun = process.env.DRY_RUN !== 'false';
  const confirmRestore = process.env.CONFIRM_RESTORE === 'true';

  if (!isDryRun && !confirmRestore) {
    console.error('Live restore requires CONFIRM_RESTORE=true');
    process.exit(1);
  }

  const manifestPath = path.join(process.cwd(), 'docs/qa/business-storage-quarantine-restore-manifest-2026-07-03.json');
  if (!fs.existsSync(manifestPath)) {
    if (isDryRun) {
      console.log('No restore manifest found. Exiting gracefully in dry-run.');
      process.exit(0);
    } else {
      console.error('Restore manifest not found.');
      process.exit(1);
    }
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  const files = manifest.quarantinedFiles || [];

  for (const f of files) {
    if (isDryRun) {
      console.log(`[DRY RUN] Would restore ${f.quarantined} -> ${f.original}`);
    } else {
      if (fs.existsSync(f.quarantined)) {
        console.log(`[LIVE] Restoring ${f.quarantined} -> ${f.original}`);
        fs.mkdirSync(path.dirname(f.original), { recursive: true });
        fs.renameSync(f.quarantined, f.original);
      }
    }
  }
}
main().catch(e => { console.error(e); process.exit(1); });
