import { UserRole } from "@prisma/client";
import { applyProjectSummaryFieldPolicy, ProjectSummaryRawData, ProjectSummaryRoleSafeDTO } from "./project-summary-policy";
import { applyPendingItemsFieldPolicy, PendingItemRawData, PendingItemRoleSafeDTO } from "./pending-items-policy";
import { applyMaterialFieldPolicy, MaterialItemRawData, MaterialItemRoleSafeDTO } from "./material-policy";
import { applyReportFieldPolicy, FieldReportRawData, FieldReportRoleSafeDTO } from "./report-policy";

export interface FieldPolicyContext {
  userId: string;
  role: UserRole;
  projectScope: { kind: "ALL_PROJECTS" } | { kind: "PROJECT_IDS"; projectIds: string[] } | { kind: "NO_PROJECTS" };
}

/**
 * Centralized Field-Level Authorization Policy Engine
 *
 * Enforces "Authorization Parity":
 * Data Pipeline: Tool Query (Prisma SELECT) -> Field Policy -> Role-Safe DTO (Omitted Keys) -> Sanitizer -> LLM
 *
 * Rules:
 * 1. Unauthorized fields are completely omitted from the object (never returned as null or undefined).
 * 2. Field permissions are derived strictly from Server RBAC and Business Authorization.
 */
export class AIFieldPolicyEngine {
  static filterProjectSummary(raw: ProjectSummaryRawData, context: FieldPolicyContext): ProjectSummaryRoleSafeDTO {
    return applyProjectSummaryFieldPolicy(raw, context);
  }

  static filterPendingItems(rawItems: PendingItemRawData[], context: FieldPolicyContext): PendingItemRoleSafeDTO[] {
    return applyPendingItemsFieldPolicy(rawItems, context);
  }

  static filterMaterials(rawItems: MaterialItemRawData[], context: FieldPolicyContext): MaterialItemRoleSafeDTO[] {
    return applyMaterialFieldPolicy(rawItems, context);
  }

  static filterReports(rawReports: FieldReportRawData[], context: FieldPolicyContext): FieldReportRoleSafeDTO[] {
    return applyReportFieldPolicy(rawReports, context);
  }
}
