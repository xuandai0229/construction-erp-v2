import type { UserRole } from "@prisma/client";
import prisma from "@/lib/prisma";

export const SUPERVISION_PERMISSIONS = [
  "projects.read.all", "projects.read.assigned", "projects.read.details", "project_progress.read", "project_quantities.read", "project_documents.read.technical", "project_members.read.basic",
  "supervision_dashboard.read", "supervision_visits.create", "supervision_visits.read", "supervision_visits.update.own_draft", "supervision_inspections.create", "supervision_inspections.read", "supervision_inspections.update.own_draft",
  "supervision_findings.create", "supervision_findings.read", "supervision_findings.assign_corrective_action", "supervision_findings.verify_remediation", "supervision_weekly_reports.create", "supervision_weekly_reports.read", "supervision_weekly_reports.update.own_draft", "supervision_weekly_reports.submit", "supervision_weekly_reports.resubmit", "supervision_weekly_reports.export", "supervision_weekly_plans.create", "supervision_weekly_plans.read", "supervision_weekly_plans.update.own_draft", "supervision_weekly_plans.submit", "supervision_attachments.upload", "supervision_attachments.read",
] as const;
export type SupervisionPermission = (typeof SUPERVISION_PERMISSIONS)[number];

const DIRECTORS: UserRole[] = ["DIRECTOR", "DEPUTY_DIRECTOR"];
const ADMINS: UserRole[] = ["ADMIN"];

export function canReviewSupervision(role: UserRole) { return DIRECTORS.includes(role); }
export function isSupervisionActor(role: UserRole) { return role === "SUPERVISION_HEAD"; }

export async function canAccessSupervisionProject(actor: { id: string; role: UserRole }, projectId: string) {
  if ([...DIRECTORS, ...ADMINS].includes(actor.role)) return true;
  if (actor.role !== "SUPERVISION_HEAD") return false;
  const scope = await prisma.supervisionScope.findUnique({ where: { userId: actor.id }, include: { projects: { where: { projectId } } } });
  return Boolean(scope && (scope.scopeType === "ALL_PROJECTS" || scope.projects.length > 0));
}

export async function getSupervisionProjectWhere(actor: { id: string; role: UserRole }) {
  if ([...DIRECTORS, ...ADMINS].includes(actor.role)) return {};
  if (actor.role !== "SUPERVISION_HEAD") return { id: { in: [] as string[] } };
  const scope = await prisma.supervisionScope.findUnique({ where: { userId: actor.id }, include: { projects: { select: { projectId: true } } } });
  if (!scope) return { id: { in: [] as string[] } };
  return scope.scopeType === "ALL_PROJECTS" ? {} : { id: { in: scope.projects.map((item) => item.projectId) } };
}

export async function assertSupervisionProjectAccess(actor: { id: string; role: UserRole }, projectId: string) {
  if (!(await canAccessSupervisionProject(actor, projectId))) throw new Error("Bạn không có quyền giám sát công trình này.");
}

export function assertSupervisionPermission(actor: { role: UserRole }, permission: SupervisionPermission) {
  if ([...DIRECTORS, ...ADMINS].includes(actor.role)) return;
  if (actor.role !== "SUPERVISION_HEAD") throw new Error("Bạn không có quyền sử dụng nghiệp vụ giám sát.");
  if (permission === "projects.read.all") throw new Error("Phạm vi tất cả công trình phải được kiểm tra theo hồ sơ phạm vi giám sát.");
}
