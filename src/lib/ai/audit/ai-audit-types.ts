import { UserRole } from "@prisma/client";
import { AIPolicyDecisionKind, AIRiskLevel } from "../types";

export type AIAuditEventType =
  | "USER_REQUEST"
  | "AI_PROPOSED_ACTION"
  | "TOOL_EXECUTION";

export type AIAuditStatus = "SUCCESS" | "REJECTED" | "FAILED" | "PENDING_CONFIRMATION";

export interface AIAuditRecord {
  id: string;
  eventType: AIAuditEventType;
  aiRunId?: string;
  conversationId?: string;
  toolCallId?: string;
  requestId: string;

  userId: string;
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
  durationMs: number;

  modelProvider: string | null;
  modelName: string | null;

  createdAt: string;
}
