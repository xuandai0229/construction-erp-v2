import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import prisma from "../../src/lib/prisma";

type DiffFile = {
  source?: { excel?: { sha256?: string }; spreadsheetId?: string; sheetName?: string };
  projects?: Array<{ conclusion: string; code: string | null; externalSourceKey: string; database?: { projectId?: string; endDate?: string | null }; fieldDiff?: string[] }>;
};

const diffPath = process.argv.find((arg) => arg.startsWith("--diff="))?.slice("--diff=".length) ?? path.join("docs", "qa", "excel-google-database-diff.json");
const expectedHash = process.argv.find((arg) => arg.startsWith("--sha256="))?.slice("--sha256=".length);

async function main() {
  if (!fs.existsSync(diffPath)) throw new Error(`DIFF_FILE_NOT_FOUND:${diffPath}`);
  const diff = JSON.parse(fs.readFileSync(diffPath, "utf8")) as DiffFile;
  const candidate = (diff.projects ?? []).filter((project) => project.conclusion === "DATABASE_DRIFT");
  if (candidate.length !== 1) throw new Error(`BLOCKER_APPROVED_DIFF_SCOPE_EXPECTED_ONE:${candidate.length}`);
  const item = candidate[0];
  if (item.code !== "CT-2026-0019" || item.fieldDiff?.length !== 1 || item.fieldDiff[0] !== "endDate: null → 2028-12-31") throw new Error("BLOCKER_APPROVED_DIFF_NOT_EXACT_CT_2026_0019_END_DATE");
  if (expectedHash && diff.source?.excel?.sha256 !== expectedHash) throw new Error("BLOCKER_SOURCE_HASH_NOT_EXPECTED");
  const project = await prisma.project.findUnique({ where: { id: item.database?.projectId }, select: { id: true, code: true, name: true, status: true, endDate: true, externalSourceKey: true, plannedDurationValue: true, plannedDurationUnit: true, plannedDurationRaw: true, sourceMetadata: true, members: { select: { id: true, projectId: true, userId: true, role: true, assignedById: true, isActive: true, deletedAt: true } } } });
  if (!project || project.code !== "CT-2026-0019" || project.externalSourceKey !== item.externalSourceKey) throw new Error("BLOCKER_PROJECT_ID_OR_SOURCE_KEY_CHANGED");
  if (project.endDate) throw new Error(`BLOCKER_PROJECT_ALREADY_HAS_END_DATE:${project.endDate.toISOString()}`);
  const backupDir = path.join(process.cwd(), "docs", "qa", "reconciliation-snapshots");
  fs.mkdirSync(backupDir, { recursive: true });
  const backupPath = path.join(backupDir, `approved-diff-backup-${Date.now()}.json`);
  fs.writeFileSync(backupPath, JSON.stringify({ createdAt: new Date().toISOString(), sourceHash: diff.source?.excel?.sha256 ?? null, projects: [project], users: [], projectMembers: project.members }, null, 2), "utf8");
  const result = await prisma.$transaction(async (tx) => tx.project.update({ where: { id: project.id }, data: { endDate: new Date("2028-12-31T00:00:00.000Z") }, select: { id: true, code: true, endDate: true } }));
  console.log(JSON.stringify({ applied: true, changedFields: ["endDate"], project: result, backup: backupPath }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}).finally(async () => {
  await prisma.$disconnect();
});
