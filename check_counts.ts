import prisma from './src/lib/prisma';

async function main() {
  const models = [
    'supervisionInspectionSchedule',
    'supervisionVisit',
    'supervisionFinding',
    'supervisionWeeklyPackage',
    'supervisionTransitionCheck',
    'supervisionQuantityVerification',
    'supervisionProgressAssessment',
    'supervisionAttachment',
    'supervisionWorkflowHistory',
    'supervisionPlanItem',
    'supervisionRecommendation',
    'supervisionScope',
    'supervisionScopeProject'
  ];
  
  for (const model of models) {
    try {
      const count = await (prisma as any)[model].count();
      console.log(model + ': ' + count);
    } catch (e: any) {
      console.log(model + ': error ' + e.message);
    }
  }
}

main().catch(console.error).finally(() => process.exit(0));
