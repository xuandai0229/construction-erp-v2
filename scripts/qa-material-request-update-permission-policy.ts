import { UserRole, ProjectRole } from "@prisma/client";
import { getMaterialPermissions } from "../src/lib/materials/materials-permissions";

async function runTest() {
  console.log("=== STARTING PERMISSION POLICY TEST ===\n");

  const results: any[] = [];
  
  const testCases = [
    { name: "Admin full rights", role: UserRole.ADMIN, projRole: null, expectManage: true },
    { name: "Director full rights", role: UserRole.DIRECTOR, projRole: null, expectManage: true },
    { name: "Deputy Director full rights", role: UserRole.DEPUTY_DIRECTOR, projRole: null, expectManage: true },
    { name: "Accountant without project access", role: UserRole.ACCOUNTANT, projRole: null, expectManage: false },
    { name: "Staff without project access", role: UserRole.STAFF, projRole: null, expectManage: false },
    { name: "Viewer in project", role: UserRole.STAFF, projRole: ProjectRole.VIEWER, expectManage: false },
    { name: "Staff in project", role: UserRole.STAFF, projRole: ProjectRole.STAFF, expectManage: false },
    { name: "Project Manager in project", role: UserRole.STAFF, projRole: ProjectRole.PROJECT_MANAGER, expectManage: true },
    { name: "Chief Commander in project", role: UserRole.ENGINEER, projRole: ProjectRole.CHIEF_COMMANDER, expectManage: true },
    { name: "Site Commander in project", role: UserRole.ENGINEER, projRole: ProjectRole.SITE_COMMANDER, expectManage: true },
    { name: "Assistant Commander in project", role: UserRole.ENGINEER, projRole: ProjectRole.ASSISTANT_COMMANDER, expectManage: true },
  ];

  console.log("Testing permission helper (canUpdateMaterialRequests):\n");
  for (const tc of testCases) {
    const perms = getMaterialPermissions(tc.role, tc.projRole);
    const pass = perms.canUpdateMaterialRequests === tc.expectManage;
    console.log(`[${pass ? "PASS" : "FAIL"}] ${tc.name} -> expected: ${tc.expectManage}, got: ${perms.canUpdateMaterialRequests}`);
    results.push({ test: tc.name, pass });
  }

  console.log("\nTesting specific status scenarios logic (Simulated):\n");
  
  const statuses = ["DRAFT", "SUBMITTED", "PENDING", "REQUESTED", "APPROVED", "CANCELLED", "REJECTED"];
  
  function canEditRequest(status: string, isOwner: boolean, isManager: boolean) {
    if (!isOwner && !isManager) return { allowed: false, reason: "Bạn không có quyền sửa đề xuất này trong công trình hiện tại." };
    if (!["DRAFT", "SUBMITTED", "REQUESTED"].includes(status)) {
      return { allowed: false, reason: "Chỉ có thể sửa đề xuất nháp hoặc đang chờ duyệt." };
    }
    return { allowed: true, reason: "OK" };
  }

  // 1. Owner sửa DRAFT được.
  const r1 = canEditRequest("DRAFT", true, false);
  console.log(`[${r1.allowed ? "PASS" : "FAIL"}] Owner sửa DRAFT: ${r1.reason}`);

  // 2. Owner sửa SUBMITTED/REQUESTED được.
  const r2 = canEditRequest("SUBMITTED", true, false) && canEditRequest("REQUESTED", true, false);
  console.log(`[${r2.allowed ? "PASS" : "FAIL"}] Owner sửa SUBMITTED/REQUESTED: ${r2.reason}`);

  // 3. Owner không sửa APPROVED.
  const r3 = canEditRequest("APPROVED", true, false);
  console.log(`[${!r3.allowed ? "PASS" : "FAIL"}] Owner không sửa APPROVED: ${r3.reason}`);

  // 4. Owner không sửa REJECTED nếu policy là rejected chỉ xóa.
  const r4 = canEditRequest("REJECTED", true, false);
  console.log(`[${!r4.allowed ? "PASS" : "FAIL"}] Owner không sửa REJECTED: ${r4.reason}`);

  // 5. Viewer không sửa được (nếu không phải owner, và Viewer = isManager: false)
  const r5 = canEditRequest("SUBMITTED", false, false); // Not owner, not manager
  console.log(`[${!r5.allowed ? "PASS" : "FAIL"}] Viewer không sửa được: ${r5.reason}`);

  // 6. CHIEF_COMMANDER (isManager: true) sửa được phiếu của người khác (isOwner: false)
  const r6 = canEditRequest("SUBMITTED", false, true);
  console.log(`[${r6.allowed ? "PASS" : "FAIL"}] CHIEF_COMMANDER sửa được: ${r6.reason}`);

  console.log("\n=== SUMMARY ===");
  console.log("All tests completed.");
}

runTest().catch(console.error);
