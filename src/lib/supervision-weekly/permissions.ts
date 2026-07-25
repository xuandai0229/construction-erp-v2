export type UserRole = string;

export type SupervisionWeeklyPermission =
  | "supervision.weekly.view"
  | "supervision.weekly.create"
  | "supervision.weekly.update"
  | "supervision.weekly.submit"
  | "supervision.weekly.review"
  | "supervision.weekly.export";

export const SUPERVISION_WEEKLY_PERMISSIONS: Record<SupervisionWeeklyPermission, string> = {
  "supervision.weekly.view": "Xem hồ sơ báo cáo tuần giám sát",
  "supervision.weekly.create": "Tạo hồ sơ báo cáo tuần giám sát",
  "supervision.weekly.update": "Sửa bản nháp báo cáo tuần giám sát",
  "supervision.weekly.submit": "Gửi hồ sơ báo cáo tuần giám sát",
  "supervision.weekly.review": "Yêu cầu chỉnh sửa, duyệt và khóa hồ sơ giám sát",
  "supervision.weekly.export": "Xem trước, in và xuất PDF hồ sơ giám sát",
};

export function canUseSupervisionWeekly(role: UserRole) {
  return role === "SUPERVISION_HEAD" || role === "ADMIN" || role === "DIRECTOR" || role === "DEPUTY_DIRECTOR";
}

export function canReviewSupervisionWeekly(role: UserRole) {
  return role === "ADMIN" || role === "DIRECTOR" || role === "DEPUTY_DIRECTOR";
}

export async function assertSupervisionProjectScope(actor: { id: string; role: UserRole }, projectId: string | null | undefined) {
  if (!projectId || actor.role === "ADMIN" || actor.role === "DIRECTOR" || actor.role === "DEPUTY_DIRECTOR") return;
  const { canAccessSupervisionProject } = await import("@/lib/rbac");
  if (!await canAccessSupervisionProject(actor as any, projectId)) {
    throw new Error("Bạn không có quyền sử dụng công trình này trong phạm vi giám sát.");
  }
}
