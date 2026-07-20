const fs = require('fs');
let s = fs.readFileSync('prisma/schema.prisma', 'utf8');

const userRelations = `
  supervisionWeeklyPackagesCreated  SupervisionWeeklyPackage[] @relation("SupervisionWeeklyPackage_createdByIdToUser")
  supervisionWeeklyPackagesReviewed SupervisionWeeklyPackage[] @relation("SupervisionWeeklyPackage_reviewedByIdToUser")
  supervisionFindingsCreated        SupervisionFinding[]
  supervisionScopes                 SupervisionScope?
  supervisionVisitsCreated          SupervisionVisit[]
  supervisionWorkflowHistories      SupervisionWorkflowHistory[]
  supervisionInspectionSchedules    SupervisionInspectionSchedule[]
`;

const projectRelations = `
  supervisionFindings               SupervisionFinding[]
  supervisionPlanItems              SupervisionPlanItem[]
  supervisionProgressAssessments    SupervisionProgressAssessment[]
  supervisionQuantityVerifications  SupervisionQuantityVerification[]
  supervisionRecommendations        SupervisionRecommendation[]
  supervisionScopeProjects          SupervisionScopeProject[]
  supervisionTransitionChecks       SupervisionTransitionCheck[]
  supervisionVisits                 SupervisionVisit[]
  supervisionInspectionSchedules    SupervisionInspectionSchedule[]
`;

s = s.replace(/  @@index\(\[email\]\)/, userRelations + '\n  @@index([email])');
s = s.replace(/  @@index\(\[code\]\)/, projectRelations + '\n  @@index([code])');

fs.writeFileSync('prisma/schema.prisma', s);
