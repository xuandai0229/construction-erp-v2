import { prisma } from "./db_client";
import fs from "fs";
import path from "path";

async function main() {
  console.log("=== CREATING FULL DATABASE BACKUP BEFORE CLEANUP ===");

  const backupDir = path.resolve(__dirname, "../../scripts/backups");
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const backupPath = path.join(backupDir, `pre_cleanup_backup_${Date.now()}.json`);

  const backupData: Record<string, any[]> = {
    User: await prisma.user.findMany(),
    Project: await prisma.project.findMany(),
    ProjectMember: await prisma.projectMember.findMany(),
    WBSItem: await prisma.wBSItem.findMany(),
    DocumentFolder: await prisma.documentFolder.findMany(),
    Document: await prisma.document.findMany(),
    SiteReport: await prisma.siteReport.findMany(),
    SiteReportPhoto: await prisma.siteReportPhoto.findMany(),
    SiteReportAttachment: await prisma.siteReportAttachment.findMany(),
    SiteReportLine: await prisma.siteReportLine.findMany(),
    MaterialItem: await prisma.materialItem.findMany(),
    MaterialProposal: await prisma.materialProposal.findMany(),
    MaterialProposalItem: await prisma.materialProposalItem.findMany(),
    MaterialProposalApproval: await prisma.materialProposalApproval.findMany(),
    MaterialMovement: await prisma.materialMovement.findMany(),
    ProjectMaterialStock: await prisma.projectMaterialStock.findMany(),
    ApprovalRequest: await prisma.approvalRequest.findMany(),
    Notification: await prisma.notification.findMany(),
    ChatMessage: await prisma.chatMessage.findMany(),
    AuditLog: await prisma.auditLog.findMany(),
    FieldProgressTemplate: await prisma.fieldProgressTemplate.findMany(),
    FieldProgressItem: await prisma.fieldProgressItem.findMany(),
    ProjectLocationNode: await prisma.projectLocationNode.findMany(),
    FieldProgressItemAssignment: await prisma.fieldProgressItemAssignment.findMany(),
    FieldProgressItemLocation: await prisma.fieldProgressItemLocation.findMany(),
    FieldProgressEntry: await prisma.fieldProgressEntry.findMany(),
    FieldMaterialRequest: await prisma.fieldMaterialRequest.findMany(),
    FieldMaterialRequestItem: await prisma.fieldMaterialRequestItem.findMany(),
    SystemSetting: await prisma.systemSetting.findMany(),
    SupervisionAttachment: await prisma.supervisionAttachment.findMany(),
    SupervisionFinding: await prisma.supervisionFinding.findMany(),
    SupervisionPlanItem: await prisma.supervisionPlanItem.findMany(),
    SupervisionProgressAssessment: await prisma.supervisionProgressAssessment.findMany(),
    SupervisionQuantityVerification: await prisma.supervisionQuantityVerification.findMany(),
    SupervisionRecommendation: await prisma.supervisionRecommendation.findMany(),
    SupervisionScope: await prisma.supervisionScope.findMany(),
    SupervisionScopeProject: await prisma.supervisionScopeProject.findMany(),
    SupervisionTransitionCheck: await prisma.supervisionTransitionCheck.findMany(),
    SupervisionVisit: await prisma.supervisionVisit.findMany(),
    SupervisionWeeklyPackage: await prisma.supervisionWeeklyPackage.findMany(),
    SupervisionWorkflowHistory: await prisma.supervisionWorkflowHistory.findMany(),
    SupervisionInspectionSchedule: await prisma.supervisionInspectionSchedule.findMany(),
    SupervisionWeeklyDossier: await prisma.supervisionWeeklyDossier.findMany(),
    SupervisionWeeklyShiftSelection: await prisma.supervisionWeeklyShiftSelection.findMany(),
    SupervisionWeeklyEntry: await prisma.supervisionWeeklyEntry.findMany(),
    SupervisionWeeklyQuantity: await prisma.supervisionWeeklyQuantity.findMany(),
    SupervisionWeeklyTransition: await prisma.supervisionWeeklyTransition.findMany(),
    SupervisionWeeklyProgress: await prisma.supervisionWeeklyProgress.findMany(),
    SupervisionWeeklyObservation: await prisma.supervisionWeeklyObservation.findMany(),
    SupervisionWeeklyAttachment: await prisma.supervisionWeeklyAttachment.findMany(),
    SupervisionWeeklyRevision: await prisma.supervisionWeeklyRevision.findMany(),
    SafetyReportPlanSequence: await prisma.safetyReportPlanSequence.findMany(),
    SafetySelfAssessmentSequence: await prisma.safetySelfAssessmentSequence.findMany(),
    SafetyReportPlan: await prisma.safetyReportPlan.findMany(),
    SafetyReportPlanEntry: await prisma.safetyReportPlanEntry.findMany(),
    SafetySelfAssessmentReport: await prisma.safetySelfAssessmentReport.findMany(),
    SafetySelfAssessmentEntry: await prisma.safetySelfAssessmentEntry.findMany(),
    SafetyReportApprovalHistory: await prisma.safetyReportApprovalHistory.findMany(),
    SafetyReportAuditLog: await prisma.safetyReportAuditLog.findMany(),
    SafetyWeeklyFile: await prisma.safetyWeeklyFile.findMany(),
    OrganizationUnit: await prisma.organizationUnit.findMany(),
    Position: await prisma.position.findMany(),
    Employee: await prisma.employee.findMany(),
    EmployeeOrganizationAssignment: await prisma.employeeOrganizationAssignment.findMany(),
    OrganizationUnitManagerAssignment: await prisma.organizationUnitManagerAssignment.findMany(),
    ProjectPersonnelRole: await prisma.projectPersonnelRole.findMany(),
    EmployeeProjectAssignment: await prisma.employeeProjectAssignment.findMany(),
    HrPermissionDefinition: await prisma.hrPermissionDefinition.findMany(),
    UserAccessGrant: await prisma.userAccessGrant.findMany(),
    EmployeeCodeSequence: await prisma.employeeCodeSequence.findMany(),
    EmployeeChangeHistory: await prisma.employeeChangeHistory.findMany(),
  };

  fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2), "utf-8");
  const stats = fs.statSync(backupPath);
  console.log(`\nBACKUP SUCCESSFUL!`);
  console.log(`Path: ${backupPath}`);
  console.log(`Size: ${(stats.size / 1024).toFixed(2)} KB`);
}

main()
  .catch((e) => {
    console.error("Backup failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
