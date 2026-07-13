import { getAccountingPermissions } from "../src/lib/accounting/accounting-permissions";
import { canApproveByRequestType } from "../src/lib/approvals/approval-policy";
import { getContractPermissions } from "../src/lib/contracts/contracts-permissions";
import { canCreateFolder, canUploadToFolder } from "../src/lib/documents/permissions";
import { getFieldProgressPermissions } from "../src/lib/field-progress/field-progress-permissions";
import { getMaterialPermissions } from "../src/lib/materials/materials-permissions";
import { canCreateReport } from "../src/lib/reports/report-workflow-policy";

const viewerCases = [
  { label: "ACCOUNTANT + VIEWER", userRole: "ACCOUNTANT" as const },
  { label: "STAFF + VIEWER", userRole: "STAFF" as const },
];

function main() {
  console.log("=== RBAC VIEWER MUTATION BLOCK AUDIT ===");
  console.log("Case | Mutation surface | Allowed | Result");

  let failed = 0;
  for (const item of viewerCases) {
    const material = getMaterialPermissions(item.userRole, "VIEWER");
    const accounting = getAccountingPermissions(item.userRole, "VIEWER");
    const contract = getContractPermissions(item.userRole, "VIEWER");
    const progress = getFieldProgressPermissions(item.userRole, "VIEWER");
    const documentUser = { id: "viewer", role: item.userRole, projectRole: "VIEWER" as const };
    const surfaces = [
      ["materials create/update/delete/restore/import/export/approve", material.canCreate || material.canUpdate || material.canDelete || material.canRestore || material.canImport || material.canExport || material.canApproveRequest],
      ["documents create folder/upload", canCreateFolder(documentUser) || canUploadToFolder(documentUser, { id: "folder", name: "ho so thanh toan" })],
      ["reports create", canCreateReport({ id: "viewer", role: item.userRole }, true)],
      ["contracts create/update/delete", contract.canCreate || contract.canUpdate || contract.canDelete],
      ["payments create/update/delete/mark paid/approve", accounting.canCreate || accounting.canUpdate || accounting.canDelete || accounting.canMarkPaid || accounting.canApprove],
      ["approval payment/material/report/contract", canApproveByRequestType({ userRole: item.userRole, projectRole: "VIEWER", requestType: "PAYMENT", actorId: "viewer", requesterId: "other" }) || canApproveByRequestType({ userRole: item.userRole, projectRole: "VIEWER", requestType: "MATERIAL", actorId: "viewer", requesterId: "other" }) || canApproveByRequestType({ userRole: item.userRole, projectRole: "VIEWER", requestType: "REPORT", actorId: "viewer", requesterId: "other" }) || canApproveByRequestType({ userRole: item.userRole, projectRole: "VIEWER", requestType: "CONTRACT", actorId: "viewer", requesterId: "other" })],
      ["field progress update/approve/lock", progress.canUpdateProgress || progress.canApproveProgress || progress.canLockProgress],
    ] as const;

    for (const [surface, allowed] of surfaces) {
      const result = allowed ? "FAIL" : "PASS";
      if (allowed) failed += 1;
      console.log(`${item.label} | ${surface} | ${allowed ? "YES" : "NO"} | ${result}`);
    }
  }

  if (failed > 0) {
    throw new Error(`Viewer mutation block audit failed: ${failed} surface(s).`);
  }
}

main();
