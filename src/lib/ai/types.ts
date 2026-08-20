import { UserRole } from "@prisma/client";
import { ProjectAccessScope } from "@/lib/rbac";

export type AIRiskLevel =
  | "READ_SAFE"
  | "READ_SENSITIVE"
  | "DRAFT_WRITE"
  | "HIGH_RISK_WRITE"
  | "DESTRUCTIVE"
  | "SECURITY_ADMIN";

export type AIPolicyDecisionKind = "ALLOW" | "CONFIRM" | "DENY";

export interface AIPolicyDecision {
  decision: AIPolicyDecisionKind;
  reason: string;
  requiredConfirmationType?: "USER_CONFIRM" | "ADMIN_CONFIRM";
  sanitizedInput?: Record<string, unknown>;
}

export interface AIRequestContext {
  userId: string;
  role: UserRole;
  sessionId?: string;
  projectScope: ProjectAccessScope;
  allowedProjectIds?: string[];
  activeProjectId?: string;
  requestId: string;
  userEmail?: string;
  userName?: string;
}

export interface AIToolDefinition<TInput = any, TOutput = any> {
  name: string;
  version: string;
  description: string;
  riskLevel: AIRiskLevel;
  operation: "READ" | "WRITE" | "DELETE" | "ADMIN";
  aiAllowed: boolean;
  requiredRole?: UserRole[];
  requiresProjectScopeCheck: boolean;
  inputSchema: any; // Zod schema
  execute: (input: TInput, context: AIRequestContext) => Promise<TOutput>;
}

export interface AIToolExecutionResult<T = any> {
  success: boolean;
  toolName: string;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  policyDecision: AIPolicyDecisionKind;
  durationMs: number;
  aiAuditId?: string;
}
