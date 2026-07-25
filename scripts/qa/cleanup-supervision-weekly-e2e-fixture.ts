import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { assertSafeQaDatabase } from "./assert-safe-qa-database";
import { createSafeQaPrismaClient } from "./create-safe-qa-prisma-client";

const manifestPath = path.join(
  process.cwd(),
  "artifacts",
  "supervision-weekly-e2e",
  "fixture-manifest-20260723.json",
);

type Manifest = {
  databaseFingerprint: { database: string; host: string; port: string };
  users: Record<string, string>;
  projects: Record<string, string>;
  projectMembers: Record<string, string>;
  scopes: Record<string, string>;
  scopeProjects: Record<string, string>;
  templates: Record<string, string>;
  fieldProgressItems: Record<string, string>;
  dossiers: Record<string, string>;
  runtimeRows?: {
    shiftSelections?: string[];
    entries?: string[];
    transitions?: string[];
    quantities?: string[];
    progressRows?: string[];
    observations?: string[];
    revisions?: string[];
  };
};

const values = (record: Record<string, string>) => Object.values(record);

async function main() {
  const apply = process.argv.includes("--apply");
  const safety = assertSafeQaDatabase();
  const qaDatabaseUrl = process.env.QA_DATABASE_URL;
  if (!qaDatabaseUrl) throw new Error("QA_DATABASE_URL is required");

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as Manifest;
  if (
    manifest.databaseFingerprint.database !== safety.qaDatabase.database ||
    manifest.databaseFingerprint.host !== safety.qaDatabase.host ||
    manifest.databaseFingerprint.port !== safety.qaDatabase.port
  ) {
    throw new Error("Cleanup stopped: manifest and live QA database fingerprints differ.");
  }

  const ids = {
    users: values(manifest.users),
    projects: values(manifest.projects),
    projectMembers: values(manifest.projectMembers),
    scopes: values(manifest.scopes),
    scopeProjects: values(manifest.scopeProjects),
    templates: values(manifest.templates),
    fieldProgressItems: values(manifest.fieldProgressItems),
    dossiers: values(manifest.dossiers),
  };

  const { prisma, close } = createSafeQaPrismaClient(qaDatabaseUrl);
  try {
    const before = {
      users: await prisma.user.count({ where: { id: { in: ids.users } } }),
      projects: await prisma.project.count({ where: { id: { in: ids.projects } } }),
      projectMembers: await prisma.projectMember.count({ where: { id: { in: ids.projectMembers } } }),
      scopes: await prisma.supervisionScope.count({ where: { id: { in: ids.scopes } } }),
      scopeProjects: await prisma.supervisionScopeProject.count({ where: { id: { in: ids.scopeProjects } } }),
      templates: await prisma.fieldProgressTemplate.count({ where: { id: { in: ids.templates } } }),
      fieldProgressItems: await prisma.fieldProgressItem.count({ where: { id: { in: ids.fieldProgressItems } } }),
      dossiers: await prisma.supervisionWeeklyDossier.count({ where: { id: { in: ids.dossiers } } }),
    };
    const expected = Object.fromEntries(
      Object.entries(ids).map(([key, list]) => [key, list.length]),
    );
    if (Object.entries(expected).some(([key, count]) => before[key as keyof typeof before] !== count)) {
      throw new Error(`Cleanup stopped: manifest IDs are incomplete in QA. ${JSON.stringify({ before, expected })}`);
    }

    const preview = {
      apply,
      databaseFingerprint: safety.qaDatabase,
      before,
      exactIds: ids,
      runtimeRows: manifest.runtimeRows ?? {},
    };
    if (!apply) {
      console.log(JSON.stringify(preview, null, 2));
      return;
    }

    const deleted = await prisma.$transaction(async (tx) => {
      const dossiers = await tx.supervisionWeeklyDossier.deleteMany({ where: { id: { in: ids.dossiers } } });
      const workItems = [
        manifest.fieldProgressItems.workA1,
        manifest.fieldProgressItems.workA2,
        manifest.fieldProgressItems.workB1,
      ].filter(Boolean);
      const categories = [
        manifest.fieldProgressItems.categoryA,
        manifest.fieldProgressItems.categoryB,
      ].filter(Boolean);
      const fieldProgressWorkItems = await tx.fieldProgressItem.deleteMany({ where: { id: { in: workItems } } });
      const fieldProgressCategories = await tx.fieldProgressItem.deleteMany({ where: { id: { in: categories } } });
      const templates = await tx.fieldProgressTemplate.deleteMany({ where: { id: { in: ids.templates } } });
      const scopeProjects = await tx.supervisionScopeProject.deleteMany({ where: { id: { in: ids.scopeProjects } } });
      const scopes = await tx.supervisionScope.deleteMany({ where: { id: { in: ids.scopes } } });
      const projectMembers = await tx.projectMember.deleteMany({ where: { id: { in: ids.projectMembers } } });
      const projects = await tx.project.deleteMany({ where: { id: { in: ids.projects } } });
      const users = await tx.user.deleteMany({ where: { id: { in: ids.users } } });
      return {
        dossiers: dossiers.count,
        fieldProgressItems: fieldProgressWorkItems.count + fieldProgressCategories.count,
        templates: templates.count,
        scopeProjects: scopeProjects.count,
        scopes: scopes.count,
        projectMembers: projectMembers.count,
        projects: projects.count,
        users: users.count,
      };
    });

    const after = {
      users: await prisma.user.count({ where: { id: { in: ids.users } } }),
      projects: await prisma.project.count({ where: { id: { in: ids.projects } } }),
      projectMembers: await prisma.projectMember.count({ where: { id: { in: ids.projectMembers } } }),
      scopes: await prisma.supervisionScope.count({ where: { id: { in: ids.scopes } } }),
      scopeProjects: await prisma.supervisionScopeProject.count({ where: { id: { in: ids.scopeProjects } } }),
      templates: await prisma.fieldProgressTemplate.count({ where: { id: { in: ids.templates } } }),
      fieldProgressItems: await prisma.fieldProgressItem.count({ where: { id: { in: ids.fieldProgressItems } } }),
      dossiers: await prisma.supervisionWeeklyDossier.count({ where: { id: { in: ids.dossiers } } }),
    };
    if (Object.values(after).some((count) => count !== 0)) {
      throw new Error(`Cleanup verification failed: ${JSON.stringify(after)}`);
    }

    console.log(JSON.stringify({ ...preview, deleted, after }, null, 2));
  } finally {
    await close();
  }
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Unknown fixture cleanup failure");
  process.exitCode = 1;
});
