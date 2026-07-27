import type { UserRole } from "@prisma/client";
import prisma from "../prisma";
import { writeSecurityAuditEvent } from "../audit";

export type WeeklyDossierState = "DRAFT" | "SUBMITTED" | "REVISION_REQUIRED" | "APPROVED" | "LOCKED";
export type WeeklyDossierPolicyResource = { createdById: string; status: WeeklyDossierState };

export type SupervisionWeeklyPermission =
  | "supervision.weekly.view"
  | "supervision.weekly.create"
  | "supervision.weekly.update"
  | "supervision.weekly.delete"
  | "supervision.weekly.submit"
  | "supervision.weekly.review"
  | "supervision.weekly.preview"
  | "supervision.weekly.export";

export const SUPERVISION_WEEKLY_PERMISSIONS: Record<SupervisionWeeklyPermission, string> = {
  "supervision.weekly.view": "Xem hồ sơ báo cáo tuần giám sát",
  "supervision.weekly.create": "Tạo hồ sơ báo cáo tuần giám sát",
  "supervision.weekly.update": "Sửa hồ sơ tuần của chính mình theo trạng thái",
  "supervision.weekly.delete": "Xóa hồ sơ tuần theo chính sách vai trò và trạng thái",
  "supervision.weekly.submit": "Gửi hoặc gửi lại hồ sơ tuần của chính mình",
  "supervision.weekly.review": "Yêu cầu chỉnh sửa, duyệt và khóa hồ sơ giám sát",
  "supervision.weekly.preview": "Xem trước hồ sơ tuần có quyền đọc",
  "supervision.weekly.export": "In và xuất hồ sơ tuần theo quyền sở hữu",
};

const WEEKLY_READERS = new Set<UserRole>(["SUPERVISION_HEAD", "CONSTRUCTION_SUPERVISOR", "ADMIN", "DIRECTOR", "DEPUTY_DIRECTOR"]);
const WEEKLY_AUTHORS = new Set<UserRole>(["SUPERVISION_HEAD", "CONSTRUCTION_SUPERVISOR"]);
const WEEKLY_REVIEWERS = new Set<UserRole>(["ADMIN", "DIRECTOR", "DEPUTY_DIRECTOR"]);

export function isConstructionSupervisor(role: UserRole) {
  return role === "CONSTRUCTION_SUPERVISOR";
}

export function canReadSupervisionWeekly(role: UserRole) {
  return WEEKLY_READERS.has(role);
}

export function canAuthorSupervisionWeekly(role: UserRole) {
  return WEEKLY_AUTHORS.has(role);
}

export function canReviewSupervisionWeekly(role: UserRole) {
  return WEEKLY_REVIEWERS.has(role);
}

export function canReadSupervisionWeeklyDossier(
  actor: { id: string; role: UserRole },
  dossier: Pick<WeeklyDossierPolicyResource, "createdById">,
) {
  if (!canReadSupervisionWeekly(actor.role)) return false;
  return canReviewSupervisionWeekly(actor.role)
    || isConstructionSupervisor(actor.role)
    || dossier.createdById === actor.id;
}

export function canEditSupervisionWeeklyDossier(
  actor: { id: string; role: UserRole },
  dossier: WeeklyDossierPolicyResource,
) {
  return canAuthorSupervisionWeekly(actor.role)
    && dossier.createdById === actor.id
    && (dossier.status === "DRAFT" || dossier.status === "REVISION_REQUIRED");
}

export function canDeleteSupervisionWeeklyDossier(
  actor: { id: string; role: UserRole },
  dossier: WeeklyDossierPolicyResource,
) {
  if (isConstructionSupervisor(actor.role)) return false;
  return (dossier.createdById === actor.id || canReviewSupervisionWeekly(actor.role))
    && (dossier.status === "DRAFT" || dossier.status === "REVISION_REQUIRED");
}

export function canSubmitSupervisionWeeklyDossier(
  actor: { id: string; role: UserRole },
  dossier: WeeklyDossierPolicyResource,
) {
  return canEditSupervisionWeeklyDossier(actor, dossier);
}

export function canPreviewSupervisionWeeklyDossier(
  actor: { id: string; role: UserRole },
  dossier: WeeklyDossierPolicyResource,
) {
  return canReadSupervisionWeeklyDossier(actor, dossier);
}

export function canExportSupervisionWeeklyDossier(
  actor: { id: string; role: UserRole },
  dossier: WeeklyDossierPolicyResource,
) {
  if (!canReadSupervisionWeeklyDossier(actor, dossier) || dossier.status === "LOCKED") return false;
  if (isConstructionSupervisor(actor.role)) return dossier.createdById === actor.id;
  return dossier.createdById === actor.id || canReviewSupervisionWeekly(actor.role);
}

export function canLockSupervisionWeeklyDossier(role: UserRole) {
  return WEEKLY_REVIEWERS.has(role);
}

export function hasInvalidSupervisionWeeklyRowIds(
  existingRowIds: Iterable<string>,
  suppliedRowIds: Iterable<string>,
) {
  const existing = new Set(existingRowIds);
  const supplied = [...suppliedRowIds];
  return supplied.some((rowId) => !existing.has(rowId))
    || new Set(supplied).size !== supplied.length;
}

export async function assertSupervisionProjectScope(actor: { id: string; role: UserRole }, projectId: string | null | undefined) {
  if (!projectId) return;
  const project = await prisma.project.findFirst({ where: { id: projectId, deletedAt: null }, select: { id: true } });
  if (!project) {
    await writeSecurityAuditEvent({
      eventType: "CROSS_PROJECT_RESOURCE_REJECTED",
      actorId: actor.id,
      role: actor.role,
      action: "supervision.weekly.use_project",
      resourceType: "Project",
      resourceId: projectId,
      projectId,
      reasonCode: "PROJECT_NOT_FOUND_OR_DELETED",
    });
    throw new Error("Công trình không tồn tại hoặc đã bị xóa.");
  }
  if (actor.role === "ADMIN" || actor.role === "DIRECTOR" || actor.role === "DEPUTY_DIRECTOR" || isConstructionSupervisor(actor.role)) return;
  const { canAccessSupervisionProject } = await import("@/lib/rbac");
  if (!await canAccessSupervisionProject(actor as never, projectId)) {
    await writeSecurityAuditEvent({
      eventType: "CROSS_PROJECT_RESOURCE_REJECTED",
      actorId: actor.id,
      role: actor.role,
      action: "supervision.weekly.use_project",
      resourceType: "Project",
      resourceId: projectId,
      projectId,
      reasonCode: "PROJECT_SCOPE_DENIED",
    });
    throw new Error("Bạn không có quyền sử dụng công trình này trong phạm vi giám sát.");
  }
}
