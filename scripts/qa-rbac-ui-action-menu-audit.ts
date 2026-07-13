import { ProjectRole, UserRole } from "@prisma/client";
import { getAccountingPermissions } from "../src/lib/accounting/accounting-permissions";
import { canApproveByRequestType } from "../src/lib/approvals/approval-policy";
import { getContractPermissions } from "../src/lib/contracts/contracts-permissions";
import { canCreateFolder, canUploadToFolder } from "../src/lib/documents/permissions";
import { getFieldProgressPermissions } from "../src/lib/field-progress/field-progress-permissions";
import { getMaterialPermissions } from "../src/lib/materials/materials-permissions";
import { canCreateReport } from "../src/lib/reports/report-workflow-policy";

type Scenario = {
  label: string;
  userRole: UserRole;
  projectRole: ProjectRole | null;
  hasProjectAccess: boolean;
};

const scenarios: Scenario[] = [
  { label: "Admin", userRole: "ADMIN", projectRole: null, hasProjectAccess: true },
  { label: "Director", userRole: "DIRECTOR", projectRole: null, hasProjectAccess: true },
  { label: "Deputy Director", userRole: "DEPUTY_DIRECTOR", projectRole: null, hasProjectAccess: true },
  { label: "Commander", userRole: "CHIEF_COMMANDER", projectRole: "SITE_COMMANDER", hasProjectAccess: true },
  { label: "Accountant Viewer", userRole: "ACCOUNTANT", projectRole: "VIEWER", hasProjectAccess: true },
  { label: "Engineer", userRole: "ENGINEER", projectRole: "SUPERVISOR", hasProjectAccess: true },
  { label: "Viewer", userRole: "STAFF", projectRole: "VIEWER", hasProjectAccess: true },
  { label: "Outside", userRole: "STAFF", projectRole: null, hasProjectAccess: false },
];

function visible(value: boolean) {
  return value ? "show" : "hide";
}

function main() {
  console.log("=== RBAC UI/ACTION MENU STATIC AUDIT ===");
  console.log("Role | ProjectRole | Module | Action | Expected UI | Server permission source");

  for (const scenario of scenarios) {
    const material = getMaterialPermissions(scenario.userRole, scenario.projectRole);
    const accounting = getAccountingPermissions(scenario.userRole, scenario.projectRole);
    const contracts = getContractPermissions(scenario.userRole, scenario.projectRole);
    const progress = getFieldProgressPermissions(scenario.userRole, scenario.projectRole);
    const documentUser = { id: "qa", role: scenario.userRole, projectRole: scenario.projectRole };
    const approvalBase = { userRole: scenario.userRole, projectRole: scenario.projectRole, actorId: "actor", requesterId: "requester" };

    const rows = [
      ["Materials", "create/update/delete/restore/import/export", material.canCreate || material.canUpdate || material.canDelete || material.canRestore || material.canImport || material.canExport, "getMaterialPermissions"],
      ["Material Requests", "approve", canApproveByRequestType({ ...approvalBase, requestType: "MATERIAL" }), "canApproveMaterialRequest"],
      ["Reports", "create/update draft", canCreateReport({ id: "actor", role: scenario.userRole }, scenario.hasProjectAccess), "report-workflow-policy"],
      ["Documents", "create folder/upload", canCreateFolder(documentUser) || canUploadToFolder(documentUser, { id: "folder", name: "ho so thanh toan" }), "documents/permissions"],
      ["Contracts", "create/update/delete", contracts.canCreate || contracts.canUpdate || contracts.canDelete, "getContractPermissions"],
      ["Payments", "create/update/mark paid/approve", accounting.canCreate || accounting.canUpdate || accounting.canMarkPaid || accounting.canApprove, "getAccountingPermissions"],
      ["Approvals", "approve payment", canApproveByRequestType({ ...approvalBase, requestType: "PAYMENT" }), "canApprovePayment"],
      ["Field Progress", "update/approve/lock", progress.canUpdateProgress || progress.canApproveProgress || progress.canLockProgress, "getFieldProgressPermissions"],
    ] as const;

    for (const [module, action, allowed, source] of rows) {
      const viewerMutationLeak = scenario.projectRole === "VIEWER" && allowed;
      const outsideLeak = !scenario.hasProjectAccess && allowed && !["ADMIN", "DIRECTOR", "DEPUTY_DIRECTOR"].includes(scenario.userRole);
      const result = viewerMutationLeak || outsideLeak ? "FAIL" : "PASS";
      console.log([
        scenario.label,
        scenario.projectRole ?? "N/A",
        module,
        action,
        visible(Boolean(allowed)),
        `${source} (${result})`,
      ].join(" | "));
      if (result === "FAIL") process.exitCode = 1;
    }
  }
}

main();
