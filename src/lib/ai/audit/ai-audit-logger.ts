import { randomUUID } from "node:crypto";
import { AIAuditRecord } from "./ai-audit-types";
import { sanitizeAuditPayload } from "./ai-audit-sanitizer";
import { writeAuditLog } from "@/lib/audit";

// In-memory buffer for high-speed audit retrieval and testing
const aiAuditMemoryStore: AIAuditRecord[] = [];
const MAX_MEMORY_LOGS = 1000;

export async function logAIAuditEvent(
  record: Omit<AIAuditRecord, "id" | "createdAt" | "inputSanitized"> & {
    rawInput: unknown;
  }
): Promise<AIAuditRecord> {
  const auditRecord: AIAuditRecord = {
    id: randomUUID(),
    eventType: record.eventType,
    aiRunId: record.aiRunId,
    conversationId: record.conversationId,
    toolCallId: record.toolCallId,
    requestId: record.requestId,
    userId: record.userId,
    role: record.role,
    projectId: record.projectId,
    toolName: record.toolName,
    toolVersion: record.toolVersion,
    operation: record.operation,
    riskLevel: record.riskLevel,
    policyDecision: record.policyDecision,
    confirmationRequired: record.confirmationRequired,
    confirmedBy: record.confirmedBy,
    confirmedAt: record.confirmedAt,
    inputSanitized: sanitizeAuditPayload(record.rawInput),
    outputSummary: record.outputSummary,
    executionStatus: record.executionStatus,
    errorCode: record.errorCode,
    failureCategory: record.failureCategory,
    durationMs: record.durationMs,
    modelProvider: record.modelProvider || null,
    modelName: record.modelName || null,
    promptTokens: record.promptTokens,
    completionTokens: record.completionTokens,
    estimatedCostUsd: record.estimatedCostUsd,
    userFeedback: record.userFeedback,
    createdAt: new Date().toISOString(),
  };

  // Keep in memory ring buffer
  aiAuditMemoryStore.push(auditRecord);
  if (aiAuditMemoryStore.length > MAX_MEMORY_LOGS) {
    aiAuditMemoryStore.shift();
  }

  // Also write to core sanitized system audit log if database is active
  try {
    await writeAuditLog({
      userId: record.userId,
      action: `AI_${record.eventType}_${record.toolName}`,
      entityType: "AI_TOOL_EXECUTION",
      entityId: auditRecord.id,
      projectId: record.projectId,
      beforeData: null,
      afterData: {
        toolName: record.toolName,
        role: record.role,
        policyDecision: record.policyDecision,
        executionStatus: record.executionStatus,
        failureCategory: record.failureCategory,
        durationMs: record.durationMs,
        errorCode: record.errorCode,
        input: auditRecord.inputSanitized,
      },
    });
  } catch {
    // Non-blocking in decoupled/test contexts
  }

  return auditRecord;
}

export function getAIAuditRecords(): AIAuditRecord[] {
  return [...aiAuditMemoryStore];
}

export function clearAIAuditRecords(): void {
  aiAuditMemoryStore.length = 0;
}
