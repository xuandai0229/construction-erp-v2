import { resolveAIRequestContext } from "../context/ai-context-resolver";
import { projectScopeAllows } from "@/lib/rbac";
import { getPendingConfirmation, PendingAIConfirmation } from "./confirmation-state";

export interface TOCTOUValidationResult {
  valid: boolean;
  reason?: string;
  confirmation?: PendingAIConfirmation;
}

/**
 * Validates a pending confirmation against current runtime state (TOCTOU protection).
 *
 * Checks:
 * 1. Confirmation token exists and is PENDING.
 * 2. Token is not expired.
 * 3. User session is currently active and valid.
 * 4. User still has the required role (permission wasn't revoked).
 * 5. User still has access to the target project (membership wasn't removed).
 */
export async function validateConfirmationTOCTOU(params: {
  confirmationToken: string;
  executingUserId: string;
}): Promise<TOCTOUValidationResult> {
  const confirmation = getPendingConfirmation(params.confirmationToken);

  if (!confirmation) {
    return {
      valid: false,
      reason: "Mã xác nhận không tồn tại hoặc đã bị hủy (CONFIRMATION_NOT_FOUND).",
    };
  }

  if (confirmation.status === "EXPIRED" || Date.now() > confirmation.expiresAt) {
    return {
      valid: false,
      reason: "Yêu cầu xác nhận đã hết hạn (CONFIRMATION_EXPIRED).",
    };
  }

  if (confirmation.status !== "PENDING") {
    return {
      valid: false,
      reason: `Yêu cầu xác nhận đã ở trạng thái ${confirmation.status} (CONFIRMATION_ALREADY_PROCESSED).`,
    };
  }

  // Re-resolve current live context for the executing user
  const liveContext = await resolveAIRequestContext({
    explicitUser: { id: params.executingUserId } as any,
  });

  if (!liveContext) {
    return {
      valid: false,
      reason: "Người dùng thực hiện xác nhận không hợp lệ hoặc đã bị vô hiệu hóa (USER_INACTIVE_OR_REVOKED).",
    };
  }

  // Re-check role
  if (!confirmation.requiredRole.includes(liveContext.role)) {
    return {
      valid: false,
      reason: "Vai trò hiện tại của bạn không đủ quyền xác nhận thao tác này (ROLE_REVOKED_SINCE_PROPOSAL).",
    };
  }

  // Re-check project scope if applicable
  if (confirmation.projectId) {
    const isAllowed = projectScopeAllows(liveContext.projectScope, confirmation.projectId);
    if (!isAllowed) {
      return {
        valid: false,
        reason: `Bạn không còn quyền truy cập công trình (${confirmation.projectId}) (PROJECT_ACCESS_REVOKED).`,
      };
    }
  }

  return {
    valid: true,
    confirmation,
  };
}
