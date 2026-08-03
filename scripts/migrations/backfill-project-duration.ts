import "dotenv/config";
import fs from "node:fs";
import prisma from "../../src/lib/prisma";

type ParsedDuration = { value: number | null; unit: "DAY" | "MONTH" | null; raw: string | null };
const manifestPath = "docs/import/real-projects-import-manifest.json";

function parseDuration(input: unknown): ParsedDuration {
  const raw = typeof input === "string" ? input.trim() : "";
  if (!raw) return { value: null, unit: null, raw: raw || null };
  const match = raw.match(/^(\d+)\s*(ngày|day|days|tháng|month|months)?$/i);
  if (!match || !match[2]) return { value: null, unit: null, raw };
  const value = Number(match[1]);
  if (!Number.isSafeInteger(value) || value <= 0) return { value: null, unit: null, raw };
  const unit = /tháng|month/i.test(match[2]) ? "MONTH" : "DAY";
  return { value, unit, raw };
}

async function main() {
  const apply = process.argv.includes("--apply");
  if (!apply && !process.argv.includes("--dry-run")) throw new Error("Use --dry-run or --apply");
  if (!fs.existsSync(manifestPath)) throw new Error(`BLOCKER_MANIFEST_NOT_FOUND:${manifestPath}`);
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as { projects?: { externalSourceKey: string }[] };
  const keys = [...new Set((manifest.projects ?? []).map((project) => project.externalSourceKey).filter(Boolean))];
  if (keys.length !== 21) throw new Error(`BLOCKER_SOURCE_PROJECT_COUNT:${keys.length}; expected 21`);
  const projects = await prisma.project.findMany({
    where: { externalSourceKey: { in: keys } },
    select: { id: true, code: true, externalSourceKey: true, plannedDurationValue: true, plannedDurationUnit: true, plannedDurationRaw: true, sourceMetadata: true },
    orderBy: { code: "asc" },
  });
  if (projects.length !== 21) {
    const found = new Set(projects.map((project) => project.externalSourceKey));
    throw new Error(`BLOCKER_PROJECT_SET_MISMATCH:found=${projects.length};missing=${keys.filter((key) => !found.has(key)).join(",")}`);
  }
  const rows = projects.map((project) => {
    const metadata = project.sourceMetadata && typeof project.sourceMetadata === "object" ? project.sourceMetadata as Record<string, unknown> : {};
    const parsed = parseDuration(metadata.rawDuration);
    const unchanged = project.plannedDurationValue === parsed.value && project.plannedDurationUnit === parsed.unit && project.plannedDurationRaw === parsed.raw;
    return { project, parsed, action: unchanged ? "UNCHANGED" : "UPDATE" as const };
  });
  console.table(rows.map(({ project, parsed, action }) => ({ code: project.code, rawDuration: parsed.raw, value: parsed.value, unit: parsed.unit, action })));
  if (apply) {
    await prisma.$transaction(async (tx) => {
      for (const { project, parsed, action } of rows) {
        if (action === "UPDATE") await tx.project.update({ where: { id: project.id }, data: { plannedDurationValue: parsed.value, plannedDurationUnit: parsed.unit, plannedDurationRaw: parsed.raw } });
      }
    });
  }
  const counts = { UPDATE: rows.filter((row) => row.action === "UPDATE").length, UNCHANGED: rows.filter((row) => row.action === "UNCHANGED").length };
  console.log(JSON.stringify({ apply, projectCount: projects.length, counts }, null, 2));
  await prisma.$disconnect();
}

main().catch(async (error) => { console.error(error instanceof Error ? error.message : String(error)); await prisma.$disconnect(); process.exit(1); });
