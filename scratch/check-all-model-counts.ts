import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function checkAllCounts() {
  const { default: prisma } = await import('../src/lib/prisma');

  const models = [
    'user', 'project', 'projectMember', 'auditLog', 'chatMessage',
    'siteReport', 'siteReportLine', 'wBSItem', 'approvalRequest',
    'document', 'documentFolder', 'documentVersion',
    'fieldProgressTemplate', 'fieldProgressItem', 'fieldProgressEntry',
    'fieldMaterialRequest', 'materialProposal', 'materialProposalApproval',
    'systemSetting', 'notification', 'projectLocationNode',
    'materialItem', 'materialLot', 'materialTransaction',
    'weeklySupervisionDossier', 'safetyPlan', 'qualityInspection'
  ];

  console.log('=== PRISMA MODEL RECORD INVENTORY ===');
  for (const m of models) {
    try {
      if ((prisma as any)[m]) {
        const count = await (prisma as any)[m].count();
        console.log(`- ${m}: ${count} records`);
      } else {
        console.log(`- ${m}: MODEL_NOT_FOUND_ON_PRISMA`);
      }
    } catch (e: any) {
      console.log(`- ${m}: ERROR (${e.message})`);
    }
  }

  await prisma.$disconnect();
}

checkAllCounts().catch(console.error);
