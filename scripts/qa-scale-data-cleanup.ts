import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

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

export async function cleanupScaleData() {
  console.log(`[Safety Guard PASS] Cleaning synthetic scale data on database '${dbName}'...`);

  // Delete synthetic approval requests, site reports, project members, documents, employees, materials, and projects
  const delApprovals = await prisma.approvalRequest.deleteMany({
    where: { code: { startsWith: "QA_SCALE_" } },
  });

  const delSiteReports = await prisma.siteReport.deleteMany({
    where: { reportNo: { startsWith: "QA_SCALE_" } },
  });

  const delProjectMembers = await prisma.projectMember.deleteMany({
    where: { project: { code: { startsWith: "QA_SCALE_" } } },
  });

  const delProjects = await prisma.project.deleteMany({
    where: { code: { startsWith: "QA_SCALE_" } },
  });

  const delUsers = await prisma.user.deleteMany({
    where: { email: { startsWith: "qa_scale_" } },
  });

  console.log(`Cleanup complete:`);
  console.log(`  - Deleted ${delApprovals.count} synthetic approvals`);
  console.log(`  - Deleted ${delSiteReports.count} synthetic site reports`);
  console.log(`  - Deleted ${delProjectMembers.count} synthetic project members`);
  console.log(`  - Deleted ${delProjects.count} synthetic projects`);
  console.log(`  - Deleted ${delUsers.count} synthetic users`);
}

if (require.main === module) {
  cleanupScaleData()
    .catch((e) => {
      console.error("Cleanup failed:", e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
      await pool.end();
    });
}
