import { projectScopeAllows } from "@/lib/rbac";
import { AIPolicyDecision, AIRequestContext } from "../types";
import { AI_TOOL_POLICY_RULES } from "./ai-policy-rules";

export interface PolicyEvaluationParams {
  toolName: string;
  input: Record<string, unknown>;
  context: AIRequestContext | null;
  targetProjectId?: string;
  resourceOwnerProjectId?: string;
}

/**
 * AI Policy Engine (Fail Closed)
 *
 * Implements strict, mathematical enforcement of security rules before any tool
 * can be executed.
 */
export function evaluateAIPolicy(params: PolicyEvaluationParams): AIPolicyDecision {
  const { toolName, input, context, targetProjectId, resourceOwnerProjectId } = params;

  // 1. Context / Identity Guard
  if (!context || !context.userId || !context.role) {
    return {
      decision: "DENY",
      reason: "Yêu cầu bị từ chối: Phiên làm việc không hợp lệ hoặc chưa được xác thực (UNAUTHENTICATED).",
    };
  }

  // 2. Tool Registration Guard
  const rule = AI_TOOL_POLICY_RULES[toolName];
  if (!rule) {
    return {
      decision: "DENY",
      reason: `Yêu cầu bị từ chối: Công cụ '${toolName}' không tồn tại trong danh mục AI được cấp phép (TOOL_NOT_REGISTERED).`,
    };
  }

  // 3. Explicit Prohibition Guard
  if (rule.policyType === "FORBIDDEN") {
    return {
      decision: "DENY",
      reason: `Yêu cầu bị từ chối: Công cụ '${toolName}' bị nghiêm cấm đối với AI (TOOL_FORBIDDEN).`,
    };
  }

  // 4. Role Guard
  if (rule.allowedRoles && rule.allowedRoles.length > 0) {
    if (!rule.allowedRoles.includes(context.role)) {
      return {
        decision: "DENY",
        reason: `Yêu cầu bị từ chối: Vai trò '${context.role}' không có quyền sử dụng công cụ '${toolName}' (ROLE_UNAUTHORIZED).`,
      };
    }
  }

  // 5. Project Scope Guard
  const effectiveProjectId =
    targetProjectId ||
    (typeof input?.projectId === "string" ? input.projectId : undefined);

  if (rule.requiresProjectScope) {
    if (!effectiveProjectId) {
      return {
        decision: "DENY",
        reason: `Yêu cầu bị từ chối: Công cụ '${toolName}' bắt buộc phải cung cấp mã công trình (projectId) hợp lệ (PROJECT_ID_REQUIRED).`,
      };
    }

    const isScopeAllowed = projectScopeAllows(context.projectScope, effectiveProjectId);
    if (!isScopeAllowed) {
      return {
        decision: "DENY",
        reason: `Yêu cầu bị từ chối: Bạn không có quyền truy cập dữ liệu của công trình (${effectiveProjectId}) (PROJECT_SCOPE_DENIED).`,
      };
    }
  } else if (effectiveProjectId) {
    // Even if not strictly required, if projectId is passed, check it
    const isScopeAllowed = projectScopeAllows(context.projectScope, effectiveProjectId);
    if (!isScopeAllowed) {
      return {
        decision: "DENY",
        reason: `Yêu cầu bị từ chối: Bạn không có quyền truy cập dữ liệu của công trình (${effectiveProjectId}) (PROJECT_SCOPE_DENIED).`,
      };
    }
  }

  // 6. Resource Ownership Cross-Project Guard
  if (resourceOwnerProjectId) {
    const isResourceScopeAllowed = projectScopeAllows(
      context.projectScope,
      resourceOwnerProjectId
    );
    if (!isResourceScopeAllowed) {
      return {
        decision: "DENY",
        reason: `Yêu cầu bị từ chối: Tài nguyên yêu cầu thuộc về công trình (${resourceOwnerProjectId}) mà bạn không có quyền truy cập (CROSS_PROJECT_RESOURCE_DENIED).`,
      };
    }
  }

  // 7. Policy Type & Confirmation Routing
  if (rule.policyType === "AUTO_READ") {
    return {
      decision: "ALLOW",
      reason: "Hợp lệ: Công cụ đọc an toàn được cấp phép theo phân quyền người dùng (AUTO_READ_ALLOWED).",
    };
  }

  if (rule.policyType === "CONFIRM_WRITE") {
    return {
      decision: "CONFIRM",
      requiredConfirmationType: "USER_CONFIRM",
      reason: "Yêu cầu xác nhận: Thao tác ghi dữ liệu bắt buộc phải có sự xác nhận của người dùng (HUMAN_CONFIRMATION_REQUIRED).",
    };
  }

  if (rule.policyType === "ADMIN_CONFIRM") {
    return {
      decision: "CONFIRM",
      requiredConfirmationType: "ADMIN_CONFIRM",
      reason: "Yêu cầu xác nhận: Thao tác cấp cao bắt buộc phải có sự phê duyệt của Quản trị viên (ADMIN_CONFIRMATION_REQUIRED).",
    };
  }

  // Default fallback -> DENY (Fail closed)
  return {
    decision: "DENY",
    reason: "Yêu cầu bị từ chối theo chính sách mặc định (DEFAULT_DENY).",
  };
}
