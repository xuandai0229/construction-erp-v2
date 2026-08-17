import dotenv from "dotenv";
import path from "node:path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import { prisma } from "../../scripts/admin/db_client";

async function main() {
const [employees, roles, projects, users] = await Promise.all([
  prisma.employee.findMany({
    include: {
      user: { select: { id: true, email: true, username: true, name: true, role: true, isActive: true, deletedAt: true } },
      orgAssignments: { include: { position: true, organizationUnit: true } },
      projectAssignments: { include: { project: true, projectPersonnelRole: true } },
    },
    orderBy: { code: "asc" },
  }),
  prisma.projectPersonnelRole.findMany({ orderBy: [{ orderIndex: "asc" }, { code: "asc" }] }),
  prisma.project.findMany({
    select: {
      id: true,
      code: true,
      name: true,
      displayName: true,
      externalSource: true,
      externalSourceKey: true,
      sourceMetadata: true,
      members: {
        include: { user: { select: { id: true, email: true, name: true, role: true, isActive: true, deletedAt: true } } },
      },
      employeeProjectAssignments: {
        include: { employee: true, projectPersonnelRole: true },
      },
    },
    orderBy: { code: "asc" },
  }),
  prisma.user.findMany({
    select: {
      id: true,
      email: true,
      username: true,
      name: true,
      phone: true,
      role: true,
      isActive: true,
      deletedAt: true,
      employee: { select: { id: true, code: true, fullName: true } },
      projectMembers: { include: { project: { select: { id: true, code: true, name: true } } } },
    },
    orderBy: { email: "asc" },
  }),
]);

console.log(JSON.stringify({ employees, roles, projects, users }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
