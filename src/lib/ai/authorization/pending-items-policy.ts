import { FieldPolicyContext } from "./ai-field-policy";
import { projectScopeAllows } from "@/lib/rbac";

export interface PendingItemRawData {
  id: string;
  category: "APPROVAL_REQUEST" | "SITE_REPORT_REVIEW" | "MATERIAL_PROPOSAL" | "SUPERVISION_INSPECTION";
  title: string;
  projectId: string;
  projectCode?: string;
  projectName?: string;
  status: string;
  createdAt: Date;
  requesterId?: string;
  requesterName?: string;
  assigneeId?: string;
}

export interface PendingItemRoleSafeDTO {
  id: string;
  category: string;
  title: string;
  projectCode?: string;
  projectName?: string;
  status: string;
  createdAt: string;
  requesterName?: string;
}

/**
 * Applies Explicit Semantic Scope Authorization for Pending Items across all 9 canonical roles
 *
 * 1. ADMIN, DIRECTOR, DEPUTY_DIRECTOR: Company-wide pending approval items.
 * 2. CHIEF_COMMANDER: Project approval requests, site report reviews & material proposals for assigned projects.
 * 3. MANAGER: Project approval requests & material proposals for assigned projects.
 * 4. SUPERVISION_HEAD: Supervision inspections & site report reviews for projects in supervision scope.
 * 5. CONSTRUCTION_SUPERVISOR: Supervision inspections & site report reviews.
 * 6. ENGINEER: Personal items + project material proposals for assigned projects.
 * 7. STAFF: Strictly personal items (created by or assigned to self).
 */
export function applyPendingItemsFieldPolicy(
  rawItems: PendingItemRawData[],
  context: FieldPolicyContext
): PendingItemRoleSafeDTO[] {
  const isCompanyWide = ["ADMIN", "DIRECTOR", "DEPUTY_DIRECTOR"].includes(context.role);

  return rawItems
    .filter((item) => {
      // 1. Company-wide executives see all pending items within system
      if (isCompanyWide) return true;

      // 2. Cross-project scope gate
      if (!projectScopeAllows(context.projectScope, item.projectId)) {
        return false;
      }

      // 3. Explicit Role-based semantic filtering (All 9 roles explicitly defined)
      switch (context.role) {
        case "CHIEF_COMMANDER":
          return (
            item.category === "APPROVAL_REQUEST" ||
            item.category === "SITE_REPORT_REVIEW" ||
            item.category === "MATERIAL_PROPOSAL"
          );

        case "MANAGER":
          return (
            item.category === "APPROVAL_REQUEST" ||
            item.category === "MATERIAL_PROPOSAL" ||
            item.requesterId === context.userId
          );

        case "SUPERVISION_HEAD":
        case "CONSTRUCTION_SUPERVISOR":
          return (
            item.category === "SITE_REPORT_REVIEW" ||
            item.category === "SUPERVISION_INSPECTION" ||
            item.requesterId === context.userId
          );

        case "ENGINEER":
          return (
            item.requesterId === context.userId ||
            item.category === "MATERIAL_PROPOSAL"
          );

        case "STAFF":
          return (
            item.requesterId === context.userId ||
            item.assigneeId === context.userId
          );

        default:
          return item.requesterId === context.userId;
      }
    })
    .map((item) => {
      const dto: PendingItemRoleSafeDTO = {
        id: item.id,
        category: item.category,
        title: item.title,
        status: item.status,
        createdAt: item.createdAt.toISOString(),
      };
      if (item.projectCode) dto.projectCode = item.projectCode;
      if (item.projectName) dto.projectName = item.projectName;
      if (item.requesterName) dto.requesterName = item.requesterName;
      return dto;
    });
}
