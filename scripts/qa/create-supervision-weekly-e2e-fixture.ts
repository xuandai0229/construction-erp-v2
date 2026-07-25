import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { assertSafeQaDatabase } from "./assert-safe-qa-database";
import { createSafeQaPrismaClient } from "./create-safe-qa-prisma-client";

const PREFIX = "QA-SUPERVISION-E2E-";
const manifestPath = path.join(
  process.cwd(),
  "artifacts",
  "supervision-weekly-e2e",
  "fixture-manifest-20260723.json",
);

type UserFixture = {
  id: string;
  username: string;
  email: string;
  name: string;
  role: "ADMIN" | "DIRECTOR" | "SUPERVISION_HEAD";
};

const id = () => randomUUID();
const date = (value: string) => new Date(`${value}T00:00:00.000Z`);

async function main() {
  const safety = assertSafeQaDatabase();
  const qaDatabaseUrl = process.env.QA_DATABASE_URL;
  const password = process.env.QA_SUPERVISION_E2E_PASSWORD;
  if (!qaDatabaseUrl) throw new Error("QA_DATABASE_URL is required");
  if (!password) throw new Error("QA_SUPERVISION_E2E_PASSWORD is required");
  if (fs.existsSync(manifestPath)) {
    throw new Error(`Fixture manifest already exists: ${manifestPath}`);
  }

  const users: UserFixture[] = [
    { id: id(), username: "QA_ADMIN_A", email: "qa-admin-a@supervision-e2e.local", name: `${PREFIX}QA_ADMIN_A`, role: "ADMIN" },
    { id: id(), username: "QA_SUPERVISOR_A", email: "qa-supervisor-a@supervision-e2e.local", name: `${PREFIX}QA_SUPERVISOR_A`, role: "SUPERVISION_HEAD" },
    { id: id(), username: "QA_REVIEWER_A", email: "qa-reviewer-a@supervision-e2e.local", name: `${PREFIX}QA_REVIEWER_A`, role: "DIRECTOR" },
    { id: id(), username: "QA_USER_PROJECT_A", email: "qa-user-project-a@supervision-e2e.local", name: `${PREFIX}QA_USER_PROJECT_A`, role: "SUPERVISION_HEAD" },
    { id: id(), username: "QA_USER_PROJECT_B", email: "qa-user-project-b@supervision-e2e.local", name: `${PREFIX}QA_USER_PROJECT_B`, role: "SUPERVISION_HEAD" },
  ];
  const userByName = Object.fromEntries(users.map((user) => [user.username, user]));

  const ids = {
    projects: {
      A: id(),
      B: id(),
    },
    projectMembers: {
      supervisorA: id(),
      supervisorB: id(),
      userA: id(),
      userB: id(),
    },
    scopes: {
      supervisor: id(),
      userA: id(),
      userB: id(),
    },
    scopeProjects: {
      supervisorA: id(),
      supervisorB: id(),
      userA: id(),
      userB: id(),
    },
    templates: {
      A: id(),
      B: id(),
    },
    fieldProgressItems: {
      categoryA: id(),
      workA1: id(),
      workA2: id(),
      categoryB: id(),
      workB1: id(),
    },
    dossiers: {
      result: id(),
      nextWeek: id(),
    },
    revisions: {
      resultCreate: id(),
      nextWeekCreate: id(),
    },
  };

  const manifest = {
    status: "PREPARING",
    prefix: PREFIX,
    timestamp: new Date().toISOString(),
    databaseFingerprint: safety.qaDatabase,
    users: Object.fromEntries(users.map((user) => [user.username, user.id])),
    ...ids,
    rowIds: [
      ...users.map((user) => user.id),
      ...Object.values(ids.projects),
      ...Object.values(ids.projectMembers),
      ...Object.values(ids.scopes),
      ...Object.values(ids.scopeProjects),
      ...Object.values(ids.templates),
      ...Object.values(ids.fieldProgressItems),
      ...Object.values(ids.dossiers),
      ...Object.values(ids.revisions),
    ],
  };

  fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), { encoding: "utf8", flag: "wx" });

  const { prisma, close } = createSafeQaPrismaClient(qaDatabaseUrl);
  let committed = false;
  try {
    const existingUsers = await prisma.user.count({ where: { OR: users.map((user) => ({ username: user.username })) } });
    const existingProjects = await prisma.project.count({ where: { code: { startsWith: PREFIX } } });
    const existingDossiers = await prisma.supervisionWeeklyDossier.count({ where: { reportNumber: { startsWith: PREFIX } } });
    if (existingUsers || existingProjects || existingDossiers) {
      throw new Error("QA fixture prefix already exists in the target database; refusing to reuse it");
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.$transaction(async (tx) => {
      await tx.user.createMany({
        data: users.map((user) => ({
          id: user.id,
          username: user.username,
          email: user.email,
          name: user.name,
          role: user.role,
          password: passwordHash,
          isActive: true,
        })),
      });

      await tx.project.createMany({
        data: [
          { id: ids.projects.A, code: `${PREFIX}PROJECT-A`, name: `${PREFIX}PROJECT-A`, location: `${PREFIX}LOCATION-A`, status: "ACTIVE" },
          { id: ids.projects.B, code: `${PREFIX}PROJECT-B`, name: `${PREFIX}PROJECT-B`, location: `${PREFIX}LOCATION-B`, status: "ACTIVE" },
        ],
      });

      await tx.projectMember.createMany({
        data: [
          { id: ids.projectMembers.supervisorA, projectId: ids.projects.A, userId: userByName.QA_SUPERVISOR_A.id, role: "SUPERVISOR", assignedById: userByName.QA_ADMIN_A.id },
          { id: ids.projectMembers.supervisorB, projectId: ids.projects.B, userId: userByName.QA_SUPERVISOR_A.id, role: "SUPERVISOR", assignedById: userByName.QA_ADMIN_A.id },
          { id: ids.projectMembers.userA, projectId: ids.projects.A, userId: userByName.QA_USER_PROJECT_A.id, role: "SUPERVISOR", assignedById: userByName.QA_ADMIN_A.id },
          { id: ids.projectMembers.userB, projectId: ids.projects.B, userId: userByName.QA_USER_PROJECT_B.id, role: "SUPERVISOR", assignedById: userByName.QA_ADMIN_A.id },
        ],
      });

      await tx.supervisionScope.createMany({
        data: [
          { id: ids.scopes.supervisor, userId: userByName.QA_SUPERVISOR_A.id, scopeType: "SELECTED_PROJECTS", createdById: userByName.QA_ADMIN_A.id },
          { id: ids.scopes.userA, userId: userByName.QA_USER_PROJECT_A.id, scopeType: "SELECTED_PROJECTS", createdById: userByName.QA_ADMIN_A.id },
          { id: ids.scopes.userB, userId: userByName.QA_USER_PROJECT_B.id, scopeType: "SELECTED_PROJECTS", createdById: userByName.QA_ADMIN_A.id },
        ],
      });
      await tx.supervisionScopeProject.createMany({
        data: [
          { id: ids.scopeProjects.supervisorA, scopeId: ids.scopes.supervisor, projectId: ids.projects.A },
          { id: ids.scopeProjects.supervisorB, scopeId: ids.scopes.supervisor, projectId: ids.projects.B },
          { id: ids.scopeProjects.userA, scopeId: ids.scopes.userA, projectId: ids.projects.A },
          { id: ids.scopeProjects.userB, scopeId: ids.scopes.userB, projectId: ids.projects.B },
        ],
      });

      await tx.fieldProgressTemplate.createMany({
        data: [
          { id: ids.templates.A, projectId: ids.projects.A, name: `${PREFIX}TEMPLATE-A`, status: "ACTIVE", createdById: userByName.QA_ADMIN_A.id },
          { id: ids.templates.B, projectId: ids.projects.B, name: `${PREFIX}TEMPLATE-B`, status: "ACTIVE", createdById: userByName.QA_ADMIN_A.id },
        ],
      });
      await tx.fieldProgressItem.createMany({
        data: [
          { id: ids.fieldProgressItems.categoryA, projectId: ids.projects.A, templateId: ids.templates.A, sortOrder: 1, level: 0, itemType: "GROUP", code: "QA-GROUP-A", categoryName: `${PREFIX}HẠNG-MỤC-A`, createdById: userByName.QA_ADMIN_A.id },
          { id: ids.fieldProgressItems.workA1, projectId: ids.projects.A, templateId: ids.templates.A, parentId: ids.fieldProgressItems.categoryA, sortOrder: 1, level: 1, itemType: "WORK", code: "QA-WORK-A1", workContent: `${PREFIX}CÔNG-VIỆC-A1`, unit: "m³", createdById: userByName.QA_ADMIN_A.id },
          { id: ids.fieldProgressItems.workA2, projectId: ids.projects.A, templateId: ids.templates.A, parentId: ids.fieldProgressItems.categoryA, sortOrder: 2, level: 1, itemType: "WORK", code: "QA-WORK-A2", workContent: `${PREFIX}CÔNG-VIỆC-A2`, unit: "m²", createdById: userByName.QA_ADMIN_A.id },
          { id: ids.fieldProgressItems.categoryB, projectId: ids.projects.B, templateId: ids.templates.B, sortOrder: 1, level: 0, itemType: "GROUP", code: "QA-GROUP-B", categoryName: `${PREFIX}HẠNG-MỤC-B`, createdById: userByName.QA_ADMIN_A.id },
          { id: ids.fieldProgressItems.workB1, projectId: ids.projects.B, templateId: ids.templates.B, parentId: ids.fieldProgressItems.categoryB, sortOrder: 1, level: 1, itemType: "WORK", code: "QA-WORK-B1", workContent: `${PREFIX}CÔNG-VIỆC-B1`, unit: "kg", createdById: userByName.QA_ADMIN_A.id },
        ],
      });

      await tx.supervisionWeeklyDossier.createMany({
        data: [
          {
            id: ids.dossiers.result,
            reportNumber: `${PREFIX}RESULT`,
            weekStart: date("2026-07-20"),
            weekEnd: date("2026-07-26"),
            nextWeekStart: date("2026-07-27"),
            nextWeekEnd: date("2026-08-02"),
            place: `${PREFIX}PLACE-A`,
            recipientName: `${PREFIX}REVIEWER`,
            recipientTitle: "Giám đốc QA",
            createdById: userByName.QA_SUPERVISOR_A.id,
          },
          {
            id: ids.dossiers.nextWeek,
            reportNumber: `${PREFIX}NEXT-WEEK`,
            weekStart: date("2026-08-03"),
            weekEnd: date("2026-08-09"),
            nextWeekStart: date("2026-08-10"),
            nextWeekEnd: date("2026-08-16"),
            place: `${PREFIX}PLACE-B`,
            recipientName: `${PREFIX}REVIEWER`,
            recipientTitle: "Giám đốc QA",
            createdById: userByName.QA_USER_PROJECT_B.id,
          },
        ],
      });
      await tx.supervisionWeeklyRevision.createMany({
        data: [
          { id: ids.revisions.resultCreate, dossierId: ids.dossiers.result, actorId: userByName.QA_SUPERVISOR_A.id, action: "CREATE", toStatus: "DRAFT", version: 1, changedFields: `${PREFIX}CREATE-RESULT` },
          { id: ids.revisions.nextWeekCreate, dossierId: ids.dossiers.nextWeek, actorId: userByName.QA_USER_PROJECT_B.id, action: "CREATE", toStatus: "DRAFT", version: 1, changedFields: `${PREFIX}CREATE-NEXT-WEEK` },
        ],
      });
    });
    committed = true;

    const readyManifest = { ...manifest, status: "READY", committedAt: new Date().toISOString() };
    fs.writeFileSync(manifestPath, JSON.stringify(readyManifest, null, 2), "utf8");
    console.log(JSON.stringify({
      created: true,
      manifestPath,
      databaseFingerprint: safety.qaDatabase,
      counts: {
        users: users.length,
        projects: 2,
        dossiers: 2,
        fieldProgressItems: 5,
      },
    }, null, 2));
  } finally {
    await close();
    if (!committed && fs.existsSync(manifestPath)) fs.unlinkSync(manifestPath);
  }
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Unknown fixture creation failure");
  process.exitCode = 1;
});
