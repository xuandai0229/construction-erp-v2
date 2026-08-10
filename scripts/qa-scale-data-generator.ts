import "dotenv/config";
import { PrismaClient, UserRole, ProjectRole, ApprovalPriority, ApprovalRequestType, ApprovalRequestStatus } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import * as bcrypt from "bcryptjs";

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

const pool = new Pool({ connectionString: qaUrlStr });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export async function generateScaleTier(tier: "S1" | "S2" | "S3") {
  console.log(`\n================================================================`);
  console.log(`GENERATING SYNTHETIC SCALE DATA TIER ${tier} ON DB '${dbName}'`);
  console.log(`================================================================`);

  const commonPassword = process.env.SEED_DEV_TEST_PASSWORD || "TestPassword123!";
  const hashedPassword = await bcrypt.hash(commonPassword, 10);

  // Config per tier
  const tierConfig = {
    S1: { users: 100, projects: 20, approvalsPerProj: 200, reportsPerProj: 300 },
    S2: { users: 500, projects: 100, approvalsPerProj: 500, reportsPerProj: 500 },
    S3: { users: 1000, projects: 200, approvalsPerProj: 1000, reportsPerProj: 1000 },
  }[tier];

  // 1. Ensure Admin User exists for requester
  const adminUser = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  if (!adminUser) {
    throw new Error("Missing admin user in DB baseline");
  }

  // 2. Generate Synthetic Users
  console.log(`Creating ${tierConfig.users} synthetic users...`);
  const userRoles: UserRole[] = ["CHIEF_COMMANDER", "MANAGER", "ENGINEER", "STAFF", "SUPERVISION_HEAD", "CONSTRUCTION_SUPERVISOR"];
  
  const userBatchData = [];
  for (let i = 1; i <= tierConfig.users; i++) {
    const role = userRoles[i % userRoles.length];
    userBatchData.push({
      email: `qa_scale_${tier}_user${i}@fixture.local`,
      name: `QA Scale ${tier} User ${i}`,
      role,
      password: hashedPassword,
      isActive: true,
    });
  }

  await prisma.user.createMany({
    data: userBatchData,
    skipDuplicates: true,
  });

  const createdUsers = await prisma.user.findMany({
    where: { email: { startsWith: `qa_scale_${tier}_` } },
    select: { id: true },
  });

  // 3. Generate Synthetic Projects
  console.log(`Creating ${tierConfig.projects} synthetic projects...`);
  const projectBatchData = [];
  for (let p = 1; p <= tierConfig.projects; p++) {
    projectBatchData.push({
      code: `QA_SCALE_${tier}_PRJ_${String(p).padStart(4, "0")}`,
      name: `QA Scale ${tier} Project ${p}`,
      status: p % 5 === 0 ? "COMPLETED" : "ACTIVE",
      investor: `Investor ${p % 10 + 1}`,
      location: `City ${p % 5 + 1}`,
    });
  }

  await prisma.project.createMany({
    data: projectBatchData,
    skipDuplicates: true,
  });

  const createdProjects = await prisma.project.findMany({
    where: { code: { startsWith: `QA_SCALE_${tier}_` } },
    select: { id: true, code: true },
  });

  // 4. Generate Project Memberships
  console.log(`Generating project memberships...`);
  const memberBatchData = [];
  for (let i = 0; i < createdProjects.length; i++) {
    const prj = createdProjects[i];
    // Assign 5 users per project
    for (let u = 0; u < 5; u++) {
      const user = createdUsers[(i * 5 + u) % createdUsers.length];
      if (user) {
        memberBatchData.push({
          projectId: prj.id,
          userId: user.id,
          role: u === 0 ? ProjectRole.CHIEF_COMMANDER : ProjectRole.VIEWER,
          isActive: true,
        });
      }
    }
  }

  await prisma.projectMember.createMany({
    data: memberBatchData,
    skipDuplicates: true,
  });

  // 5. Generate High-Volume Approvals & Site Reports
  console.log(`Generating high-volume business records (${tierConfig.approvalsPerProj} approvals/proj, ${tierConfig.reportsPerProj} reports/proj)...`);
  
  const approvalTypes: ApprovalRequestType[] = ["MATERIAL", "REPORT", "VOLUME", "INSPECTION", "SAFETY"];
  const approvalPriorities: ApprovalPriority[] = ["LOW", "NORMAL", "HIGH", "URGENT"];
  const approvalStatuses: ApprovalRequestStatus[] = ["PENDING", "APPROVED", "REJECTED"];

  for (const prj of createdProjects) {
    const approvalBatch = [];
    for (let a = 1; a <= tierConfig.approvalsPerProj; a++) {
      approvalBatch.push({
        code: `QA_SCALE_${tier}_APP_${prj.code.slice(-4)}_${String(a).padStart(5, "0")}`,
        projectId: prj.id,
        requesterId: adminUser.id,
        title: `Scale Approval ${a} for ${prj.code}`,
        description: `Synthetic scale test record for tier ${tier}`,
        type: approvalTypes[a % approvalTypes.length],
        priority: approvalPriorities[a % approvalPriorities.length],
        status: approvalStatuses[a % approvalStatuses.length],
        dueDate: new Date(Date.now() + (a % 30) * 86400000),
        entityType: "APPROVAL",
        entityId: `qa_scale_entity_${a}`,
      });
    }

    await prisma.approvalRequest.createMany({
      data: approvalBatch,
      skipDuplicates: true,
    });

    const reportBatch = [];
    for (let r = 1; r <= tierConfig.reportsPerProj; r++) {
      reportBatch.push({
        reportNo: `QA_SCALE_${tier}_REP_${prj.code.slice(-4)}_${String(r).padStart(5, "0")}`,
        projectId: prj.id,
        createdById: adminUser.id,
        reportDate: new Date(Date.now() - (r % 100) * 86400000),
        status: r % 4 === 0 ? "SUBMITTED" : "APPROVED",
        summary: `Daily site report ${r} for project ${prj.code}`,
        issues: r % 10 === 0 ? `Issues encountered on day ${r}` : null,
      });
    }

    await prisma.siteReport.createMany({
      data: reportBatch,
      skipDuplicates: true,
    });
  }

  const totalApprovals = await prisma.approvalRequest.count({ where: { code: { startsWith: `QA_SCALE_${tier}_` } } });
  const totalReports = await prisma.siteReport.count({ where: { reportNo: { startsWith: `QA_SCALE_${tier}_` } } });

  console.log(`\nTIER ${tier} DATA GENERATION COMPLETE:`);
  console.log(`  - Total Synthetic Users: ${createdUsers.length}`);
  console.log(`  - Total Synthetic Projects: ${createdProjects.length}`);
  console.log(`  - Total Synthetic Approvals: ${totalApprovals}`);
  console.log(`  - Total Synthetic Site Reports: ${totalReports}`);
}

async function main() {
  const tier = (process.env.SCALE_TIER as "S1" | "S2" | "S3") || "S1";
  await generateScaleTier(tier);
}

if (require.main === module) {
  main()
    .catch((e) => {
      console.error("Generator failed:", e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
      await pool.end();
    });
}
