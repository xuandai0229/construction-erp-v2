import type { UserRole } from "@prisma/client";
import prisma from "@/lib/prisma";
import { canViewAllProjects } from "@/lib/rbac";
import { getMaterialPermissions, type MaterialPermissionSet } from "./materials-permissions";

export async function getProjectMaterialPermissions(
  user: { id: string; role: UserRole },
  projectId: string,
): Promise<MaterialPermissionSet> {
  const project = await prisma.project.findFirst({
    where: { id: projectId, deletedAt: null },
    select: { id: true },
  });

  if (!project) throw new Error("Khong tim thay cong trinh");

  let projectRole = null;
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

    if (!membership) throw new Error("Ban khong co quyen thao tac cong trinh nay");
    projectRole = membership.role;
  }

  return getMaterialPermissions(user.role, projectRole);
}

export function assertMaterialPermission(
  permissions: MaterialPermissionSet,
  action: keyof MaterialPermissionSet,
) {
  if (!permissions[action]) {
    throw new Error("Ban khong co quyen thuc hien thao tac vat tu nay.");
  }
}
