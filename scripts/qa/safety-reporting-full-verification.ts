import dotenv from "dotenv";
dotenv.config();

import prisma from "../../src/lib/prisma";
import { SafetyPlanService } from "../../src/lib/safety-reporting/plan-service";
import { SafetyAssessmentService } from "../../src/lib/safety-reporting/assessment-service";
import { SafetyDocxGenerator } from "../../src/lib/safety-reporting/docx-generator";

async function runFullSafetyWorkflowQA() {
  console.log("=================================================");
  console.log("   SAFETY REPORTING MODULE FULL WORKFLOW QA     ");
  console.log("=================================================");

  // 1. Verify User and Project
  const adminUser = await prisma.user.findFirst({
    where: { role: "ADMIN", deletedAt: null },
    select: { id: true, name: true, role: true },
  });

  if (!adminUser) {
    throw new Error("No ADMIN user found in DB.");
  }
  console.log("QA User:", adminUser);

  const projects = await prisma.project.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true },
    take: 3,
  });

  if (projects.length === 0) {
    throw new Error("No projects found in DB.");
  }
  console.log("QA Projects Count:", projects.length);

  // 2. Create Plan Mẫu 02 via SafetyPlanService
  const todayStr = new Date().toISOString().split("T")[0];
  console.log("\n--- STEP 1: Creating Safety Plan (Mẫu 02) via Service ---");

  const plan = await SafetyPlanService.createPlan(adminUser.id, {
    title: `KẾ HOẠCH KIỂM TRA ATLĐ • PCCC • VSMT - QA TEST (${todayStr})`,
    createdDate: new Date(),
    periodStart: new Date("2026-08-03T00:00:00.000Z"),
    periodEnd: new Date("2026-08-09T00:00:00.000Z"),
    purpose: "Kiểm tra định kỳ công tác an toàn lao động, PCCC và vệ sinh môi trường trên các công trình",
    note: "Ghi chú kiểm tra QA tự động",
    entries: projects.map((p, idx) => ({
      inspectionDate: new Date("2026-08-03T00:00:00.000Z"),
      shift: "MORNING",
      projectId: p.id,
      constructionType: "BUILDING",
      inspectionContent: `Kiểm tra an toàn công trình ${p.name}`,
      trainingContent: "Huấn luyện an toàn đầu giờ",
      collaborators: "Ban chỉ huy công trình",
      sortOrder: idx,
    })),
  });

  console.log(`Plan Created: ID=${plan.id}, DocumentNumber=${plan.documentNumber}, Status=${plan.status}, Version=${plan.version}`);

  // 3. Update Plan (Simulate Auto-Save & Manual Save)
  console.log("\n--- STEP 2: Updating Plan (Save Draft / Auto-save) ---");
  const updatedPlan = await prisma.safetyReportPlan.update({
    where: { id: plan.id },
    data: {
      purpose: "Mục đích đã cập nhật qua QA Auto-save Test",
      version: { increment: 1 },
    },
  });
  console.log(`Plan Updated: Version=${updatedPlan.version}, Purpose="${updatedPlan.purpose}"`);

  // 4. Submit Plan
  console.log("\n--- STEP 3: Submitting Plan (DRAFT -> PENDING_APPROVAL) ---");
  const submittedPlan = await SafetyPlanService.submitPlan(adminUser.id, plan.id);
  console.log(`Plan Submitted: Status=${submittedPlan.status}`);

  // 5. Approve Plan
  console.log("\n--- STEP 4: Approving Plan (PENDING_APPROVAL -> APPROVED) ---");
  const approvedPlan = await SafetyPlanService.decidePlan(adminUser.id, plan.id, true);
  console.log(`Plan Approved: DocumentNumber=${approvedPlan.documentNumber}, Status=${approvedPlan.status}`);

  // 6. Create Assessment Mẫu 01 inheriting from Approved Plan
  console.log("\n--- STEP 5: Creating Assessment (Mẫu 01) from Approved Plan ---");
  const assessment = await SafetyAssessmentService.createFromPlan(adminUser.id, approvedPlan.id);
  console.log(`Assessment Created: ID=${assessment.id}, DocumentNumber=${assessment.documentNumber}, Status=${assessment.status}`);

  // 7. Submit & Approve Assessment
  console.log("\n--- STEP 6: Submitting & Approving Assessment ---");
  const submittedAssessment = await SafetyAssessmentService.submitReport(adminUser.id, assessment.id);
  const approvedAssessment = await SafetyAssessmentService.decideReport(adminUser.id, assessment.id, true);
  console.log(`Assessment Approved: DocumentNumber=${approvedAssessment.documentNumber}, Status=${approvedAssessment.status}`);

  // 8. Test DOCX Generator for both Mẫu 01 & Mẫu 02
  console.log("\n--- STEP 7: Testing Word (.DOCX) Generation ---");
  const fullPlan = await SafetyPlanService.getPlanById(approvedPlan.id);
  const planDocxBuffer = await SafetyDocxGenerator.generatePlanDocx(fullPlan);
  console.log(`Plan DOCX Generated: Buffer Size = ${planDocxBuffer.length} bytes`);

  const fullAssessment = await SafetyAssessmentService.getReportById(approvedAssessment.id);
  const assessmentDocxBuffer = await SafetyDocxGenerator.generateAssessmentDocx(fullAssessment);
  console.log(`Assessment DOCX Generated: Buffer Size = ${assessmentDocxBuffer.length} bytes`);

  console.log("\n=================================================");
  console.log("   FULL WORKFLOW QA VERIFICATION COMPLETED: PASS  ");
  console.log("=================================================");
}

runFullSafetyWorkflowQA().catch((err) => {
  console.error("QA WORKFLOW FAILED:", err);
  process.exit(1);
});
