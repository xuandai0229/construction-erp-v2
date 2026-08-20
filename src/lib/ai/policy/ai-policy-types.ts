import { UserRole } from "@prisma/client";
import { AIRiskLevel } from "../types";

export type ToolPolicyType =
  | "AUTO_READ"
  | "CONFIRM_WRITE"
  | "ADMIN_CONFIRM"
  | "FORBIDDEN";

export interface ToolPolicyRule {
  toolName: string;
  allowedRoles?: UserRole[];
  policyType: ToolPolicyType;
  riskLevel: AIRiskLevel;
  requiresProjectScope: boolean;
  maxLimit?: number;
  description: string;
}
