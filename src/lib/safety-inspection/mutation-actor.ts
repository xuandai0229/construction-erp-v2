import type { SafetyPermission } from "./permissions";
import { safetyProjectScopeAllows } from "./permissions";
import type { SafetyProjectScope } from "./types";

/**
 * Chỉ được tạo từ session + role/membership lookup tại server boundary.
 * Không map trực tiếp object do client gửi vào kiểu này.
 */
export type SafetyServerActor = {
  id: string;
  permissions: ReadonlySet<SafetyPermission>;
  projectScope: SafetyProjectScope;
  isCommandActor: boolean;
  unitNames: readonly string[];
};

export function assertSafetyActorPermission(
  actor: SafetyServerActor,
  permission: SafetyPermission,
): void {
  if (!actor.permissions.has(permission)) {
    throw new Error("Bạn không có quyền thực hiện thao tác ATLĐ này.");
  }
}

export function assertSafetyActorProjectScope(
  actor: SafetyServerActor,
  projectId: string,
): void {
  if (!safetyProjectScopeAllows(actor.projectScope, projectId)) {
    throw new Error("Công trình không thuộc phạm vi ATLĐ được phép.");
  }
}
