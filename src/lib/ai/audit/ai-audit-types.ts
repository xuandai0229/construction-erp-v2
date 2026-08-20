import { UserRole } from "@prisma/client";
import { AIPolicyDecisionKind, AIRiskLevel } from "../types";

export type AIAuditEventType =
  | "USER_REQUEST"
  | "AI_PROPOSED_ACTION"
  | "TOOL_EXECUTION"
  | "USER_FEEDBACK";

export type AIAuditStatus = "SUCCESS" | "REJECTED" | "FAILED" | "PENDING_CONFIRMATION";

/**
 * Phase 1C Operational Failure Taxonomy
 */
export type AIFailureCategory =
  | "MODEL_SELECTION_ERROR"
  | "TOOL_SELECTION_ERROR"
  | "TOOL_ARGUMENT_ERROR"
  | "PROJECT_RESOLUTION_ERROR"
  | "POLICY_DENIAL"
  | "PROVIDER_TIMEOUT"
  | "PROVIDER_RATE_LIMIT"
  | "GROUNDING_ERROR"
  | "UI_ERROR"
  | "UNKNOWN";

/**
 * Phase 1C Minimal User Feedback Types
 */
export type AIUserFeedbackType =
  | "HELPFUL" // Hữu ích
  | "UNHELPFUL" // Không hữu ích
  | "WRONG_DATA" // Sai dữ liệu
  | "MISSING_DATA" // Thiếu dữ liệu
  | "INCORRECT_PERMISSION" // Không đúng quyền
  | "OTHER"; // Khác

export interface AIAuditRecord {
  id: string;
  eventType: AIAuditEventType;
  aiRunId?: string;
  conversationId?: string;
  toolCallId?: string;
  requestId: string;

  userId: string;
  userAliasHash?: string;
  role: UserRole;
  projectId?: string;

  toolName: string;
  toolVersion: string;
  operation: "READ" | "WRITE" | "DELETE" | "ADMIN";
  riskLevel: AIRiskLevel;

  policyDecision: AIPolicyDecisionKind;

  confirmationRequired: boolean;
  confirmedBy?: string;
  confirmedAt?: string;

  inputSanitized: Record<string, unknown>;
  outputSummary?: string;

  executionStatus: AIAuditStatus;
  errorCode?: string;
  failureCategory?: AIFailureCategory;
  durationMs: number;

  modelProvider?: string | null;
  modelName?: string | null;
  providerRequestId?: string;
  providerHttpStatus?: number;
  remote?: boolean;
  mock?: boolean;
  promptVersion?: string;
  toolCalls?: string[];
  sourceCount?: number;

  promptTokens?: number;
  completionTokens?: number;
  estimatedCostUsd?: number;

  userFeedback?: {
    type: AIUserFeedbackType;
    comment?: string;
    submittedAt: string;
  };

  createdAt: string;
}
