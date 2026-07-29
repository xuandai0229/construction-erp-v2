import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import * as fs from "fs";
import * as path from "path";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export interface QAAuditManifest {
  timestamp: string;
  qaProjects: { id: string; code: string; name: string; reason: string; deletedAt: Date | null }[];
  qaSiteReports: { id: string; reportNo: string | null; projectId: string; summary: string | null; issues: string | null }[];
  qaUsers: { id: string; email: string; name: string }[];
  realProjectsCount: number;
  realSiteReportsCount: number;
}

async function runAudit() {
  console.log("🔍 Running System-Wide QA Data Audit...");

  // Fetch all projects
  const allProjects = await prisma.project.findMany({
    select: { id: true, code: true, name: true, deletedAt: true },
  });

  const qaProjectNamespaces = ["QA-", "QA_", "OK1", "QA-STRESS-", "QA-EWR-", "QA_WS_", "QA-TUHIEP-"];

  const qaProjects = allProjects.filter((p) => {
    return (
      qaProjectNamespaces.some((ns) => p.code.startsWith(ns) || p.name.includes(ns)) ||
      p.code === "OK1" ||
      p.name.includes("Công trình Test") ||
      p.name.includes("[QA]")
    );
  });

  const qaProjectIds = new Set(qaProjects.map((p) => p.id));

  // Fetch SiteReports related to QA projects or with QA tags
  const allReports = await prisma.siteReport.findMany({
    select: { id: true, reportNo: true, projectId: true, summary: true, issues: true },
  });

  const qaSiteReports = allReports.filter(
    (r) =>
      qaProjectIds.has(r.projectId) ||
      (r.reportNo && qaProjectNamespaces.some((ns) => r.reportNo!.includes(ns))) ||
      (r.summary && r.summary.includes("[QA]"))
  );

  // Fetch QA Users
  const allUsers = await prisma.user.findMany({
    select: { id: true, email: true, name: true },
  });
  const qaUsers = allUsers.filter(
    (u) => u.email.includes("qa") || u.email.includes("test") || u.name.includes("QA")
  );

  const realProjects = allProjects.filter((p) => !qaProjectIds.has(p.id) && p.deletedAt === null);
  const realReports = allReports.filter((r) => !qaSiteReports.some((qr) => qr.id === r.id));

  const manifest: QAAuditManifest = {
    timestamp: new Date().toISOString(),
    qaProjects: qaProjects.map((p) => ({
      id: p.id,
      code: p.code,
      name: p.name,
      reason: p.code === "OK1" ? "Test Project Code OK1" : "Matches QA Namespace",
      deletedAt: p.deletedAt,
    })),
    qaSiteReports: qaSiteReports.map((r) => ({
      id: r.id,
      reportNo: r.reportNo,
      projectId: r.projectId,
      summary: r.summary,
      issues: r.issues,
    })),
    qaUsers: qaUsers.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
    })),
    realProjectsCount: realProjects.length,
    realSiteReportsCount: realReports.length,
  };

  const outputDir = path.join(process.cwd(), "docs", "qa");
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const manifestPath = path.join(outputDir, "qa-data-audit-manifest.json");
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf-8");

  console.log("\n📋 --- QA DATA AUDIT SUMMARY ---");
  console.log(` • QA Projects Identified: ${qaProjects.length} (${qaProjects.filter((p) => p.deletedAt === null).length} active)`);
  console.log(` • QA Site Reports Identified: ${qaSiteReports.length}`);
  console.log(` • QA Users Identified: ${qaUsers.length}`);
  console.log(` • Real Business Projects Remaining: ${realProjects.length}`);
  console.log(` • Manifest written to: ${manifestPath}`);

  return manifest;
}

runAudit()
  .catch((e) => {
    console.error("Audit error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
