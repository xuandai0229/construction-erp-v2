import { resolveAIRequestContext, AIContextResolveOptions } from "../context/ai-context-resolver";
import { evaluateAIPolicy } from "../policy/ai-policy-engine";
import { getRegisteredTool } from "../registry/ai-tool-registry";
import { validateToolInput } from "./input-validator";
import { sanitizeToolOutput } from "./output-sanitizer";
import { logAIAuditEvent } from "../audit/ai-audit-logger";
import { createPendingConfirmation } from "../confirmations/confirmation-state";
import { AIToolExecutionResult, AIRequestContext } from "../types";

export interface ExecuteToolGatewayOptions {
  toolName: string;
  input: unknown;
  contextOptions?: AIContextResolveOptions;
  explicitContext?: AIRequestContext; // For mock/test injection
  aiRunId?: string;
  conversationId?: string;
  toolCallId?: string;
}

/**
 * AI Tool Gateway
 *
 * The authoritative backend security perimeter for all AI tool executions.
 *
 * Security Guarantees:
 * - Fail closed on any missing auth, invalid input, policy denial, or scope violation.
 * - AI cannot run arbitrary database queries or unexposed Prisma methods.
 * - All outputs sanitized and stripped of sensitive data / PII.
 * - Comprehensive forensic audit logging on every attempt.
 */
