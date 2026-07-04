import 'dotenv/config';
import prisma from '../src/lib/prisma';

async function main() {
  console.log('Starting Verification of Blank App...');
  
  const expectBlank = process.env.VERIFY_EXPECT_BLANK === 'true';

  if (!expectBlank) {
    console.log('--- VERIFY DRY RUN (Current State Before Wipe) ---');
    console.log('Counts will be displayed, but will NOT cause failure if non-zero.');
  } else {
    console.log('--- VERIFY EXPECT BLANK MODE ---');
    console.log('Will assert counts are exactly 0 for wiped models.');
  }

  const modelsToCheckZero = [
    'project', 'projectMember', 'wBSItem', 'documentFolder', 'document',
    'siteReport', 'siteReportLine', 'siteReportAttachment', 'siteReportPhoto',
    'contract', 'paymentPlan', 'paymentRecord', 'paymentRequest', 'approvalRequest',
    'materialRequest', 'materialRequestItem', 'materialMovement', 'projectMaterialStock',
    'fieldProgressTemplate', 'fieldProgressItem', 'fieldProgressEntry', 'fieldMaterialRequest', 'fieldMaterialRequestItem',
    'notification', 'chatMessage'
  ];

  let anyFailed = false;

  for (const m of modelsToCheckZero) {
    const delegate = (prisma as any)[m];
    if (!delegate) continue;
    
    const count = await delegate.count();
    if (expectBlank) {
      if (count !== 0) {
        console.error(`❌ FAILED: ${m} has ${count} records. Expected 0.`);
        anyFailed = true;
      } else {
        console.log(`✅ ${m}: 0`);
      }
    } else {
      console.log(`[Before Wipe] ${m}: ${count} -> (Expected After Wipe: 0)`);
    }
  }

  const adminUsers = await prisma.user.count({ where: { role: 'ADMIN' } });
  if (expectBlank && adminUsers === 0) {
    console.error(`❌ FAILED: No ADMIN users left!`);
    anyFailed = true;
  } else {
    console.log(`${expectBlank ? '✅' : '[Before Wipe]'} Admin Users left: ${adminUsers}`);
  }

  const settings = await prisma.systemSetting.count();
  if (expectBlank && settings === 0) {
    console.error(`❌ FAILED: SystemSetting was deleted!`);
    anyFailed = true;
  } else {
    console.log(`${expectBlank ? '✅' : '[Before Wipe]'} SystemSettings left: ${settings}`);
  }

  if (expectBlank) {
    console.log(anyFailed ? '\nVerification FAILED. App is not blank.' : '\nVerification SUCCESS. App is effectively blank for business data.');
    if (anyFailed) process.exit(1);
  } else {
    console.log('\nVerification Dry Run finished.');
  }
}
main().catch(console.error).finally(async () => { await prisma.$disconnect(); });
