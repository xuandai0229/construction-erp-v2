import fs from "node:fs";
import path from "node:path";
import "dotenv/config";
import type { UserRole } from "@prisma/client";
import { assertSafeQaDatabase } from "./assert-safe-qa-database";
import { createSafeQaPrismaClient, verifyQaPrismaFingerprint } from "./create-safe-qa-prisma-client";
import { canManageProjects, canViewAllProjects } from "../../src/lib/rbac";
import {
  canAuthorSupervisionWeekly,
  canLockSupervisionWeeklyDossier,
  canReadSupervisionWeekly,
  canReviewSupervisionWeekly,
} from "../../src/lib/supervision-weekly/permissions";

const PREFIX = "QA-CONSTRUCTION-SUPERVISOR-FINAL-";
const artifactDirectory = path.resolve("artifacts/construction-supervisor-final");
const manifestPath = path.join(artifactDirectory, "fixture-manifest-20260727.json");
const evidencePath = path.join(artifactDirectory, "database-audit-runtime-evidence-20260727.json");

async function main() {
  const safe = assertSafeQaDatabase();
  const qaUrl = process.env.QA_DATABASE_URL;
  if (!qaUrl) throw new Error("QA_DATABASE_URL is required");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  if (manifest.prefix !== PREFIX || manifest.databaseFingerprint.database !== safe.qaDatabase.database) {
    throw new Error("Manifest prefix/fingerprint does not match the guarded QA database");
  }

  const { prisma, close } = createSafeQaPrismaClient(qaUrl);
  try {
    await verifyQaPrismaFingerprint(prisma, safe.qaDatabase);
    const officerAId = manifest.users.OFFICER_A.id as string;
    const projectC = await prisma.project.findUnique({ where: { code: `${PREFIX}PROJECT-C` }, select: { id: true, code: true, createdAt: true, deletedAt: true } });
    if (!projectC) throw new Error("Project C runtime fixture was not found");
    const projectCFolders = await prisma.documentFolder.findMany({ where: { projectId: projectC.id }, select: { id: true, name: true }, orderBy: { createdAt: "asc" } });
    const runtimeDossier = await prisma.supervisionWeeklyDossier.findFirst({
      where: { reportNumber: `${PREFIX}RUNTIME-OWN`, createdById: officerAId },
      include: {
        entries: { select: { id: true, dossierId: true, projectId: true, categoryItemId: true, inspectionWorkItemId: true, displayText: true } },
        shiftSelections: { select: { id: true } },
        quantities: { select: { id: true } },
        transitions: { select: { id: true } },
        progressRows: { select: { id: true } },
        observations: { select: { id: true } },
        revisions: { select: { id: true, action: true, fromStatus: true, toStatus: true, actorId: true, createdAt: true }, orderBy: { createdAt: "asc" } },
        attachments: { select: { id: true } },
      },
    });
    if (!runtimeDossier) throw new Error("Authenticated runtime dossier was not found");

    const allDossierIds = [...Object.values(manifest.dossiers) as string[], runtimeDossier.id];
    const allWeeklyChildren = await Promise.all([
      prisma.supervisionWeeklyEntry.findMany({ where: { dossierId: { in: allDossierIds } }, select: { id: true } }),
      prisma.supervisionWeeklyShiftSelection.findMany({ where: { dossierId: { in: allDossierIds } }, select: { id: true } }),
      prisma.supervisionWeeklyQuantity.findMany({ where: { dossierId: { in: allDossierIds } }, select: { id: true } }),
      prisma.supervisionWeeklyTransition.findMany({ where: { dossierId: { in: allDossierIds } }, select: { id: true } }),
      prisma.supervisionWeeklyProgress.findMany({ where: { dossierId: { in: allDossierIds } }, select: { id: true } }),
      prisma.supervisionWeeklyObservation.findMany({ where: { dossierId: { in: allDossierIds } }, select: { id: true } }),
      prisma.supervisionWeeklyRevision.findMany({ where: { dossierId: { in: allDossierIds } }, select: { id: true } }),
      prisma.supervisionWeeklyAttachment.findMany({ where: { dossierId: { in: allDossierIds } }, select: { id: true } }),
    ]);

    const fixtureUserIds = Object.values(manifest.users).map((user: any) => user.id as string);
    const auditEvents = await prisma.auditLog.findMany({
      where: { userId: { in: fixtureUserIds }, createdAt: { gte: new Date(manifest.timestamp) } },
      orderBy: { createdAt: "asc" },
    });
    const auditSerialized = JSON.stringify(auditEvents);
    const secretPatterns = [/password/i, /authorization/i, /set-cookie/i, /database_url/i, /postgres(?:ql)?:\/\//i];
    const secretLeakPatterns = secretPatterns.filter((pattern) => pattern.test(auditSerialized)).map(String);

    const sourceSnapshots = {
      projects: await prisma.project.findMany({ where: { id: { in: [manifest.projects.A, manifest.projects.B, projectC.id] } }, select: { id: true, code: true, status: true, deletedAt: true, updatedAt: true }, orderBy: { code: "asc" } }),
      reports: await prisma.siteReport.findMany({ where: { id: { in: Object.values(manifest.reports) as string[] } }, select: { id: true, status: true, updatedAt: true } }),
      materials: await prisma.materialRequest.findMany({ where: { id: { in: Object.values(manifest.materials.requests) as string[] } }, select: { id: true, status: true, updatedAt: true } }),
      tasks: await prisma.workTask.findMany({ where: { id: { in: Object.values(manifest.tasks) as string[] } }, select: { id: true, version: true, lifecycle: true, updatedAt: true } }),
      documents: await prisma.document.findMany({ where: { id: { in: Object.values(manifest.documents.files) as string[] } }, select: { id: true, status: true, size: true, updatedAt: true } }),
      approvals: await prisma.approvalRequest.findMany({ where: { id: { in: Object.values(manifest.approvals) as string[] } }, select: { id: true, status: true, updatedAt: true } }),
    };

    const roles: UserRole[] = ["ADMIN", "DIRECTOR", "DEPUTY_DIRECTOR", "SUPERVISION_HEAD", "CHIEF_COMMANDER", "MANAGER", "ENGINEER", "STAFF", "CONSTRUCTION_SUPERVISOR"];
    const roleMatrix = roles.map((role) => ({
      role,
      projectReadAll: canViewAllProjects(role),
      projectManage: canManageProjects(role),
      weeklyReadAll: canReadSupervisionWeekly(role),
      weeklyCreate: canAuthorSupervisionWeekly(role),
      weeklyEditOwn: canAuthorSupervisionWeekly(role),
      weeklyReview: canReviewSupervisionWeekly(role),
      weeklyLock: canLockSupervisionWeeklyDossier(role),
      sourceMutation: role !== "CONSTRUCTION_SUPERVISOR" && canManageProjects(role),
    }));

    manifest.projects.C = projectC.id;
    manifest.documents.folders.C = projectCFolders.map((folder) => folder.id);
    manifest.dossiers.runtimeOwn = runtimeDossier.id;
    manifest.weeklyExactIds = {
      entries: allWeeklyChildren[0].map((row) => row.id),
      shiftSelections: allWeeklyChildren[1].map((row) => row.id),
      quantities: allWeeklyChildren[2].map((row) => row.id),
      transitions: allWeeklyChildren[3].map((row) => row.id),
      progressRows: allWeeklyChildren[4].map((row) => row.id),
      observations: allWeeklyChildren[5].map((row) => row.id),
      revisions: allWeeklyChildren[6].map((row) => row.id),
      attachments: allWeeklyChildren[7].map((row) => row.id),
    };
    manifest.auditEvents = auditEvents.map((event) => event.id);
    manifest.runtimeCollectedAt = new Date().toISOString();
    fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

    const evidence = {
      status: "COLLECTED",
      collectedAt: new Date().toISOString(),
      databaseFingerprint: safe.qaDatabase,
      applicationDatabaseFingerprint: safe.productionDatabase,
      officerA: {
        id: officerAId,
        currentRole: (await prisma.user.findUniqueOrThrow({ where: { id: officerAId }, select: { role: true } })).role,
        memberships: await prisma.projectMember.count({ where: { userId: officerAId } }),
        notificationsAddressedToOfficer: await prisma.notification.count({ where: { userId: officerAId, createdAt: { gte: new Date(manifest.timestamp) } } }),
      },
      deploymentProjects: {
        activeCount: await prisma.project.count({ where: { deletedAt: null } }),
        fixtureIds: [manifest.projects.A, manifest.projects.B, projectC.id],
        projectC,
        projectCFolders,
      },
      runtimeDossier: {
        id: runtimeDossier.id,
        createdById: runtimeDossier.createdById,
        status: runtimeDossier.status,
        lockVersion: runtimeDossier.lockVersion,
        version: runtimeDossier.version,
        reportNumber: runtimeDossier.reportNumber,
        entries: runtimeDossier.entries,
        shiftSelectionCount: runtimeDossier.shiftSelections.length,
        revisions: runtimeDossier.revisions,
        containsClientTempId: runtimeDossier.entries.some((entry) => /^temp-|^client-|^new-/i.test(entry.id)),
      },
      sourceSnapshots,
      audit: {
        count: auditEvents.length,
        actions: [...new Set(auditEvents.map((event) => event.action))].sort(),
        events: auditEvents,
        secretLeakPatterns,
      },
      roleMatrix,
      exactIdCounts: Object.fromEntries(Object.entries(manifest.weeklyExactIds).map(([key, value]) => [key, (value as string[]).length])),
    };
    fs.writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
    console.log(JSON.stringify({ evidencePath, manifestPath, memberships: evidence.officerA.memberships, projectCount: evidence.deploymentProjects.activeCount, runtimeDossier: evidence.runtimeDossier, auditActions: evidence.audit.actions, auditSecretLeaks: secretLeakPatterns }, null, 2));
  } finally {
    await close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
