import prisma from "../src/lib/prisma";
import { getMaterialPermissions } from "../src/lib/materials/materials-permissions";
import { canViewAllProjects } from "../src/lib/rbac";

function b(value: boolean) {
  return value ? "Y" : "-";
}

function hasMutation(p: ReturnType<typeof getMaterialPermissions>) {
  return p.canCreate || p.canUpdate || p.canDelete || p.canRestore || p.canImport || p.canExport || p.canApproveRequest;
}

async function main() {
  const project = await prisma.project.findFirst({ where: { deletedAt: null }, orderBy: { createdAt: "asc" } });
  const users = await prisma.user.findMany({
    where: { isActive: true, deletedAt: null },
    include: {
      projectMembers: project
        ? { where: { projectId: project.id, isActive: true, deletedAt: null, leftAt: null } }
        : { where: { isActive: true, deletedAt: null, leftAt: null } },
    },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });

  console.log("=== MATERIALS RBAC AUDIT ===");
  console.log(`Project sample: ${project ? `${project.code} ${project.id}` : "MISSING PROJECT"}`);
  console.log("User | Role | Scope | ProjectRole | View | Create | Update | Delete | Restore | Import | Export | ApproveRequest | Expected | Result");

  let failed = 0;
  for (const user of users) {
    const projectRole = canViewAllProjects(user) ? null : user.projectMembers[0]?.role ?? null;
    const p = getMaterialPermissions(user.role, projectRole);
    let expected = "policy";
    let result = "PASS";

    if (projectRole === "VIEWER") {
      expected = "VIEWER read-only/no mutation";
      result = p.canView && !hasMutation(p) ? "PASS" : "FAIL";
    } else if (projectRole === "SITE_COMMANDER" || projectRole === "CHIEF_COMMANDER" || projectRole === "PROJECT_MANAGER" || projectRole === "ASSISTANT_COMMANDER") {
      expected = "operations full in assigned project";
      result = p.canView && p.canCreate && p.canUpdate && p.canDelete && p.canRestore && p.canImport && p.canExport ? "PASS" : "FAIL";
    } else if (!canViewAllProjects(user) && !projectRole) {
      expected = "no project/no access";
      result = !p.canView && !hasMutation(p) ? "PASS" : "FAIL";
    }

    if (result === "FAIL") failed += 1;

    console.log([
      `${user.name} <${user.email}>`,
      user.role,
      canViewAllProjects(user) ? "ALL" : projectRole ? "PROJECT" : "NONE",
      projectRole ?? "N/A",
      b(p.canView),
      b(p.canCreate),
      b(p.canUpdate),
      b(p.canDelete),
      b(p.canRestore),
      b(p.canImport),
      b(p.canExport),
      b(p.canApproveRequest),
      expected,
      result,
    ].join(" | "));
  }

  if (failed > 0) {
    throw new Error(`Materials RBAC audit failed: ${failed} row(s).`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
