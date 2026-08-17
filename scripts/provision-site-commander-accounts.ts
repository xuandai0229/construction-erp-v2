import dotenv from "dotenv";
import path from "node:path";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { provisionSiteCommanderAccount } from "../src/lib/hr/site-commander-account-service";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL chưa được cấu hình trong .env.local");
const pool = new Pool({ connectionString });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const apply = process.argv.includes("--apply");
  const now = new Date();
  const [counts, commanderEmployees] = await Promise.all([
    Promise.all([
      prisma.user.count(),
      prisma.employee.count(),
      prisma.project.count(),
      prisma.employeeProjectAssignment.count(),
      prisma.projectMember.count(),
    ]),
    prisma.employee.findMany({
      where: {
        status: { in: ["ACTIVE", "PROBATION"] },
        projectAssignments: {
          some: {
            status: "ACTIVE",
            OR: [{ endDate: null }, { endDate: { gte: now } }],
            projectPersonnelRole: { code: "CHT", isActive: true },
          },
        },
      },
      select: {
        id: true,
        code: true,
        fullName: true,
        userId: true,
        personalEmail: true,
        projectAssignments: {
          where: {
            status: "ACTIVE",
            OR: [{ endDate: null }, { endDate: { gte: now } }],
            projectPersonnelRole: { code: "CHT", isActive: true },
          },
          select: { projectId: true, project: { select: { code: true, name: true } } },
        },
      },
      orderBy: { code: "asc" },
    }),
  ]);

  const baseline = {
    users: counts[0],
    employees: counts[1],
    projects: counts[2],
    employeeProjectAssignments: counts[3],
    projectMembers: counts[4],
  };
  const review = commanderEmployees.map((employee) => ({
    employeeId: employee.id,
    employeeCode: employee.code,
    employeeName: employee.fullName,
    hasUser: Boolean(employee.userId),
    hasLoginEmail: Boolean(employee.personalEmail),
    assignedProjects: employee.projectAssignments.map((assignment) => assignment.project.code),
  }));

  if (!apply) {
    console.log(JSON.stringify({ mode: "DRY_RUN", baseline, eligibleEmployees: review.length, review }, null, 2));
    return;
  }

  const missingUsers = commanderEmployees.filter((employee) => !employee.userId);
  if (missingUsers.length > 0) {
    console.log(JSON.stringify({
      mode: "APPLY_BLOCKED_FOR_ONE_TIME_CREDENTIAL_DELIVERY",
      baseline,
      candidates: review,
      instruction: "Tạo từng tài khoản trong UI Nhân sự để Admin nhận mật khẩu tạm đúng một lần; không ghi plaintext vào file hoặc log.",
    }, null, 2));
    process.exitCode = 2;
    return;
  }

  const actor = await prisma.user.findFirst({
    where: { role: "ADMIN", isActive: true, deletedAt: null },
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });
  if (commanderEmployees.length > 0 && !actor) throw new Error("Không có ADMIN đang hoạt động để ghi nhận actor provisioning.");

  const results = [];
  for (const employee of commanderEmployees) {
    results.push(await provisionSiteCommanderAccount({
      prisma,
      employeeId: employee.id,
      actorUserId: actor!.id,
    }));
  }
  console.log(JSON.stringify({
    mode: "APPLY",
    baseline,
    eligibleEmployees: commanderEmployees.length,
    accountsCreated: results.filter((result) => result.code === "CREATED").length,
    existingAccountsReconciled: results.filter((result) => result.code === "EXISTING_RECONCILED").length,
    projectMembershipsCreated: results.reduce((sum, result) => sum + result.membershipsCreated, 0),
  }, null, 2));
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
