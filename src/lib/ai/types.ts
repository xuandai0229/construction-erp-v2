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

export type AIProviderMode =
  | "DEVELOPMENT_MOCK"
  | "PILOT_REMOTE"
  | "PRODUCTION_REMOTE";

export type AIDataCoverageStatus = "AVAILABLE" | "PARTIAL" | "NO_DATA" | "UNAVAILABLE";

export interface AIDataCoverage {
  status: AIDataCoverageStatus;
  summary: string;
  domains?: Record<string, AIDataCoverageStatus>;
}

export type AISourceType =
  | "PROJECT"
  | "FIELD_REPORT"
  | "MATERIAL_STOCK"
  | "APPROVAL"
  | "SYSTEM"
  | "DOCUMENT";

export interface AISource {
  sourceType: AISourceType;
  recordId: string;
  projectId?: string;
  title: string;
  route?: string;
  asOf: string;
  label: string;
}

export interface AIToolPayload<T> {
  data: T;
  asOf: string;
  coverage: AIDataCoverage;
  qualityFlags: string[];
  warnings: string[];
  sources: AISource[];
}

export interface AIUIContextCandidate {
  route?: string;
  module?: string;
  recordType?: string;
  recordId?: string;
  timezone?: string;
  locale?: string;
}

export interface AIPolicyDecision {
  decision: AIPolicyDecisionKind;
  reason: string;
  requiredConfirmationType?: "USER_CONFIRM" | "ADMIN_CONFIRM";
  sanitizedInput?: Record<string, unknown>;
}

export interface AIRequestContext {
  userId: string;
  role: UserRole;
  userRole?: string;
  sessionId?: string;
  projectScope: ProjectAccessScope;
  allowedProjectIds?: string[];
  activeProjectId?: string;
  activeProjectCode?: string;
  activeProjectName?: string;
  route?: string;
  module?: string;
  recordType?: string;
  recordId?: string;
  timezone?: string;
  locale?: string;
  effectiveTime?: string;
  conversationId?: string;
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
  asOf?: string;
  coverage?: AIDataCoverage;
  qualityFlags?: string[];
  warnings?: string[];
  sources?: AISource[];
}

export function isAIToolPayload<T>(value: unknown): value is AIToolPayload<T> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const candidate = value as Partial<AIToolPayload<T>>;
  return (
    "data" in candidate &&
    typeof candidate.asOf === "string" &&
    Boolean(candidate.coverage) &&
    Array.isArray(candidate.qualityFlags) &&
    Array.isArray(candidate.warnings) &&
    Array.isArray(candidate.sources)
  );
}