export async function executeAIToolGateway<T = any>(
  options: ExecuteToolGatewayOptions
): Promise<AIToolExecutionResult<T>> {
  const startTime = Date.now();
  const { toolName, input, contextOptions, explicitContext, aiRunId, conversationId, toolCallId } = options;

  // 1. Tool Registration Guard
  const tool = getRegisteredTool(toolName);
  if (!tool) {
    const durationMs = Date.now() - startTime;
    const errorMsg = `Công cụ '${toolName}' không tồn tại hoặc chưa được đăng ký trong hệ thống AI (TOOL_NOT_REGISTERED).`;

    // Attempt best-effort audit
    await logAIAuditEvent({
      eventType: "TOOL_EXECUTION",
      aiRunId,
      conversationId,
      toolCallId,
      requestId: contextOptions?.requestId || "unknown",
      userId: explicitContext?.userId || "anonymous",
      role: explicitContext?.role || ("STAFF" as any),
      toolName,
      toolVersion: "unknown",
      operation: "READ",
      riskLevel: "SECURITY_ADMIN",
      policyDecision: "DENY",
      confirmationRequired: false,
      rawInput: input,
      executionStatus: "REJECTED",
      errorCode: "TOOL_NOT_REGISTERED",
      durationMs,
      modelProvider: null,
      modelName: null,
    });

    return {
      success: false,
      toolName,
      policyDecision: "DENY",
      error: {
        code: "TOOL_NOT_REGISTERED",
        message: errorMsg,
      },
      durationMs,
    };
  }

  // 2. Input Schema Validation
  const validation = validateToolInput(tool.inputSchema, input);
  if (!validation.success) {
    const durationMs = Date.now() - startTime;
    const errorMsg = validation.error || "Tham số đầu vào không hợp lệ.";

    await logAIAuditEvent({
      eventType: "TOOL_EXECUTION",
      aiRunId,
      conversationId,
      toolCallId,
      requestId: contextOptions?.requestId || "unknown",
      userId: explicitContext?.userId || "anonymous",
      role: explicitContext?.role || ("STAFF" as any),
      toolName,
      toolVersion: tool.version,
      operation: tool.operation,
      riskLevel: tool.riskLevel,
      policyDecision: "DENY",
      confirmationRequired: false,
      rawInput: input,
      executionStatus: "REJECTED",
      errorCode: "TOOL_INPUT_INVALID",
      durationMs,
      modelProvider: null,
      modelName: null,
    });

    return {
      success: false,
      toolName,
      policyDecision: "DENY",
      error: {
        code: "TOOL_INPUT_INVALID",
        message: errorMsg,
        details: validation.fieldErrors,
      },
      durationMs,
    };
  }

  const validatedInput = validation.data as Record<string, unknown>;

  // 3. Resolve Authoritative Server-side Identity & Scope
  const context: AIRequestContext | null =
    explicitContext || (await resolveAIRequestContext(contextOptions));

  if (!context) {
    const durationMs = Date.now() - startTime;
    const errorMsg = "Yêu cầu bị từ chối: Phiên đăng nhập không tồn tại hoặc tài khoản bị khóa (UNAUTHENTICATED).";

    await logAIAuditEvent({
      eventType: "TOOL_EXECUTION",
      aiRunId,
      conversationId,
      toolCallId,
      requestId: contextOptions?.requestId || "unknown",
      userId: "anonymous",
      role: "STAFF" as any,
      toolName,
      toolVersion: tool.version,
      operation: tool.operation,
      riskLevel: tool.riskLevel,
      policyDecision: "DENY",
      confirmationRequired: false,
      rawInput: validatedInput,
      executionStatus: "REJECTED",
      errorCode: "UNAUTHENTICATED",
      durationMs,
      modelProvider: null,
      modelName: null,
    });

    return {
      success: false,
      toolName,
      policyDecision: "DENY",
      error: {
        code: "UNAUTHENTICATED",
        message: errorMsg,
      },
      durationMs,
    };
  }

  // 4. Policy Engine Evaluation (Fail Closed)
  const targetProjectId = typeof (validatedInput as any)?.projectId === "string" ? ((validatedInput as any).projectId as string) : undefined;

  const policyResult = evaluateAIPolicy({
    toolName,
    input: validatedInput,
    context,
    targetProjectId,
  });

  // 5. Handle Policy Denials
  if (policyResult.decision === "DENY") {
    const durationMs = Date.now() - startTime;

    await logAIAuditEvent({
      eventType: "TOOL_EXECUTION",
      aiRunId,
      conversationId,
      toolCallId,
      requestId: context.requestId,
      userId: context.userId,
      role: context.role,
      projectId: targetProjectId,
      toolName,
      toolVersion: tool.version,
      operation: tool.operation,
      riskLevel: tool.riskLevel,
      policyDecision: "DENY",
      confirmationRequired: false,
      rawInput: validatedInput,
      executionStatus: "REJECTED",
      errorCode: "POLICY_DENIED",
      durationMs,
      modelProvider: null,
      modelName: null,
    });

    return {
      success: false,
      toolName,
      policyDecision: "DENY",
      error: {
        code: "POLICY_DENIED",
        message: policyResult.reason,
      },
      durationMs,
    };
  }

  // 6. Handle Human Confirmation Requirement (Write tools)
  if (policyResult.decision === "CONFIRM") {
    const confirmation = createPendingConfirmation({
      userId: context.userId,
      requiredRole: tool.requiredRole || [context.role],
      projectId: targetProjectId,
      toolName,
      proposedInput: validatedInput,
    });

    const durationMs = Date.now() - startTime;

    await logAIAuditEvent({
      eventType: "AI_PROPOSED_ACTION",
      aiRunId,
      conversationId,
      toolCallId,
      requestId: context.requestId,
      userId: context.userId,
      role: context.role,
      projectId: targetProjectId,
      toolName,
      toolVersion: tool.version,
      operation: tool.operation,
      riskLevel: tool.riskLevel,
      policyDecision: "CONFIRM",
      confirmationRequired: true,
      rawInput: validatedInput,
      executionStatus: "PENDING_CONFIRMATION",
      durationMs,
      modelProvider: null,
      modelName: null,
    });

    return {
      success: false,
      toolName,
      policyDecision: "CONFIRM",
      data: {
        confirmationRequired: true,
        confirmationToken: confirmation.confirmationToken,
        expiresAt: confirmation.expiresAt,
        message: policyResult.reason,
        proposedAction: {
          toolName,
          parameters: validatedInput,
        },
      } as any,
      durationMs,
    };
  }

  // 7. Execute Domain Tool (AUTO_READ allowed)
  try {
    const rawResult = await tool.execute(validatedInput, context);
    const sanitizedData = sanitizeToolOutput(rawResult);
    const durationMs = Date.now() - startTime;

    const auditRecord = await logAIAuditEvent({
      eventType: "TOOL_EXECUTION",
      aiRunId,
      conversationId,
      toolCallId,
      requestId: context.requestId,
      userId: context.userId,
      role: context.role,
      projectId: targetProjectId,
      toolName,
      toolVersion: tool.version,
      operation: tool.operation,
      riskLevel: tool.riskLevel,
      policyDecision: "ALLOW",
      confirmationRequired: false,
      rawInput: validatedInput,
      outputSummary: `Returned ${Array.isArray(sanitizedData) ? `${sanitizedData.length} records` : "object"}`,
      executionStatus: "SUCCESS",
      durationMs,
      modelProvider: null,
      modelName: null,
    });

    return {
      success: true,
      toolName,
      policyDecision: "ALLOW",
      data: sanitizedData,
      durationMs,
      aiAuditId: auditRecord.id,
    };
  } catch (err: any) {
    const durationMs = Date.now() - startTime;
    const errorMessage = err?.message || "Lỗi thực thi công cụ trong service layer.";

    await logAIAuditEvent({
      eventType: "TOOL_EXECUTION",
      aiRunId,
      conversationId,
      toolCallId,
      requestId: context.requestId,
      userId: context.userId,
      role: context.role,
      projectId: targetProjectId,
      toolName,
      toolVersion: tool.version,
      operation: tool.operation,
      riskLevel: tool.riskLevel,
      policyDecision: "ALLOW",
      confirmationRequired: false,
      rawInput: validatedInput,
      executionStatus: "FAILED",
      errorCode: "TOOL_EXECUTION_ERROR",
      durationMs,
      modelProvider: null,
      modelName: null,
    });

    return {
      success: false,
      toolName,
      policyDecision: "ALLOW",
      error: {
        code: "TOOL_EXECUTION_ERROR",
        message: errorMessage,
      },
      durationMs,
    };
  }
}
