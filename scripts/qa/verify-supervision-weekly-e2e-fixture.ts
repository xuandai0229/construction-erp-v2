import "dotenv/config";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { assertSafeQaDatabase } from "./assert-safe-qa-database";
import { createSafeQaPrismaClient } from "./create-safe-qa-prisma-client";

const manifestPath = join(
  process.cwd(),
  "artifacts",
  "supervision-weekly-e2e",
  "fixture-manifest-20260723.json",
);

type Manifest = {
  status: string;
  prefix: string;
  databaseFingerprint: {
    database: string;
    host: string;
    port: string;
  };
  users: Record<string, string>;
  projects: Record<string, string>;
  projectMembers: Record<string, string>;
  scopes: Record<string, string>;
  scopeProjects: Record<string, string>;
  templates: Record<string, string>;
  fieldProgressItems: Record<string, string>;
  dossiers: Record<string, string>;
  revisions: Record<string, string>;
};

async function main() {
  const safety = assertSafeQaDatabase();
  const qaUrl = process.env.QA_DATABASE_URL;
  if (!qaUrl) throw new Error("QA_DATABASE_URL is required");

  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as Manifest;
  if (manifest.status !== "READY") throw new Error("Fixture manifest is not READY");
  if (JSON.stringify(manifest.databaseFingerprint) !== JSON.stringify(safety.qaDatabase)) {
    throw new Error("Fixture manifest database fingerprint does not match QA_DATABASE_URL");
  }

  const { prisma, close } = createSafeQaPrismaClient(qaUrl);
  try {
    const [
      users,
      projects,
      projectMembers,
      scopes,
      scopeProjects,
      templates,
      fieldProgressItems,
      dossiers,
      revisions,
      prefixedUsers,
      prefixedProjects,
      prefixedDossiers,
    ] = await Promise.all([
      prisma.user.count({ where: { id: { in: Object.values(manifest.users) } } }),
      prisma.project.count({ where: { id: { in: Object.values(manifest.projects) } } }),
      prisma.projectMember.count({ where: { id: { in: Object.values(manifest.projectMembers) } } }),
      prisma.supervisionScope.count({ where: { id: { in: Object.values(manifest.scopes) } } }),
      prisma.supervisionScopeProject.count({ where: { id: { in: Object.values(manifest.scopeProjects) } } }),
      prisma.fieldProgressTemplate.count({ where: { id: { in: Object.values(manifest.templates) } } }),
      prisma.fieldProgressItem.count({ where: { id: { in: Object.values(manifest.fieldProgressItems) } } }),
      prisma.supervisionWeeklyDossier.count({ where: { id: { in: Object.values(manifest.dossiers) } } }),
      prisma.supervisionWeeklyRevision.count({ where: { id: { in: Object.values(manifest.revisions) } } }),
      prisma.user.count({ where: { name: { startsWith: manifest.prefix } } }),
      prisma.project.count({ where: { code: { startsWith: manifest.prefix } } }),
      prisma.supervisionWeeklyDossier.count({ where: { reportNumber: { startsWith: manifest.prefix } } }),
    ]);

    const actual = {
      users,
      projects,
      projectMembers,
      scopes,
      scopeProjects,
      templates,
      fieldProgressItems,
      dossiers,
      revisions,
    };
    const expected = {
      users: Object.keys(manifest.users).length,
      projects: Object.keys(manifest.projects).length,
      projectMembers: Object.keys(manifest.projectMembers).length,
      scopes: Object.keys(manifest.scopes).length,
      scopeProjects: Object.keys(manifest.scopeProjects).length,
      templates: Object.keys(manifest.templates).length,
      fieldProgressItems: Object.keys(manifest.fieldProgressItems).length,
      dossiers: Object.keys(manifest.dossiers).length,
      revisions: Object.keys(manifest.revisions).length,
    };
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      throw new Error(`Fixture record mismatch: ${JSON.stringify({ expected, actual })}`);
    }
    if (
      prefixedUsers !== expected.users ||
      prefixedProjects !== expected.projects ||
      prefixedDossiers !== expected.dossiers
    ) {
      throw new Error("Fixture prefix counts indicate missing or duplicated fixture roots");
    }

    console.log(JSON.stringify({
      valid: true,
      databaseFingerprint: safety.qaDatabase,
      manifestPath,
      counts: actual,
      prefixCounts: {
        users: prefixedUsers,
        projects: prefixedProjects,
        dossiers: prefixedDossiers,
      },
    }, null, 2));
  } finally {
    await close();
  }
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Unknown fixture verification failure");
  process.exitCode = 1;
});
