import 'dotenv/config';
import prisma from '../src/lib/prisma';
import fs from 'fs';
import path from 'path';

async function main() {
  console.log('Starting FULL SYSTEM DATA CLEANUP (PHASE 3)');
  
  const isDryRun = process.env.DRY_RUN !== 'false';
  const confirmDelete = process.env.CONFIRM_DELETE === 'true';
  const iUnderstand = process.env.I_UNDERSTAND_HARD_DELETE === 'true';
  
  if (isDryRun) {
    console.log('--- DRY RUN MODE: No data will be deleted ---');
  } else {
    console.warn('--- DANGER: LIVE DELETION MODE ---');
    if (!confirmDelete || !iUnderstand) {
      console.error('Aborting. DRY_RUN=false requires CONFIRM_DELETE=true and I_UNDERSTAND_HARD_DELETE=true.');
      process.exit(1);
    }
    if (!process.env.DB_BACKUP_PATH_CONFIRMED) {
      console.error('Aborting. Live delete requires DB_BACKUP_PATH_CONFIRMED to ensure backup is taken.');
      process.exit(1);
    }
  }

  const manifestPath = process.env.APPROVED_MANIFEST_PATH || path.join(process.cwd(), 'docs/qa/data-cleanup-approval-manifest-2026-07-03.json');
  if (!fs.existsSync(manifestPath)) {
    console.error('Approval Manifest not found:', manifestPath);
    if (!isDryRun) process.exit(1);
    else return;
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  
  if (manifest.requiresUserEdit) {
    console.log('Aborting. Manifest has requiresUserEdit=true.');
    if (!isDryRun) process.exit(1);
  }

  const keepProjectIds = manifest.keepProtections?.projectIds || [];
  
  const deleteCandidates = manifest.dbDeleteApprovals?.projects || [];
  if (deleteCandidates.length === 0) {
    console.log('0 approved DB delete (projects).');
  } else {
    console.log(`Found ${deleteCandidates.length} projects approved for deletion.`);
  }

  for (const candidate of deleteCandidates) {
    const projectId = candidate.id;
    
    if (keepProjectIds.includes(projectId)) {
      console.error(`CRITICAL ERROR: Project ${projectId} is in KEEP whitelist but was found in delete candidates! Aborting.`);
      process.exit(1);
    }

    if (candidate.blockers && candidate.blockers.length > 0 && !candidate.forceManualReviewApproved) {
      console.error(`ERROR: Project ${projectId} has blockers but forceManualReviewApproved is not true. Aborting.`);
      process.exit(1);
    }

    if (candidate.blockers && candidate.blockers.some((b: string) => b.includes('siteReports')) && !candidate.secondaryApproval) {
      console.error(`ERROR: Project ${projectId} has site reports. Requires secondaryApproval=true. Aborting.`);
      process.exit(1);
    }

    if (!isDryRun) {
      if (!candidate.approvedForDelete || !candidate.confirmedByUser || !candidate.approvedAt) {
        console.error(`ERROR: Project ${projectId} lacks explicit approval flags. Aborting.`);
        process.exit(1);
      }
    }

    if (isDryRun) {
      console.log(`\n[DRY RUN] Would hard delete PROJECT: ${projectId}`);
    } else {
      console.log(`[LIVE] Deleting project: ${projectId}`);
      // await prisma.project.delete({ where: { id: projectId } });
    }
  }

  console.log('\nCleanup script finished successfully.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
