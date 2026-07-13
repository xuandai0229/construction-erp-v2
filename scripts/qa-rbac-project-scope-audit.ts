import { ProjectRole, UserRole } from "@prisma/client";
import prisma from "../src/lib/prisma";
import { canViewAllProjects, getAccessibleProjectIds, requireProjectScope } from "../src/lib/rbac";

const qaUserIds: string[] = [];

async function createQaUser(role: UserRole, projectId?: string, projectRole?: ProjectRole) {
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const user = await prisma.user.create({
    data: {
      email: `qa_rbac_scope_${stamp}@local.test`,
      username: `QA_RBAC_SCOPE_${stamp}`,
      name: `QA_RBAC_SCOPE_${role}_${projectRole ?? "NO_PROJECT"}`,
      password: "QA_RBAC_TEMP_PASSWORD",
      role,
    },
  });
  qaUserIds.push(user.id);

  if (projectId && projectRole) {
    await prisma.projectMember.create({ data: { projectId, userId: user.id, role: projectRole } });
  }

  return prisma.user.findUniqueOrThrow({
    where: { id: user.id },
    include: { projectMembers: { where: { isActive: true, deletedAt: null, leftAt: null } } },
  });
}

async function findOrCreate(role: UserRole, projectId?: string, projectRole?: ProjectRole, outside = false) {
  const user = await prisma.user.findFirst({
    where: {
      role,
      isActive: true,
      deletedAt: null,
      name: { not: { startsWith: "QA_RBAC_" } },
      ...(outside
        ? { projectMembers: { none: { isActive: true, deletedAt: null, leftAt: null } } }
        : projectId && projectRole
          ? { projectMembers: { some: { projectId, role: projectRole, isActive: true, deletedAt: null, leftAt: null } } }
          : {}),
    },
    include: { projectMembers: { where: { isActive: true, deletedAt: null, leftAt: null } } },
  });

  return user ?? createQaUser(role, projectId, outside ? undefined : projectRole);
}

async function expectScope(label: string, user: { id: string; role: UserRole }, projectIds: string[] | null, expected: "ALL" | "ASSIGNED" | "NONE") {
  const actual = canViewAllProjects(user) ? "ALL" : projectIds?.length ? "ASSIGNED" : "NONE";
  const result = actual === expected ? "PASS" : "FAIL";
  console.log(`${label} | ${user.role} | expected=${expected} | actual=${actual} | result=${result}`);
  return result === "PASS";
}

async function main() {
  const projects = await prisma.project.findMany({
    where: { deletedAt: null },
    select: { id: true, code: true, name: true },
    orderBy: { code: "asc" },
  });
  if (projects.length === 0) throw new Error("No project available for project scope audit.");
  const project = projects[0];

  const director = await findOrCreate("DIRECTOR");
  const deputy = await findOrCreate("DEPUTY_DIRECTOR");
  const commander = await findOrCreate("CHIEF_COMMANDER", project.id, "SITE_COMMANDER");
  const viewer = await findOrCreate("STAFF", project.id, "VIEWER");
  const outside = await findOrCreate("STAFF", undefined, undefined, true);

  console.log("=== RBAC PROJECT SCOPE AUDIT ===");
  console.log(`Projects: ${projects.length}; Sample project: ${project.code} / ${project.id}`);

  let ok = true;
  ok = (await expectScope(`DIRECTOR ${director.email}`, director, await getAccessibleProjectIds(director), "ALL")) && ok;
  ok = (await expectScope(`DEPUTY_DIRECTOR ${deputy.email}`, deputy, await getAccessibleProjectIds(deputy), "ALL")) && ok;
  ok = (await expectScope(`CHIEF_COMMANDER ${commander.email}`, commander, await getAccessibleProjectIds(commander), "ASSIGNED")) && ok;
  ok = (await expectScope(`VIEWER ${viewer.email}`, viewer, await getAccessibleProjectIds(viewer), "ASSIGNED")) && ok;
  ok = (await expectScope(`OUTSIDE ${outside.email}`, outside, await getAccessibleProjectIds(outside), "NONE")) && ok;

  let directBlocked = false;
  try {
    await requireProjectScope(outside, project.id);
  } catch {
    directBlocked = true;
  }
  console.log(`Direct projectId helper block for outside user | expected=BLOCKED | actual=${directBlocked ? "BLOCKED" : "ALLOWED"} | result=${directBlocked ? "PASS" : "FAIL"}`);
  ok = directBlocked && ok;

  console.log(`QA temp users created: ${qaUserIds.length}. They will be cleaned up by this script.`);
  if (!ok) throw new Error("Project scope audit failed.");
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
