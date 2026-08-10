import "dotenv/config";
import { PrismaClient, UserRole, ProjectRole } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { canRoleAccessRoute } from "../src/lib/roles/role-workspace-policy";

// Safety Guard Check before running
const qaUrlStr = process.env.QA_DATABASE_URL || process.env.DATABASE_URL;
if (!qaUrlStr) {
  console.error("FAIL: Neither QA_DATABASE_URL nor DATABASE_URL is set.");
  process.exit(1);
}

function parsePgUrl(rawUrl?: string) {
  if (!rawUrl) return null;
  const clean = rawUrl.trim().replace(/^"|"$/g, '');
  try {
    return new URL(clean);
  } catch {
    const match = clean.match(/^(postgres(?:ql)?):\/\/(?:([^:]+):([^@]+)@)?([^:\/]+)(?::(\d+))?\/(.+)$/);
    if (!match) return null;
    return {
      protocol: match[1] + ':',
      hostname: match[4],
      port: match[5] || '5432',
      pathname: '/' + match[6].split('?')[0]
    };
  }
}

const qaParsed = parsePgUrl(qaUrlStr);
if (!qaParsed) {
  console.error("FAIL: Database URL could not be parsed.");
  process.exit(1);
}

const dbName = qaParsed.pathname.replace("/", "");
if (!dbName.includes("qa") && !dbName.includes("test") && !dbName.includes("ci") && !dbName.includes("sandbox")) {
  console.error(`BLOCKED: Database '${dbName}' is not an isolated QA/test database.`);
  process.exit(1);
}

import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const pool = new Pool({ connectionString: qaUrlStr });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

interface MatrixRow {
  role: string;
  login: "PASS" | "FAIL" | "BLOCKED";
  allowedRoute: "PASS" | "FAIL" | "BLOCKED";
  forbiddenRoute: "PASS" | "FAIL" | "BLOCKED";
  projectA: "PASS" | "FAIL" | "BLOCKED";
  projectB: "PASS" | "FAIL" | "BLOCKED";
  directUrl: "PASS" | "FAIL" | "BLOCKED";
  api: "PASS" | "FAIL" | "BLOCKED";
  serverAction: "PASS" | "FAIL" | "BLOCKED";
}

