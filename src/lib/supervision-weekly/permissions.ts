import { UserRole } from "@prisma/client";
import { canAccessSupervisionProject, isCompanyWideUser } from "@/lib/rbac";

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
  return role === "SUPERVISION_HEAD" || isCompanyWideUser({ role });
}

export function canReviewSupervisionWeekly(role: UserRole) {
  return isCompanyWideUser({ role });
}

export async function assertSupervisionProjectScope(actor: { id: string; role: UserRole }, projectId: string | null | undefined) {
  if (!projectId || isCompanyWideUser(actor)) return;
  if (!await canAccessSupervisionProject(actor, projectId)) {
    throw new Error("Bạn không có quyền sử dụng công trình này trong phạm vi giám sát.");
  }
}
