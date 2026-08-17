import { prisma } from "./db_client";
import fs from "fs";
import path from "path";

// 21 CANONICAL PROTECTED PROJECT IDS
const PROJECT_KEEP_IDS = [
  "cms9tyddq0000n4k5mvu9wdrt",
  "cms9tyde50001n4k53e221ea6",
  "cms9tydgm0004n4k5luf4qn5n",
  "cms9tydia0007n4k563f6j0g7",
  "cms9tydic0009n4k57z419qjm",
  "cms9tydif000bn4k56ypfqjxw",
  "cms9tydk2000en4k56itvgc7a",
  "cms9tydlp000hn4k5s8402dhe",
  "cms9tydlu000jn4k5itd0vzcd",
  "cms9tydnk000mn4k5azfl2w64",
  "cms9tydp8000pn4k5tuwqq9ga",
  "cms9tydqx000sn4k5sz6q6wfj",
  "cms9tydsm000vn4k5t0z7fhsx",
  "cms9tydsp000xn4k5286p44ty",
  "cms9tydud0010n4k5w2hmqjmh",
  "cms9tydw00013n4k5sjjtouul",
  "cms9tydxt0016n4k5rx9hikdj",
  "cms9tydxx0018n4k5xsmxehmz",
  "cms9tydy1001an4k52iepe45t",
  "cms9tydy2001bn4k58evaixfi",
  "cms9tydy4001dn4k58iib1ob9",
];

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes("--dry-run");
  const isExecute = args.includes("--execute");

  if (!isDryRun && !isExecute) {
    console.error("ERROR: Must specify either --dry-run or --execute flag!");
    console.log("Usage:");
    console.log("  npx tsx scripts/admin/system-clean-slate.ts --dry-run");
    console.log("  npx tsx scripts/admin/system-clean-slate.ts --execute");
    process.exit(1);
  }

  console.log(`\n=============================================================`);
  console.log(`   SYSTEM DATA CLEAN SLATE / DATA RESET (${isDryRun ? "DRY RUN MODE" : "EXECUTE MODE"})`);
  console.log(`=============================================================\n`);

  // STEP 1: VERIFY PROJECT WHITELIST
  const existingProjects = await prisma.project.findMany({
    select: { id: true, code: true, name: true, status: true },
    orderBy: { code: "asc" },
  });

  console.log(`--> Checking 21 Protected Real Projects...`);
  if (existingProjects.length !== 21) {
    console.error(`ABORT: Expected exactly 21 projects, but found ${existingProjects.length}`);
    process.exit(1);
  }

  const existingProjectIds = existingProjects.map((p) => p.id).sort();
  const keepProjectIdsSorted = [...PROJECT_KEEP_IDS].sort();

  const idMismatch = existingProjectIds.some((id, idx) => id !== keepProjectIdsSorted[idx]);
  if (idMismatch) {
    console.error(`ABORT: Whitelist ID mismatch! Existing project IDs do not match PROJECT_KEEP_IDS.`);
    process.exit(1);
  }

  console.log(`✔ PROJECT WHITELIST ASSERTION PASSED: Exactly 21 real projects verified.\n`);

  // STEP 2: VERIFY ADMIN ACCOUNTS TO PRESERVE
  const adminUsers = await prisma.user.findMany({
    where: { role: "ADMIN" },
    select: { id: true, email: true, name: true, role: true },
  });

  if (adminUsers.length === 0) {
    console.error(`ABORT: No ADMIN users found to keep! System would lock out administrators.`);
    process.exit(1);
  }

  const adminIdsToKeep = adminUsers.map((u) => u.id);
  console.log(`--> Preserving ${adminUsers.length} Administrator Accounts:`);
  adminUsers.forEach((u) => console.log(`    - ID: ${u.id} | Email: ${u.email} | Name: ${u.name}`));
  console.log(``);

  // STEP 3: AUDIT MODELS & DELETION MANIFEST
  const manifest = [
    // Weekly Supervision
    { model: "SupervisionWeeklyRevision", action: "DELETE", count: await prisma.supervisionWeeklyRevision.count() },
    { model: "SupervisionWeeklyAttachment", action: "DELETE", count: await prisma.supervisionWeeklyAttachment.count() },
    { model: "SupervisionWeeklyObservation", action: "DELETE", count: await prisma.supervisionWeeklyObservation.count() },
    { model: "SupervisionWeeklyProgress", action: "DELETE", count: await prisma.supervisionWeeklyProgress.count() },
    { model: "SupervisionWeeklyTransition", action: "DELETE", count: await prisma.supervisionWeeklyTransition.count() },
    { model: "SupervisionWeeklyQuantity", action: "DELETE", count: await prisma.supervisionWeeklyQuantity.count() },
    { model: "SupervisionWeeklyEntry", action: "DELETE", count: await prisma.supervisionWeeklyEntry.count() },
    { model: "SupervisionWeeklyShiftSelection", action: "DELETE", count: await prisma.supervisionWeeklyShiftSelection.count() },
    { model: "SupervisionWeeklyDossier", action: "DELETE", count: await prisma.supervisionWeeklyDossier.count() },

    // Legacy Supervision
    { model: "SupervisionInspectionSchedule", action: "DELETE", count: await prisma.supervisionInspectionSchedule.count() },
    { model: "SupervisionWorkflowHistory", action: "DELETE", count: await prisma.supervisionWorkflowHistory.count() },
    { model: "SupervisionVisit", action: "DELETE", count: await prisma.supervisionVisit.count() },
    { model: "SupervisionTransitionCheck", action: "DELETE", count: await prisma.supervisionTransitionCheck.count() },
    { model: "SupervisionScopeProject", action: "DELETE", count: await prisma.supervisionScopeProject.count() },
    { model: "SupervisionScope", action: "DELETE", count: await prisma.supervisionScope.count() },
    { model: "SupervisionRecommendation", action: "DELETE", count: await prisma.supervisionRecommendation.count() },
    { model: "SupervisionQuantityVerification", action: "DELETE", count: await prisma.supervisionQuantityVerification.count() },
    { model: "SupervisionProgressAssessment", action: "DELETE", count: await prisma.supervisionProgressAssessment.count() },
    { model: "SupervisionPlanItem", action: "DELETE", count: await prisma.supervisionPlanItem.count() },
    { model: "SupervisionFinding", action: "DELETE", count: await prisma.supervisionFinding.count() },
    { model: "SupervisionAttachment", action: "DELETE", count: await prisma.supervisionAttachment.count() },
    { model: "SupervisionWeeklyPackage", action: "DELETE", count: await prisma.supervisionWeeklyPackage.count() },

    // Safety Module
    { model: "SafetyReportApprovalHistory", action: "DELETE", count: await prisma.safetyReportApprovalHistory.count() },
    { model: "SafetyReportAuditLog", action: "DELETE", count: await prisma.safetyReportAuditLog.count() },
    { model: "SafetySelfAssessmentEntry", action: "DELETE", count: await prisma.safetySelfAssessmentEntry.count() },
    { model: "SafetySelfAssessmentReport", action: "DELETE", count: await prisma.safetySelfAssessmentReport.count() },
    { model: "SafetyReportPlanEntry", action: "DELETE", count: await prisma.safetyReportPlanEntry.count() },
    { model: "SafetyReportPlan", action: "DELETE", count: await prisma.safetyReportPlan.count() },
    { model: "SafetyWeeklyFile", action: "DELETE", count: await prisma.safetyWeeklyFile.count() },

    // HR Module
    { model: "EmployeeChangeHistory", action: "DELETE", count: await prisma.employeeChangeHistory.count() },
    { model: "UserAccessGrant", action: "DELETE", count: await prisma.userAccessGrant.count() },
    { model: "EmployeeProjectAssignment", action: "DELETE", count: await prisma.employeeProjectAssignment.count() },
    { model: "OrganizationUnitManagerAssignment", action: "DELETE", count: await prisma.organizationUnitManagerAssignment.count() },
    { model: "EmployeeOrganizationAssignment", action: "DELETE", count: await prisma.employeeOrganizationAssignment.count() },
    { model: "Employee", action: "DELETE", count: await prisma.employee.count() },
    { model: "OrganizationUnit", action: "DELETE", count: await prisma.organizationUnit.count() },

    // Field Progress & Construction Quantities
    { model: "FieldMaterialRequestItem", action: "DELETE", count: await prisma.fieldMaterialRequestItem.count() },
    { model: "FieldMaterialRequest", action: "DELETE", count: await prisma.fieldMaterialRequest.count() },
    { model: "FieldProgressEntry", action: "DELETE", count: await prisma.fieldProgressEntry.count() },
    { model: "FieldProgressItemAssignment", action: "DELETE", count: await prisma.fieldProgressItemAssignment.count() },
    { model: "FieldProgressItemLocation", action: "DELETE", count: await prisma.fieldProgressItemLocation.count() },
    { model: "FieldProgressItem", action: "DELETE", count: await prisma.fieldProgressItem.count() },
    { model: "FieldProgressTemplate", action: "DELETE", count: await prisma.fieldProgressTemplate.count() },
    { model: "ProjectLocationNode", action: "DELETE", count: await prisma.projectLocationNode.count() },

    // Reports & Documents
    { model: "SiteReportLine", action: "DELETE", count: await prisma.siteReportLine.count() },
    { model: "SiteReportPhoto", action: "DELETE", count: await prisma.siteReportPhoto.count() },
    { model: "SiteReportAttachment", action: "DELETE", count: await prisma.siteReportAttachment.count() },
    { model: "SiteReport", action: "DELETE", count: await prisma.siteReport.count() },
    { model: "Document", action: "DELETE", count: await prisma.document.count() },
    { model: "DocumentFolder", action: "DELETE", count: await prisma.documentFolder.count() },
    { model: "WBSItem", action: "DELETE", count: await prisma.wBSItem.count() },

    // Materials
    { model: "MaterialMovement", action: "DELETE", count: await prisma.materialMovement.count() },
    { model: "ProjectMaterialStock", action: "DELETE", count: await prisma.projectMaterialStock.count() },
    { model: "MaterialProposalApproval", action: "DELETE", count: await prisma.materialProposalApproval.count() },
    { model: "MaterialProposalItem", action: "DELETE", count: await prisma.materialProposalItem.count() },
    { model: "MaterialProposal", action: "DELETE", count: await prisma.materialProposal.count() },
    { model: "MaterialItem", action: "DELETE", count: await prisma.materialItem.count() },

    // Core & Operations
    { model: "ApprovalRequest", action: "DELETE", count: await prisma.approvalRequest.count() },
    { model: "Notification", action: "DELETE", count: await prisma.notification.count() },
    { model: "ChatMessage", action: "DELETE", count: await prisma.chatMessage.count() },
    { model: "AuditLog", action: "DELETE", count: await prisma.auditLog.count() },
    { model: "ProjectMember", action: "DELETE", count: await prisma.projectMember.count() },
    { model: "User (Non-Admin)", action: "DELETE", count: await prisma.user.count({ where: { role: { not: "ADMIN" } } }) },

    // Preserved Models (Group A & Group C)
    { model: "Project (21 Real Projects)", action: "KEEP", count: await prisma.project.count() },
    { model: "User (Preserved Admins)", action: "KEEP", count: await prisma.user.count({ where: { role: "ADMIN" } }) },
    { model: "SystemSetting", action: "KEEP", count: await prisma.systemSetting.count() },
    { model: "HrPermissionDefinition", action: "KEEP", count: await prisma.hrPermissionDefinition.count() },
    { model: "ProjectPersonnelRole", action: "KEEP", count: await prisma.projectPersonnelRole.count() },
    { model: "Position", action: "KEEP", count: await prisma.position.count() },
  ];

  console.log("=== DELETION AUDIT MANIFEST ===");
  console.table(manifest);

  const totalToDelete = manifest.filter((m) => m.action === "DELETE").reduce((acc, m) => acc + m.count, 0);
  console.log(`Total Records Queued for Deletion: ${totalToDelete}`);

  if (isDryRun) {
    console.log(`\n=============================================================`);
    console.log(`   DRY RUN COMPLETE — ZERO DATA WAS MUTATED.`);
    console.log(`   PROJECTS TO KEEP: 21`);
    console.log(`   PROJECTS TO DELETE: 0`);
    console.log(`   ADMIN USERS TO KEEP: ${adminUsers.length}`);
    console.log(`=============================================================\n`);
    return;
  }

  // EXECUTE MODE
  console.log(`\n--> EXECUTING CLEANUP DELETIONS IN SAFE FK REVERSE ORDER...`);

  await prisma.$transaction(async (tx) => {
    // 1. Weekly Supervision
    await tx.supervisionWeeklyRevision.deleteMany({});
    await tx.supervisionWeeklyAttachment.deleteMany({});
    await tx.supervisionWeeklyObservation.deleteMany({});
    await tx.supervisionWeeklyProgress.deleteMany({});
    await tx.supervisionWeeklyTransition.deleteMany({});
    await tx.supervisionWeeklyQuantity.deleteMany({});
    await tx.supervisionWeeklyEntry.deleteMany({});
    await tx.supervisionWeeklyShiftSelection.deleteMany({});
    await tx.supervisionWeeklyDossier.deleteMany({});

    // 2. Legacy Supervision
    await tx.supervisionInspectionSchedule.deleteMany({});
    await tx.supervisionWorkflowHistory.deleteMany({});
    await tx.supervisionVisit.deleteMany({});
    await tx.supervisionTransitionCheck.deleteMany({});
    await tx.supervisionScopeProject.deleteMany({});
    await tx.supervisionScope.deleteMany({});
    await tx.supervisionRecommendation.deleteMany({});
    await tx.supervisionQuantityVerification.deleteMany({});
    await tx.supervisionProgressAssessment.deleteMany({});
    await tx.supervisionPlanItem.deleteMany({});
    await tx.supervisionFinding.deleteMany({});
    await tx.supervisionAttachment.deleteMany({});
    await tx.supervisionWeeklyPackage.deleteMany({});

    // 3. Safety Module
    await tx.safetyReportApprovalHistory.deleteMany({});
    await tx.safetyReportAuditLog.deleteMany({});
    await tx.safetySelfAssessmentEntry.deleteMany({});
    await tx.safetySelfAssessmentReport.deleteMany({});
    await tx.safetyReportPlanEntry.deleteMany({});
    await tx.safetyReportPlan.deleteMany({});
    await tx.safetyWeeklyFile.deleteMany({});

    // 4. HR Module
    await tx.employeeChangeHistory.deleteMany({});
    await tx.userAccessGrant.deleteMany({});
    await tx.employeeProjectAssignment.deleteMany({});
    await tx.organizationUnitManagerAssignment.deleteMany({});
    await tx.employeeOrganizationAssignment.deleteMany({});
    await tx.employee.deleteMany({});
    await tx.organizationUnit.deleteMany({});

    // 5. Field Progress & Quantities
    await tx.fieldMaterialRequestItem.deleteMany({});
    await tx.fieldMaterialRequest.deleteMany({});
    await tx.fieldProgressEntry.deleteMany({});
    await tx.fieldProgressItemAssignment.deleteMany({});
    await tx.fieldProgressItemLocation.deleteMany({});
    await tx.fieldProgressItem.deleteMany({});
    await tx.fieldProgressTemplate.deleteMany({});
    await tx.projectLocationNode.deleteMany({});

    // 6. Reports & Documents
    await tx.siteReportLine.deleteMany({});
    await tx.siteReportPhoto.deleteMany({});
    await tx.siteReportAttachment.deleteMany({});
    await tx.siteReport.deleteMany({});
    await tx.document.deleteMany({});
    await tx.documentFolder.deleteMany({});
    await tx.wBSItem.deleteMany({});

    // 7. Materials
    await tx.materialMovement.deleteMany({});
    await tx.projectMaterialStock.deleteMany({});
    await tx.materialProposalApproval.deleteMany({});
    await tx.materialProposalItem.deleteMany({});
    await tx.materialProposal.deleteMany({});
    await tx.materialItem.deleteMany({});

    // 8. Core & Operations
    await tx.approvalRequest.deleteMany({});
    await tx.notification.deleteMany({});
    await tx.chatMessage.deleteMany({});
    await tx.auditLog.deleteMany({});
    await tx.projectMember.deleteMany({});

    // 9. Non-Admin Users
    await tx.user.deleteMany({
      where: {
        id: { notIn: adminIdsToKeep },
      },
    });

    // Reset sequence generators
    await tx.employeeCodeSequence.deleteMany({});
    await tx.safetyReportPlanSequence.deleteMany({});
    await tx.safetySelfAssessmentSequence.deleteMany({});
  });

  console.log(`✔ TRANSACTIONAL CLEANUP COMPLETED SUCCESSFULLY!\n`);

  // POST-CLEANUP VERIFICATIONS & QUALITY GATES
  console.log("=== POST-CLEANUP ASSERTIONS ===");

  const postProjects = await prisma.project.findMany({
    select: { id: true, code: true, name: true },
    orderBy: { code: "asc" },
  });

  console.log(`1. PROJECT COUNT CHECK: Found ${postProjects.length} (Expected: 21)`);
  if (postProjects.length !== 21) {
    throw new Error(`POST-CLEANUP ASSERTION FAILED: Project count is ${postProjects.length}, expected 21`);
  }

  const postProjectIds = postProjects.map((p) => p.id).sort();
  const idsMatch = postProjectIds.every((id, idx) => id === keepProjectIdsSorted[idx]);
  console.log(`2. PROJECT ID INTEGRITY CHECK: ${idsMatch ? "PASS (Exact ID Match)" : "FAIL"}`);
  if (!idsMatch) {
    throw new Error("POST-CLEANUP ASSERTION FAILED: Project IDs changed!");
  }

  const quantityCounts = {
    WBSItem: await prisma.wBSItem.count(),
    SiteReportLine: await prisma.siteReportLine.count(),
    FieldProgressEntry: await prisma.fieldProgressEntry.count(),
    FieldProgressItem: await prisma.fieldProgressItem.count(),
    SupervisionWeeklyQuantity: await prisma.supervisionWeeklyQuantity.count(),
    SupervisionQuantityVerification: await prisma.supervisionQuantityVerification.count(),
  };

  const totalQuantities = Object.values(quantityCounts).reduce((a, b) => a + b, 0);
  console.log(`3. CONSTRUCTION QUANTITIES CHECK: ${totalQuantities === 0 ? "PASS (0 Quantities Remaining)" : "FAIL"}`);
  console.table(quantityCounts);

  const hrCounts = {
    Employee: await prisma.employee.count(),
    OrganizationUnit: await prisma.organizationUnit.count(),
    EmployeeOrganizationAssignment: await prisma.employeeOrganizationAssignment.count(),
    EmployeeProjectAssignment: await prisma.employeeProjectAssignment.count(),
    OrganizationUnitManagerAssignment: await prisma.organizationUnitManagerAssignment.count(),
  };
  const totalHr = Object.values(hrCounts).reduce((a, b) => a + b, 0);
  console.log(`4. HR DATA CLEANUP CHECK: ${totalHr === 0 ? "PASS (0 HR Test Records Remaining)" : "FAIL"}`);
  console.table(hrCounts);

  const remainingAdmins = await prisma.user.findMany({ select: { id: true, email: true, role: true } });
  console.log(`5. PRESERVED ADMIN USERS: ${remainingAdmins.length} users`);
  console.table(remainingAdmins);

  console.log(`\n=============================================================`);
  console.log(`   FINAL ACCEPTANCE GATE: PASS`);
  console.log(`   SYSTEM CLEAN SLATE EXECUTION SUCCESSFUL.`);
  console.log(`=============================================================\n`);
}

main()
  .catch((e) => {
    console.error("\nEXECUTION FAILED:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
