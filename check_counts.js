const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

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
      const count = await prisma[model].count();
      console.log(model + ': ' + count);
    } catch (e) {
      console.log(model + ': error ' + e.message);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
