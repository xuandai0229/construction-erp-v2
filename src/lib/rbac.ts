import { UserRole } from "@prisma/client";
import prisma from "./prisma";
import { getSession } from "./auth";
import { redirect } from "next/navigation";

// ─── Role Constants ───────────────────────────────────────────
const HIGH_LEVEL_ROLES: UserRole[] = ["ADMIN", "DIRECTOR", "DEPUTY_DIRECTOR"];

// ─── Role Display Names (Vietnamese) ─────────────────────────
export const ROLE_DISPLAY_NAMES: Record<UserRole, string> = {
  ADMIN: "Quản trị viên",
  DIRECTOR: "Giám đốc",
  DEPUTY_DIRECTOR: "Phó giám đốc",
  CHIEF_COMMANDER: "Chỉ huy trưởng",
  MANAGER: "Quản lý",
  ENGINEER: "Kỹ sư",
  ACCOUNTANT: "Kế toán",
  STAFF: "Nhân viên",
};

// ─── Role Checks ──────────────────────────────────────────────

/**
 * Check if user has high-level access (Admin, Director, Deputy Director)
 */
export function isHighLevelUser(user: { role: UserRole }): boolean {
  return HIGH_LEVEL_ROLES.includes(user.role);
}

/**
 * Check if user can view all projects (not just assigned ones)
 */
export function canViewAllProjects(user: { role: UserRole }): boolean {
  return HIGH_LEVEL_ROLES.includes(user.role);
}

/**
 * Check if user can manage (create/edit/delete) projects
 */
export function canManageProjects(user: { role: UserRole }): boolean {
  return HIGH_LEVEL_ROLES.includes(user.role);
}

/**
 * Check if user can manage (create/edit/deactivate) other user accounts
 */
export function canManageUsers(user: { role: UserRole }): boolean {
  return HIGH_LEVEL_ROLES.includes(user.role);
}

/**
 * Check if user can access a specific project (view data, enter daily, etc.)
 * High-level users can access any project.
 * Chief commanders can only access projects assigned to them.
 */
export async function canAccessProject(
  user: { id: string; role: UserRole },
  projectId: string
): Promise<boolean> {
  if (HIGH_LEVEL_ROLES.includes(user.role)) return true;

  const member = await prisma.projectMember.findUnique({
    where: {
      projectId_userId: { projectId, userId: user.id },
    },
  });

  return !!member && member.isActive && !member.deletedAt;
}

/**
 * Check if user can manage a specific project (edit details, delete)
 */
export async function canManageProject(
  user: { id: string; role: UserRole },
  projectId: string
): Promise<boolean> {
  return HIGH_LEVEL_ROLES.includes(user.role);
}

// ─── Server-Side Guards (throw/redirect on failure) ──────────

/**
 * Require session and return user. Redirect to login if not authenticated.
 */
export async function requireAuth() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  return session;
}

/**
 * Require user to be a high-level user. Returns the session.
 */
export async function requireHighLevelUser() {
  const session = await requireAuth();
  if (!isHighLevelUser(session)) {
    throw new Error("Bạn không có quyền thực hiện thao tác này");
  }
  return session;
}

/**
 * Require user to have access to a project. Returns the session.
 * For server components (pages), redirects to /projects if denied.
 */
export async function requireProjectAccess(projectId: string) {
  const session = await requireAuth();
  const hasAccess = await canAccessProject(session, projectId);
  if (!hasAccess) {
    throw new Error("Bạn không có quyền truy cập công trình này");
  }
  return session;
}

/**
 * Require user to have access to a project - page-level version that redirects.
 */
export async function requireProjectAccessOrRedirect(projectId: string) {
  const session = await requireAuth();
  const hasAccess = await canAccessProject(session, projectId);
  if (!hasAccess) {
    redirect("/projects");
  }
  return session;
}

/**
 * Require user to have management access - page-level version that redirects.
 */
export async function requireManagementAccessOrRedirect() {
  const session = await requireAuth();
  if (!canManageProjects(session)) {
    redirect("/projects");
  }
  return session;
}

/**
 * Get list of project IDs the user can access.
 * For high-level users, returns null (meaning all projects).
 * For others, returns array of assigned project IDs.
 */
export async function getAccessibleProjectIds(
  user: { id: string; role: UserRole }
): Promise<string[] | null> {
  if (HIGH_LEVEL_ROLES.includes(user.role)) return null; // null = all projects

  const members = await prisma.projectMember.findMany({
    where: {
      userId: user.id,
      isActive: true,
      deletedAt: null,
    },
    select: { projectId: true },
  });

  return members.map((m) => m.projectId);
}

// ─── Sidebar Navigation Visibility ──────────────────────────

export interface NavItem {
  name: string;
  href: string;
  icon: string;
  roles?: UserRole[]; // If set, only these roles see the item. If undefined, all see it.
}

export function getVisibleNavItems(role: UserRole): string[] {
  // Items hidden from CHIEF_COMMANDER
  const hiddenForCommander = [
    "/accounting",
    "/approvals",
    "/audit",
    "/settings",
    "/users",
  ];

  if (role === "CHIEF_COMMANDER") {
    return hiddenForCommander;
  }

  return []; // high-level users see everything
}
