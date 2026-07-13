import { ProjectRole, UserRole } from "@prisma/client";
import prisma from "../src/lib/prisma";
import { getMaterialPermissions, type MaterialPermissionSet } from "../src/lib/materials/materials-permissions";
import { canViewAllProjects } from "../src/lib/rbac";

const qaUserIds: string[] = [];

type MatrixTarget = {
  label: string;
  userRole: UserRole;
  projectRole?: ProjectRole | null;
  outsideProject?: boolean;
  expected: Pick<MaterialPermissionSet, "canView" | "canCreate" | "canUpdate" | "canDelete" | "canRestore" | "canImport" | "canExport" | "canApproveRequest">;
};

const targets: MatrixTarget[] = [
  { label: "ADMIN", userRole: "ADMIN", projectRole: null, expected: full() },
  { label: "DIRECTOR", userRole: "DIRECTOR", projectRole: null, expected: full() },
  { label: "DEPUTY_DIRECTOR", userRole: "DEPUTY_DIRECTOR", projectRole: null, expected: full() },
  { label: "CHIEF_COMMANDER / SITE_COMMANDER", userRole: "CHIEF_COMMANDER", projectRole: "SITE_COMMANDER", expected: full() },
  { label: "ACCOUNTANT + VIEWER", userRole: "ACCOUNTANT", projectRole: "VIEWER", expected: readOnly() },
  { label: "ENGINEER", userRole: "ENGINEER", projectRole: "SUPERVISOR", expected: readOnly() },
  { label: "VIEWER", userRole: "STAFF", projectRole: "VIEWER", expected: readOnly() },
  { label: "User ngoai project", userRole: "STAFF", outsideProject: true, expected: none() },
];

function full() {
  return {
    canView: true,
    canCreate: true,
    canUpdate: true,
    canDelete: true,
    canRestore: true,
    canImport: true,
    canExport: true,
    canApproveRequest: true,
  };
}

function readOnly() {
  return {
    canView: true,
    canCreate: false,
    canUpdate: false,
    canDelete: false,
    canRestore: false,
    canImport: false,
    canExport: false,
    canApproveRequest: false,
  };
}

function none() {
  return {
    canView: false,
    canCreate: false,
    canUpdate: false,
    canDelete: false,
    canRestore: false,
    canImport: false,
    canExport: false,
    canApproveRequest: false,
  };
}

function b(value: boolean) {
  return value ? "Y" : "-";
}

function compact(perms: ReturnType<typeof full>) {
  return [
    b(perms.canView),
    b(perms.canCreate),
    b(perms.canUpdate),
    b(perms.canDelete),
    b(perms.canRestore),
    b(perms.canImport),
    b(perms.canExport),
    b(perms.canApproveRequest),
  ].join("/");
}

function materialSubset(perms: MaterialPermissionSet) {
  return {
    canView: perms.canView,
    canCreate: perms.canCreate,
    canUpdate: perms.canUpdate,
    canDelete: perms.canDelete,
    canRestore: perms.canRestore,
    canImport: perms.canImport,
    canExport: perms.canExport,
    canApproveRequest: perms.canApproveRequest,
  };
}

function same(a: ReturnType<typeof full>, b: ReturnType<typeof full>) {
  return Object.keys(a).every((key) => a[key as keyof typeof a] === b[key as keyof typeof b]);
}

async function createQaUser(target: MatrixTarget, projectId?: string) {
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const user = await prisma.user.create({
    data: {
      email: `qa_rbac_${stamp}@local.test`,
      username: `QA_RBAC_${stamp}`,
      name: `QA_RBAC_${target.label}`,
      password: "QA_RBAC_TEMP_PASSWORD",
      role: target.userRole,
    },
    include: {
      projectMembers: true,
    },
  });
  qaUserIds.push(user.id);

  if (projectId && target.projectRole && !target.outsideProject && !canViewAllProjects(user)) {
    await prisma.projectMember.create({
      data: {
        projectId,
        userId: user.id,
        role: target.projectRole,
      },
    });
  }

  return prisma.user.findUniqueOrThrow({
    where: { id: user.id },
    include: { projectMembers: { where: projectId ? { projectId, isActive: true, deletedAt: null, leftAt: null } : undefined } },
  });
}

async function findOrCreateSample(target: MatrixTarget, projectId?: string) {
  const sample = await prisma.user.findFirst({
    where: {
      isActive: true,
      deletedAt: null,
      role: target.userRole,
      name: { not: { startsWith: "QA_RBAC_" } },
      ...(target.outsideProject
        ? { projectMembers: { none: { isActive: true, deletedAt: null, leftAt: null } } }
        : target.projectRole && projectId && !["ADMIN", "DIRECTOR", "DEPUTY_DIRECTOR"].includes(target.userRole)
          ? { projectMembers: { some: { projectId, role: target.projectRole, isActive: true, deletedAt: null, leftAt: null } } }
          : {}),
    },
    include: { projectMembers: { where: projectId ? { projectId, isActive: true, deletedAt: null, leftAt: null } : undefined } },
  });

  return sample ?? createQaUser(target, projectId);
}

async function main() {
  const project = await prisma.project.findFirst({ where: { deletedAt: null }, orderBy: { createdAt: "asc" } });
  if (!project) throw new Error("No project available for RBAC matrix audit.");

  console.log("=== RBAC PERMISSION MATRIX AUDIT ===");
  console.log(`Project sample: ${project.code} / ${project.name} / ${project.id}`);
  console.log("User | User.role | ProjectMember.role | Scope | Materials View | Create | Update | Delete | Restore | Import | Export | Approve Request | Expected | Actual | Result");

  let failed = 0;
  for (const target of targets) {
    const user = await findOrCreateSample(target, project.id);
    const memberRole = canViewAllProjects(user)
      ? null
      : target.outsideProject
        ? null
        : user.projectMembers[0]?.role ?? target.projectRole ?? null;
    const actual = materialSubset(getMaterialPermissions(user.role, memberRole));
    const result = same(target.expected, actual) ? "PASS" : "FAIL";
    if (result === "FAIL") failed += 1;
    const scope = canViewAllProjects(user) ? "ALL" : memberRole ? "PROJECT" : "NONE";

    console.log([
      `${user.name} <${user.email}>`,
      user.role,
      memberRole ?? "N/A",
      scope,
      b(actual.canView),
      b(actual.canCreate),
      b(actual.canUpdate),
      b(actual.canDelete),
      b(actual.canRestore),
      b(actual.canImport),
      b(actual.canExport),
      b(actual.canApproveRequest),
      compact(target.expected),
      compact(actual),
      result,
    ].join(" | "));
  }

  console.log(`QA temp users created: ${qaUserIds.length}. They will be cleaned up by this script.`);
  if (failed > 0) {
    throw new Error(`RBAC matrix failed: ${failed} row(s).`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (qaUserIds.length > 0) {
      await prisma.projectMember.deleteMany({ where: { userId: { in: qaUserIds } } });
      await prisma.user.deleteMany({ where: { id: { in: qaUserIds }, name: { startsWith: "QA_RBAC_" } } });
    }
    await prisma.$disconnect();
  });
