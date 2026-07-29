import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { assertSafeDatabase } from "./assert-safe-weekly-summary-database";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const QA_PREFIX = "QA-STRESS-";

async function main() {
  assertSafeDatabase();
  const isDryRun = process.argv.includes("--dry-run");

  console.log(`🧹 ${isDryRun ? "[DRY-RUN] " : ""}Auditing QA stress test records...`);

  // 1. Audit records to delete
  const targetProjects = await prisma.project.findMany({
    where: { code: { startsWith: QA_PREFIX } },
    select: { id: true, code: true, name: true },
  });

  const projectIds = targetProjects.map((p) => p.id);

  const targetReportsCount = await prisma.siteReport.count({
    where: { projectId: { in: projectIds } },
  });

  const targetQAUser = await prisma.user.findUnique({
    where: { email: "qa-weekly-stress@erp-test.vn" },
  });

  console.log("\n📋 --- MANIFEST OF QA DATA TO CLEANUP ---");
  console.log(`   • Target QA Projects: ${targetProjects.length}`);
  console.log(`   • Target QA Site Reports: ${targetReportsCount}`);
  console.log(`   • Target QA User: ${targetQAUser ? targetQAUser.email : "None"}`);
  console.log("-----------------------------------------");

  if (isDryRun) {
    console.log("\n✨ Dry run complete. No mutations performed.");
    return;
  }

  // 2. Perform deletion in safe sequence
  const delReports = await prisma.siteReport.deleteMany({
    where: { projectId: { in: projectIds } },
  });

  const delProjects = await prisma.project.deleteMany({
    where: { id: { in: projectIds } },
  });

  if (targetQAUser) {
    await prisma.user.delete({
      where: { id: targetQAUser.id },
    }).catch(() => {
      // User might be referenced elsewhere, safe to ignore
    });
  }

  console.log(`\n✅ Cleanup complete successfully!`);
  console.log(`   - Deleted ${delReports.count} site reports`);
  console.log(`   - Deleted ${delProjects.count} projects`);

  // 3. Verify remaining business projects count
  const remainingProjectsCount = await prisma.project.count({
    where: { deletedAt: null },
  });
  console.log(`\n📊 Real Business Projects remaining in DB: ${remainingProjectsCount}`);
}

main()
  .catch((e) => {
    console.error("❌ Cleanup Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