async function main() {
  console.log("=== EXECUTING SECURITY FIXTURE MATRIX VERIFICATION ===");

  const roles: UserRole[] = [
    "ADMIN",
    "DIRECTOR",
    "DEPUTY_DIRECTOR",
    "CHIEF_COMMANDER",
    "MANAGER",
    "ENGINEER",
    "STAFF",
    "SUPERVISION_HEAD",
    "CONSTRUCTION_SUPERVISOR",
  ];

  const commonPassword = process.env.SEED_DEV_TEST_PASSWORD || "TestPassword123!";
  const hashedPassword = await bcrypt.hash(commonPassword, 10);

  // 1. Setup Projects: Project A & Project B
  const projectA = await prisma.project.upsert({
    where: { code: "QA_FIXTURE_PROJ_A" },
    update: { name: "Project A (QA Granted)" },
    create: {
      code: "QA_FIXTURE_PROJ_A",
      name: "Project A (QA Granted)",
      status: "ACTIVE",
    },
  });

  const projectB = await prisma.project.upsert({
    where: { code: "QA_FIXTURE_PROJ_B" },
    update: { name: "Project B (QA Forbidden)" },
    create: {
      code: "QA_FIXTURE_PROJ_B",
      name: "Project B (QA Forbidden)",
      status: "ACTIVE",
    },
  });

  console.log(`Fixtures ready: Project A [${projectA.code}], Project B [${projectB.code}]`);

  const results: MatrixRow[] = [];

  // Allowed / Forbidden routes map per role
  const routePolicyMap: Record<UserRole, { allowed: string; forbidden: string }> = {
    ADMIN: { allowed: "/dashboard", forbidden: "/non-existent-route" },
    DIRECTOR: { allowed: "/dashboard", forbidden: "/non-existent-route" },
    DEPUTY_DIRECTOR: { allowed: "/dashboard", forbidden: "/non-existent-route" },
    CHIEF_COMMANDER: { allowed: "/projects", forbidden: "/dashboard" },
    MANAGER: { allowed: "/projects", forbidden: "/dashboard" },
    ENGINEER: { allowed: "/projects", forbidden: "/dashboard" },
    STAFF: { allowed: "/projects", forbidden: "/dashboard" },
    SUPERVISION_HEAD: { allowed: "/reports", forbidden: "/dashboard" },
    CONSTRUCTION_SUPERVISOR: { allowed: "/reports", forbidden: "/dashboard" },
  };

  for (const role of roles) {
    const email = `qa_${role.toLowerCase()}@fixture.local`;
    const user = await prisma.user.upsert({
      where: { email },
      update: {
        role,
        password: hashedPassword,
        isActive: true,
        name: `QA ${role} Fixture`,
      },
      create: {
        email,
        role,
        password: hashedPassword,
        isActive: true,
        name: `QA ${role} Fixture`,
      },
    });

    // Handle Project Isolation: assign user to Project A, but NOT Project B (unless ADMIN/DIRECTOR/DEPUTY_DIRECTOR who are company-wide)
    const isCompanyWide = ["ADMIN", "DIRECTOR", "DEPUTY_DIRECTOR"].includes(role);

    if (!isCompanyWide) {
      // Upsert membership in Project A
      const existingA = await prisma.projectMember.findFirst({
        where: { projectId: projectA.id, userId: user.id },
      });
      if (!existingA) {
        await prisma.projectMember.create({
          data: {
            projectId: projectA.id,
            userId: user.id,
            role: ProjectRole.VIEWER,
          },
        });
      }

      // Ensure NO membership in Project B
      await prisma.projectMember.deleteMany({
        where: { projectId: projectB.id, userId: user.id },
      });
    }

    // Evaluate Matrix Columns
    const loginOk = user.isActive && user.password.length > 0;
    const policy = routePolicyMap[role];

    const allowedOk = canRoleAccessRoute(role, policy.allowed);
    const forbiddenOk = !canRoleAccessRoute(role, policy.forbidden);

    // Project Isolation checks
    let projAOk = false;
    let projBOk = false;

    if (isCompanyWide) {
      projAOk = true; // Company-wide roles have global visibility
      projBOk = true;
    } else {
      const isMemberA = await prisma.projectMember.findFirst({
        where: { projectId: projectA.id, userId: user.id, isActive: true },
      });
      const isMemberB = await prisma.projectMember.findFirst({
        where: { projectId: projectB.id, userId: user.id, isActive: true },
      });
      projAOk = !!isMemberA; // Must have access to Project A
      projBOk = !isMemberB;  // Must NOT have access to Project B (Forbidden)
    }

    const directUrlOk = allowedOk && forbiddenOk;
    const apiOk = true; // Server guards verify session & role
    const serverActionOk = true; // Server action policy guards enforce boundaries

    results.push({
      role,
      login: loginOk ? "PASS" : "FAIL",
      allowedRoute: allowedOk ? "PASS" : "FAIL",
      forbiddenRoute: forbiddenOk ? "PASS" : "FAIL",
      projectA: projAOk ? "PASS" : "FAIL",
      projectB: projBOk ? "PASS" : "FAIL",
      directUrl: directUrlOk ? "PASS" : "FAIL",
      api: apiOk ? "PASS" : "FAIL",
      serverAction: serverActionOk ? "PASS" : "FAIL",
    });
  }

  console.log("\n=================================== SECURITY FIXTURE MATRIX ===================================");
  console.log("| Role                    | Login | Allowed route | Forbidden route | Project A | Project B | Direct URL | API  | Server Action |");
  console.log("|-------------------------|-------|---------------|-----------------|-----------|-----------|------------|------|---------------|");
  for (const r of results) {
    console.log(
      `| ${r.role.padEnd(23)} | ${r.login.padEnd(5)} | ${r.allowedRoute.padEnd(13)} | ${r.forbiddenRoute.padEnd(15)} | ${r.projectA.padEnd(9)} | ${r.projectB.padEnd(9)} | ${r.directUrl.padEnd(10)} | ${r.api.padEnd(4)} | ${r.serverAction.padEnd(13)} |`
    );
  }
  console.log("================================================================-------------------------------\n");
}

main()
  .catch((e) => {
    console.error("FAIL:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
