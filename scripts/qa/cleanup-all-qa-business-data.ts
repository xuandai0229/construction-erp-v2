import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import * as fs from "fs";
import * as path from "path";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function runCleanup() {
  const isDryRun = process.argv.includes("--dry-run");

  console.log(`🧹 Running QA Data Cleanup Script (${isDryRun ? "DRY-RUN MODE" : "LIVE MODE"})...\n`);

  const qaNamespaces = ["QA-STRESS-", "QA_WS_", "QA-EWR-", "QA-TUHIEP-", "QA-SWR-", "QA-DIRECT-", "OK1"];

  // 1. Identify QA Projects
  const allProjects = await prisma.project.findMany({
    select: { id: true, code: true, name: true, deletedAt: true },
  });

  const targetProjects = allProjects.filter((p) => {
    return (
      qaNamespaces.some((ns) => p.code.startsWith(ns) || p.name.includes(ns)) ||
      p.code === "OK1" ||
      p.name.includes("Công trình Test")
    );
  });

  const activeTargetProjects = targetProjects.filter((p) => p.deletedAt === null);

  console.log(`Found ${targetProjects.length} total QA projects (${activeTargetProjects.length} active).`);

  // 2. Identify QA Site Reports (with QA tags or attached to QA projects)
  const targetReports = await prisma.siteReport.findMany({
    where: {
      deletedAt: null,
      OR: [
        { projectId: { in: targetProjects.map((p) => p.id) } },
        { summary: { contains: "[QA]" } },
        { reportNo: { contains: "QA" } },
      ],
    },
    select: { id: true, reportNo: true, projectId: true, summary: true },
  });

  console.log(`Found ${targetReports.length} active QA Site Reports.`);

  if (isDryRun) {
    console.log("\n[DRY-RUN SUMMARY]");
    console.log(`• Active Projects to soft-delete: ${activeTargetProjects.length}`);
    activeTargetProjects.forEach((p) => console.log(`  - [${p.code}] ${p.name}`));
    console.log(`• Active Site Reports to soft-delete: ${targetReports.length}`);
    console.log("\nNo database mutations performed in --dry-run mode.");
  } else {
    const now = new Date();

    // Perform soft deletion
    const updatedProjects = await prisma.project.updateMany({
      where: { id: { in: activeTargetProjects.map((p) => p.id) } },
      data: { deletedAt: now },
    });

    const updatedReports = await prisma.siteReport.updateMany({
      where: { id: { in: targetReports.map((r) => r.id) } },
      data: { deletedAt: now },
    });

    console.log("\n✅ [CLEANUP COMPLETE]");
    console.log(`• Soft-deleted Projects: ${updatedProjects.count}`);
    console.log(`• Soft-deleted Site Reports: ${updatedReports.count}`);

    const reportData = {
      timestamp: now.toISOString(),
      softDeletedProjectsCount: updatedProjects.count,
      softDeletedReportsCount: updatedReports.count,
      projects: activeTargetProjects.map((p) => ({ code: p.code, name: p.name })),
    };

    const outPath = path.join(process.cwd(), "docs", "qa", "qa-cleanup-execution-log.json");
    fs.writeFileSync(outPath, JSON.stringify(reportData, null, 2), "utf-8");
    console.log(`Execution log saved to: ${outPath}`);
  }
}

runCleanup()
  .catch((e) => {
    console.error("Cleanup error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
