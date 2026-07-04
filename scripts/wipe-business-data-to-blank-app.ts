import 'dotenv/config';
import prisma from '../src/lib/prisma';
import fs from 'fs';
import path from 'path';

function normalizePath(p: string): string {
  if (!p) return '';
  return path.resolve(p).toLowerCase().replace(/\\/g, '/');
}

async function main() {
  console.log('Starting BUSINESS DATA WIPE...');

  const isDryRun = process.env.DRY_RUN !== 'false';
  
  const manifestPath = process.env.APPROVED_WIPE_MANIFEST || path.join(process.cwd(), 'docs/qa/business-data-wipe-approval-manifest-2026-07-03.json');
  if (!fs.existsSync(manifestPath)) {
    console.error(`Approval manifest not found at ${manifestPath}`);
    process.exit(1);
  }

  const approval = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  
  if (!isDryRun) {
    const confirmWipe = process.env.CONFIRM_WIPE_BUSINESS_DATA === 'true';
    const iUnderstand = process.env.I_UNDERSTAND_THIS_WILL_DELETE_PROJECT_DATA === 'true';
    const envBackupConfirmed = process.env.BACKUP_PATH_CONFIRMED;

    if (!confirmWipe || !iUnderstand || !envBackupConfirmed) {
      console.error('Aborting. Missing required environment variables for LIVE WIPE.');
      process.exit(1);
    }

    if (!approval.backupPathConfirmed) {
      console.error('Aborting. Approval manifest missing backupPathConfirmed.');
      process.exit(1);
    }

    if (normalizePath(envBackupConfirmed) !== normalizePath(approval.backupPathConfirmed)) {
      console.error(`Aborting. Env BACKUP_PATH_CONFIRMED (${envBackupConfirmed}) does not match approval backupPathConfirmed (${approval.backupPathConfirmed}).`);
      process.exit(1);
    }

    if (!fs.existsSync(envBackupConfirmed)) {
      console.error(`Aborting. Backup path does not exist: ${envBackupConfirmed}`);
      process.exit(1);
    }

    const metadataPath = path.join(envBackupConfirmed, 'metadata.json');
    if (!fs.existsSync(metadataPath)) {
      console.error(`Aborting. Backup metadata.json not found in ${envBackupConfirmed}`);
      process.exit(1);
    }
    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
    if (metadata.exportStatus !== 'SUCCESS') {
      console.error('Aborting. Backup exportStatus is not SUCCESS.');
      process.exit(1);
    }

    const requiredFiles = ['project.json', 'user.json', 'systemSetting.json', 'siteReport.json', 'document.json'];
    for (const f of requiredFiles) {
      if (!fs.existsSync(path.join(envBackupConfirmed, f))) {
        console.error(`Aborting. Required backup file missing: ${f}`);
        process.exit(1);
      }
    }

    if (approval.requiresUserEdit || !approval.liveRunAllowed) {
      console.error('Aborting. Approval manifest requires user edit or liveRunAllowed is false.');
      process.exit(1);
    }

    if (!approval.protectedUsers || approval.protectedUsers.length === 0) {
      console.error('Aborting. No protected users specified. Must keep at least 1 Admin.');
      process.exit(1);
    }

    const admins = await prisma.user.findMany({
      where: { id: { in: approval.protectedUsers }, role: 'ADMIN' }
    });

    if (admins.length !== approval.protectedUsers.length) {
      console.error('Aborting. One or more protected users are not found or not ADMIN.');
      process.exit(1);
    }
  } else {
    console.log('--- DRY RUN MODE: No data will be deleted ---');
    if (!approval.protectedUsers || approval.protectedUsers.length === 0) {
      console.warn('BLOCKER: No protected users specified. Live wipe will fail.');
    }
  }

  const DB_URL = process.env.DATABASE_URL || '';
  const looksProd =
    DB_URL.includes('production') ||
    DB_URL.includes('prod') ||
    DB_URL.includes('aws') ||
    DB_URL.includes('supabase') ||
    DB_URL.includes('render') ||
    DB_URL.includes('railway');

  if (looksProd && process.env.I_KNOW_WHAT_I_AM_DOING_IN_PROD !== 'true') {
    console.error('Aborting. Database URL looks like production. Provide override if intentional.');
    process.exit(1);
  }

  const deleteOrder = [
    'siteReportAttachment', 'siteReportPhoto', 'siteReportLine', 'siteReport',
    'fieldProgressEntry', 'fieldProgressItem', 'fieldProgressTemplate',
    'fieldMaterialRequestItem', 'fieldMaterialRequest',
    'materialRequestItem', 'materialRequest', 'materialMovement', 'projectMaterialStock',
    'paymentRecord', 'paymentPlan', 'paymentRequest', 'approvalRequest', 'contract',
    'document', 'documentFolder', 'wBSItem', 'notification', 'chatMessage', 
    'projectMember', 'project'
  ];

  if (approval.wipeOptions?.auditLogs === true) deleteOrder.push('auditLog');
  if (approval.wipeOptions?.suppliers === true) deleteOrder.push('supplier');
  if (approval.wipeOptions?.materialCatalog === true) deleteOrder.push('materialItem');

  const resultManifest: any = {
    runDate: new Date().toISOString(),
    isDryRun,
    models: {},
    verificationStatus: 'PENDING'
  };

  for (const model of deleteOrder) {
    const delegate = (prisma as any)[model];
    if (delegate) {
      resultManifest.models[model] = { before: await delegate.count(), after: 0, deletedCount: 0 };
    }
  }

  if (approval.wipeOptions?.demoUsers === true) {
     const userCountBefore = await prisma.user.count({ where: { id: { notIn: approval.protectedUsers || [] } } });
     resultManifest.models['user'] = { before: userCountBefore, after: 0, deletedCount: 0 };
  }

  if (isDryRun) {
    for (const model of Object.keys(resultManifest.models)) {
      resultManifest.models[model].deletedCount = resultManifest.models[model].before;
      console.log(`[DRY RUN] Would delete ${resultManifest.models[model].before} records from ${model}`);
    }
    
    fs.writeFileSync(
      path.join(process.cwd(), 'docs/qa/business-data-wipe-dry-run-result-2026-07-03.json'),
      JSON.stringify(resultManifest, null, 2)
    );
  } else {
    console.log(`[LIVE] Beginning transaction to wipe data...`);
    await prisma.$transaction(async (tx) => {
      for (const model of deleteOrder) {
        const delegate = (tx as any)[model];
        if (delegate) {
          await delegate.deleteMany({});
        }
      }

      if (approval.wipeOptions?.demoUsers === true) {
        await tx.user.deleteMany({
          where: { id: { notIn: approval.protectedUsers } }
        });
      }
    });

    let verifyFailed = false;

    for (const model of deleteOrder) {
      const delegate = (prisma as any)[model];
      if (delegate) {
        const afterCount = await delegate.count();
        resultManifest.models[model].after = afterCount;
        resultManifest.models[model].deletedCount = resultManifest.models[model].before - afterCount;
        console.log(`[LIVE] Wiped ${resultManifest.models[model].deletedCount} records from ${model}`);
        
        if (afterCount > 0) {
          console.error(`❌ VERIFY FAILED: ${model} still has ${afterCount} records!`);
          verifyFailed = true;
        }
      }
    }
    
    if (approval.wipeOptions?.demoUsers === true) {
       const userAfter = await prisma.user.count({ where: { id: { notIn: approval.protectedUsers || [] } } });
       resultManifest.models['user'].after = userAfter;
       resultManifest.models['user'].deletedCount = resultManifest.models['user'].before - userAfter;
       console.log(`[LIVE] Wiped ${resultManifest.models['user'].deletedCount} demo users`);
       
       if (userAfter > 0) {
          console.error(`❌ VERIFY FAILED: ${userAfter} demo users still remain!`);
          verifyFailed = true;
       }
    }

    const settingsCount = await prisma.systemSetting.count();
    if (settingsCount === 0) {
      console.error(`❌ VERIFY FAILED: SystemSetting was deleted!`);
      verifyFailed = true;
    }

    const adminsCount = await prisma.user.count({ where: { role: 'ADMIN' } });
    if (adminsCount === 0) {
      console.error(`❌ VERIFY FAILED: No ADMIN users remain!`);
      verifyFailed = true;
    }

    resultManifest.verificationStatus = verifyFailed ? 'FAIL' : 'PASS';

    fs.writeFileSync(
      path.join(process.cwd(), 'docs/qa/business-data-wipe-execution-result-2026-07-03.json'),
      JSON.stringify(resultManifest, null, 2)
    );
    console.log(`\n[LIVE] Wipe transaction committed. Verify: ${resultManifest.verificationStatus}`);
    
    if (verifyFailed) {
      process.exit(1);
    }
  }
}

main().catch(e => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });
