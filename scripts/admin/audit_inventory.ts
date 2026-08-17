import { prisma } from "./db_client";

async function main() {
  console.log("=== PHASE 1: FULL DATABASE MODEL INVENTORY AUDIT ===\n");

  const models: { name: string; count: number }[] = [
    { name: "User", count: await prisma.user.count() },
    { name: "Project", count: await prisma.project.count() },
    { name: "ProjectMember", count: await prisma.projectMember.count() },
    { name: "WBSItem", count: await prisma.wBSItem.count() },
    { name: "DocumentFolder", count: await prisma.documentFolder.count() },
    { name: "Document", count: await prisma.document.count() },
    { name: "SiteReport", count: await prisma.siteReport.count() },
    { name: "SiteReportPhoto", count: await prisma.siteReportPhoto.count() },
    { name: "SiteReportAttachment", count: await prisma.siteReportAttachment.count() },
    { name: "SiteReportLine", count: await prisma.siteReportLine.count() },
    { name: "MaterialItem", count: await prisma.materialItem.count() },
    { name: "MaterialProposal", count: await prisma.materialProposal.count() },
    { name: "MaterialProposalItem", count: await prisma.materialProposalItem.count() },
    { name: "MaterialProposalApproval", count: await prisma.materialProposalApproval.count() },
    { name: "MaterialMovement", count: await prisma.materialMovement.count() },
    { name: "ProjectMaterialStock", count: await prisma.projectMaterialStock.count() },
    { name: "ApprovalRequest", count: await prisma.approvalRequest.count() },
    { name: "Notification", count: await prisma.notification.count() },
    { name: "ChatMessage", count: await prisma.chatMessage.count() },
    { name: "AuditLog", count: await prisma.auditLog.count() },
    { name: "FieldProgressTemplate", count: await prisma.fieldProgressTemplate.count() },
    { name: "FieldProgressItem", count: await prisma.fieldProgressItem.count() },
    { name: "ProjectLocationNode", count: await prisma.projectLocationNode.count() },
    { name: "FieldProgressItemAssignment", count: await prisma.fieldProgressItemAssignment.count() },
    { name: "FieldProgressItemLocation", count: await prisma.fieldProgressItemLocation.count() },
    { name: "FieldProgressEntry", count: await prisma.fieldProgressEntry.count() },
    { name: "FieldMaterialRequest", count: await prisma.fieldMaterialRequest.count() },
    { name: "FieldMaterialRequestItem", count: await prisma.fieldMaterialRequestItem.count() },
    { name: "SystemSetting", count: await prisma.systemSetting.count() },
    { name: "SupervisionAttachment", count: await prisma.supervisionAttachment.count() },
    { name: "SupervisionFinding", count: await prisma.supervisionFinding.count() },
    { name: "SupervisionPlanItem", count: await prisma.supervisionPlanItem.count() },
    { name: "SupervisionProgressAssessment", count: await prisma.supervisionProgressAssessment.count() },
    { name: "SupervisionQuantityVerification", count: await prisma.supervisionQuantityVerification.count() },
    { name: "SupervisionRecommendation", count: await prisma.supervisionRecommendation.count() },
    { name: "SupervisionScope", count: await prisma.supervisionScope.count() },
    { name: "SupervisionScopeProject", count: await prisma.supervisionScopeProject.count() },
    { name: "SupervisionTransitionCheck", count: await prisma.supervisionTransitionCheck.count() },
    { name: "SupervisionVisit", count: await prisma.supervisionVisit.count() },
    { name: "SupervisionWeeklyPackage", count: await prisma.supervisionWeeklyPackage.count() },
    { name: "SupervisionWorkflowHistory", count: await prisma.supervisionWorkflowHistory.count() },
    { name: "SupervisionInspectionSchedule", count: await prisma.supervisionInspectionSchedule.count() },
    { name: "SupervisionWeeklyDossier", count: await prisma.supervisionWeeklyDossier.count() },
    { name: "SupervisionWeeklyShiftSelection", count: await prisma.supervisionWeeklyShiftSelection.count() },
    { name: "SupervisionWeeklyEntry", count: await prisma.supervisionWeeklyEntry.count() },
    { name: "SupervisionWeeklyQuantity", count: await prisma.supervisionWeeklyQuantity.count() },
    { name: "SupervisionWeeklyTransition", count: await prisma.supervisionWeeklyTransition.count() },
    { name: "SupervisionWeeklyProgress", count: await prisma.supervisionWeeklyProgress.count() },
    { name: "SupervisionWeeklyObservation", count: await prisma.supervisionWeeklyObservation.count() },
    { name: "SupervisionWeeklyAttachment", count: await prisma.supervisionWeeklyAttachment.count() },
    { name: "SupervisionWeeklyRevision", count: await prisma.supervisionWeeklyRevision.count() },
    { name: "SafetyReportPlanSequence", count: await prisma.safetyReportPlanSequence.count() },
    { name: "SafetySelfAssessmentSequence", count: await prisma.safetySelfAssessmentSequence.count() },
    { name: "SafetyReportPlan", count: await prisma.safetyReportPlan.count() },
    { name: "SafetyReportPlanEntry", count: await prisma.safetyReportPlanEntry.count() },
    { name: "SafetySelfAssessmentReport", count: await prisma.safetySelfAssessmentReport.count() },
    { name: "SafetySelfAssessmentEntry", count: await prisma.safetySelfAssessmentEntry.count() },
    { name: "SafetyReportApprovalHistory", count: await prisma.safetyReportApprovalHistory.count() },
    { name: "SafetyReportAuditLog", count: await prisma.safetyReportAuditLog.count() },
    { name: "SafetyWeeklyFile", count: await prisma.safetyWeeklyFile.count() },
    { name: "OrganizationUnit", count: await prisma.organizationUnit.count() },
    { name: "Position", count: await prisma.position.count() },
    { name: "Employee", count: await prisma.employee.count() },
    { name: "EmployeeOrganizationAssignment", count: await prisma.employeeOrganizationAssignment.count() },
    { name: "OrganizationUnitManagerAssignment", count: await prisma.organizationUnitManagerAssignment.count() },
    { name: "ProjectPersonnelRole", count: await prisma.projectPersonnelRole.count() },
    { name: "EmployeeProjectAssignment", count: await prisma.employeeProjectAssignment.count() },
    { name: "HrPermissionDefinition", count: await prisma.hrPermissionDefinition.count() },
    { name: "UserAccessGrant", count: await prisma.userAccessGrant.count() },
    { name: "EmployeeCodeSequence", count: await prisma.employeeCodeSequence.count() },
    { name: "EmployeeChangeHistory", count: await prisma.employeeChangeHistory.count() },
  ];

  console.table(models);

  const totalRecords = models.reduce((acc, m) => acc + m.count, 0);
  console.log(`\nTOTAL RECORDS IN DATABASE: ${totalRecords}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
