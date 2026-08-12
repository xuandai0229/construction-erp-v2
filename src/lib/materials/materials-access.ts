import type { UserRole, ProjectRole } from "@prisma/client";
import prisma from "@/lib/prisma";
import { canViewAllProjects, isCompanyWideUser } from "@/lib/rbac";
import { getMaterialPermissions, type MaterialPermissionSet } from "./materials-permissions";

export type MaterialDataScope = "COMPANY" | "ASSIGNED_PROJECTS" | "PROJECT" | "NONE";

export interface MaterialCapabilities {
  canView: boolean;
  canExport: boolean;
  canCreateProposal: boolean;
  canEditProposal: boolean;
  canDeleteProposal: boolean;
  canManageCatalog: boolean;
  canReceiveStock: boolean;
  canIssueStock: boolean;
  canCreateMovement: boolean;
}

export interface MaterialProjectItem {
  id: string;
  code: string;
  name: string;
  status: string;
  location: string | null;
  investor: string | null;
  sourceMetadata: unknown;
}

export interface MaterialAccessContext {
  userId: string;
  userRole: UserRole;
  dataScope: MaterialDataScope;
  isPortfolioMode: boolean;
  permittedProjects: MaterialProjectItem[];
  permittedProjectIds: string[];
  selectedProjectId: string | null;
  selectedProject: MaterialProjectItem | null;
  capabilities: MaterialCapabilities;
}

export async function resolveMaterialAccess(
  session: { id: string; role: UserRole },
  requestedProjectId?: string | null,
  scopeParam?: string | null
): Promise<MaterialAccessContext> {
  const isCompanyScopeUser = canViewAllProjects(session);

  // Fetch all projects that this user has DB access to
  let permittedProjects: MaterialProjectItem[] = [];

  if (isCompanyScopeUser) {
    const rawProjects = await prisma.project.findMany({
      where: {
        status: { in: ["PLANNING", "ACTIVE", "ON_HOLD"] },
        deletedAt: null,
      },
      select: {
        id: true,
        code: true,
        name: true,
        status: true,
        location: true,
        investor: true,
        sourceMetadata: true,
      },
      orderBy: [{ name: "asc" }, { createdAt: "desc" }],
    });
    permittedProjects = rawProjects;
  } else {
    const rawProjects = await prisma.project.findMany({
      where: {
        status: { in: ["PLANNING", "ACTIVE", "ON_HOLD"] },
        deletedAt: null,
        members: {
          some: {
            userId: session.id,
            isActive: true,
            deletedAt: null,
            leftAt: null,
          },
        },
      },
      select: {
        id: true,
        code: true,
        name: true,
        status: true,
        location: true,
        investor: true,
        sourceMetadata: true,
      },
      orderBy: [{ name: "asc" }, { createdAt: "desc" }],
    });
    permittedProjects = rawProjects;
  }

  const permittedProjectIds = permittedProjects.map((p) => p.id);

  // If user has no assigned projects and is not company user
  if (!isCompanyScopeUser && permittedProjects.length === 0) {
    return {
      userId: session.id,
      userRole: session.role,
      dataScope: "NONE",
      isPortfolioMode: false,
      permittedProjects: [],
      permittedProjectIds: [],
      selectedProjectId: null,
      selectedProject: null,
      capabilities: {
        canView: false,
        canExport: false,
        canCreateProposal: false,
        canEditProposal: false,
        canDeleteProposal: false,
        canManageCatalog: false,
        canReceiveStock: false,
        canIssueStock: false,
        canCreateMovement: false,
      },
    };
  }

  // Determine if portfolio mode is requested
  const isPortfolioRequested =
    isCompanyScopeUser &&
    (scopeParam === "portfolio" ||
      requestedProjectId === "portfolio" ||
      requestedProjectId === "all" ||
      (!requestedProjectId && scopeParam !== "project"));

  let selectedProjectId: string | null = null;
  let selectedProject: MaterialProjectItem | null = null;
  let isPortfolioMode = false;

  if (isCompanyScopeUser) {
    if (isPortfolioRequested) {
      isPortfolioMode = true;
      selectedProjectId = null;
      selectedProject = null;
    } else {
      isPortfolioMode = false;
      const targetId = requestedProjectId || permittedProjects[0]?.id || null;
      selectedProject = permittedProjects.find((p) => p.id === targetId) || null;
      selectedProjectId = selectedProject ? selectedProject.id : null;
      if (!selectedProjectId && permittedProjects.length > 0) {
        selectedProject = permittedProjects[0];
        selectedProjectId = selectedProject.id;
      }
    }
  } else {
    // Non-company user: ONLY assigned project mode is allowed
    isPortfolioMode = false;
    const targetId = requestedProjectId || permittedProjects[0]?.id || null;
    selectedProject = permittedProjects.find((p) => p.id === targetId) || null;
    selectedProjectId = selectedProject ? selectedProject.id : null;
    if (!selectedProjectId && permittedProjects.length > 0) {
      selectedProject = permittedProjects[0];
      selectedProjectId = selectedProject.id;
    }
  }

  // Determine capabilities
  let projectRole: ProjectRole | null = null;
  if (selectedProjectId && !isCompanyWideUser(session)) {
    const member = await prisma.projectMember.findFirst({
      where: {
        projectId: selectedProjectId,
        userId: session.id,
        isActive: true,
        deletedAt: null,
        leftAt: null,
      },
      select: { role: true },
    });
    projectRole = member?.role || null;
  }

  const basePerms = getMaterialPermissions(session.role, projectRole);

  const capabilities: MaterialCapabilities = {
    canView: basePerms.canView,
    canExport: basePerms.canExport,
    canCreateProposal: basePerms.canCreate,
    canEditProposal: basePerms.canUpdate,
    canDeleteProposal: basePerms.canDelete,
    canManageCatalog: basePerms.canCreate && basePerms.canUpdate,
    canReceiveStock: basePerms.canImport,
    canIssueStock: basePerms.canExport,
    canCreateMovement: basePerms.canImport || basePerms.canExport,
  };

  const dataScope: MaterialDataScope = isCompanyScopeUser
    ? "COMPANY"
    : selectedProjectId
    ? "PROJECT"
    : "ASSIGNED_PROJECTS";

  return {
    userId: session.id,
    userRole: session.role,
    dataScope,
    isPortfolioMode,
    permittedProjects,
    permittedProjectIds,
    selectedProjectId,
    selectedProject,
    capabilities,
  };
}

export async function getProjectMaterialPermissions(
  user: { id: string; role: UserRole },
  projectId: string,
): Promise<MaterialPermissionSet> {
  const project = await prisma.project.findFirst({
    where: { id: projectId, deletedAt: null },
    select: { id: true },
  });

  if (!project) throw new Error("Không tìm thấy công trình.");

  let projectRole: ProjectRole | null = null;
  if (!canViewAllProjects(user)) {
    const membership = await prisma.projectMember.findFirst({
      where: {
        projectId,
        userId: user.id,
        isActive: true,
        deletedAt: null,
        leftAt: null,
      },
      select: { role: true },
    });

    if (!membership) throw new Error("Bạn không có quyền thao tác trên công trình này.");
    projectRole = membership.role;
  }

  return getMaterialPermissions(user.role, projectRole);
}

export function assertMaterialPermission(
  permissions: MaterialPermissionSet,
  action: keyof MaterialPermissionSet,
) {
  if (!permissions[action]) {
    throw new Error("Bạn không có quyền thực hiện thao tác vật tư này.");
  }
}
