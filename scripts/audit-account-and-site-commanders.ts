import dotenv from "dotenv";
import path from "node:path";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL chưa được cấu hình trong .env.local");
const pool = new Pool({ connectionString });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const compact = process.argv.includes("--compact");
  const countsOnly = process.argv.includes("--counts-only");
  const [users, employees, projects, role] = await Promise.all([
    prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        role: true,
        isActive: true,
        deletedAt: true,
        mustChangePassword: true,
        createdAt: true,
        employee: { select: { id: true, code: true, fullName: true } },
        projectMembers: {
          select: { id: true, projectId: true, role: true, isActive: true, deletedAt: true, leftAt: true },
        },
        _count: {
          select: {
            auditLogs: true,
            documents: true,
            createdSiteReports: true,
            approvedSiteReports: true,
            messages: true,
            approvalRequests: true,
            approvals: true,
            createdFieldEntries: true,
            approvedFieldEntries: true,
            materialProposalsCreated: true,
            materialProposalApprovals: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.employee.findMany({
      select: {
        id: true,
        code: true,
        fullName: true,
        joinedDate: true,
        personalEmail: true,
        phoneNumber: true,
        status: true,
        userId: true,
        projectAssignments: {
          select: { id: true, projectId: true, status: true, endDate: true, projectPersonnelRole: { select: { code: true } } },
        },
      },
      orderBy: { code: "asc" },
    }),
    prisma.project.findMany({
      select: {
        id: true,
        code: true,
        name: true,
        displayName: true,
        externalSourceKey: true,
        sourceMetadata: true,
        employeeProjectAssignments: {
          where: { status: "ACTIVE", projectPersonnelRole: { code: "CHT" } },
          select: { employee: { select: { id: true, code: true, fullName: true } } },
        },
      },
      orderBy: { code: "asc" },
    }),
    prisma.projectPersonnelRole.findUnique({ where: { code: "CHT" } }),
  ]);

  const result = {
    counts: {
      users: users.length,
      currentUsers: users.filter((user) => !user.deletedAt).length,
      activeUsers: users.filter((user) => !user.deletedAt && user.isActive).length,
      stoppedUsers: users.filter((user) => Boolean(user.deletedAt)).length,
      employees: employees.length,
      projects: projects.length,
      chtAssignments: employees.flatMap((employee) => employee.projectAssignments).filter((assignment) => assignment.projectPersonnelRole.code === "CHT" && assignment.status === "ACTIVE").length,
      activeProjectMembers: users.flatMap((user) => user.projectMembers).filter((member) => member.isActive && !member.deletedAt && !member.leftAt).length,
    },
    role,
    users,
    employees,
    projects,
  };

  if (countsOnly) {
    console.log(JSON.stringify({
      counts: result.counts,
      commanderUsers: users.filter((user) => user.role === "CHIEF_COMMANDER" && user.employee).length,
      commanderEmployees: employees.filter((employee) => employee.projectAssignments.some(
        (assignment) => assignment.projectPersonnelRole.code === "CHT" && assignment.status === "ACTIVE",
      )).length,
      commanderUsersWithoutEmail: users.filter((user) => user.role === "CHIEF_COMMANDER" && !user.email).length,
      commanderUsersMustChangePassword: users.filter((user) => user.role === "CHIEF_COMMANDER" && user.mustChangePassword).length,
      commanderUsernames: users.filter((user) => user.role === "CHIEF_COMMANDER").map((user) => user.username),
    }, null, 2));
    return;
  }

  if (compact) {
    console.log(JSON.stringify({
      counts: result.counts,
      role,
      users: users.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        username: user.username,
        role: user.role,
        isActive: user.isActive,
        deletedAt: user.deletedAt,
        employee: user.employee,
        dependencies: user._count,
      })),
      employees: employees.map((employee) => ({
        id: employee.id,
        code: employee.code,
        fullName: employee.fullName,
        userId: employee.userId,
        assignments: employee.projectAssignments.length,
      })),
      projectMappings: projects.map((project) => ({
        code: project.code,
        name: project.name,
        externalSourceKey: project.externalSourceKey,
        sourceMetadata: project.sourceMetadata,
      })),
    }, null, 2));
    return;
  }

  console.log(JSON.stringify(result, null, 2));
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
