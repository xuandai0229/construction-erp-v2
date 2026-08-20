import { UserRole } from "@prisma/client";
import { FieldPolicyContext } from "./ai-field-policy";

export interface ProjectSummaryRawData {
  id: string;
  code: string;
  name: string;
  displayName: string | null;
  status: string;
  location: string | null;
  startDate: Date | null;
  endDate: Date | null;
  budget: any; // Decimal / BigInt / String from DB
  _count?: {
    members: number;
    siteReports: number;
    documents: number;
    materialItems: number;
  };
}

export interface ProjectSummaryRoleSafeDTO {
  id: string;
  code: string;
  name: string;
  displayName?: string;
  status: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  budget?: string; // OMITTED for non-financial roles
  stats: {
    activeMembersCount: number;
    siteReportsCount: number;
    documentsCount: number;
    materialsCount: number;
  };
}

// Roles permitted to access financial budget figures
const FINANCIAL_BUDGET_ROLES: UserRole[] = [
  "ADMIN",
  "DIRECTOR",
  "DEPUTY_DIRECTOR",
  "CHIEF_COMMANDER", // Chief commander manages project operational budget
];

/**
 * Applies Field-level Authorization Policy for Project Summary
 *
 * Enforces:
 * - If role in FINANCIAL_BUDGET_ROLES: `budget` string is included.
 * - Otherwise (STAFF, ENGINEER, CONSTRUCTION_SUPERVISOR, MANAGER): `budget` key is completely OMITTED.
 */
export function applyProjectSummaryFieldPolicy(
  raw: ProjectSummaryRawData,
  context: FieldPolicyContext
): ProjectSummaryRoleSafeDTO {
  const baseDTO: ProjectSummaryRoleSafeDTO = {
    id: raw.id,
    code: raw.code,
    name: raw.name,
    status: raw.status,
    stats: {
      activeMembersCount: raw._count?.members || 0,
      siteReportsCount: raw._count?.siteReports || 0,
      documentsCount: raw._count?.documents || 0,
      materialsCount: raw._count?.materialItems || 0,
    },
  };

  if (raw.displayName) baseDTO.displayName = raw.displayName;
  if (raw.location) baseDTO.location = raw.location;
  if (raw.startDate) baseDTO.startDate = raw.startDate.toISOString();
  if (raw.endDate) baseDTO.endDate = raw.endDate.toISOString();

  // Field Authorization: Budget
  if (FINANCIAL_BUDGET_ROLES.includes(context.role) && raw.budget !== undefined && raw.budget !== null) {
    baseDTO.budget = raw.budget.toString();
  }
  // For unauthorized roles, baseDTO.budget remains undefined and will be omitted by JSON serializer

  return baseDTO;
}
