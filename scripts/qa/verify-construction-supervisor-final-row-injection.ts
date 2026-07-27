import fs from "node:fs";
import path from "node:path";
import "dotenv/config";
import { encodeReply, createTemporaryReferenceSet } from "next/dist/compiled/react-server-dom-webpack/client.node";
import { assertSafeQaDatabase } from "./assert-safe-qa-database";
import { createSafeQaPrismaClient, verifyQaPrismaFingerprint } from "./create-safe-qa-prisma-client";

const origin = "http://127.0.0.1:3100";
const artifactDirectory = path.resolve("artifacts/construction-supervisor-final");
const manifestPath = path.join(artifactDirectory, "fixture-manifest-20260727.json");
const evidencePath = path.join(artifactDirectory, "row-injection-direct-request-evidence-20260727.json");
const referenceManifestPath = path.resolve(".next-construction-supervisor-final/dev/server/server-reference-manifest.json");

async function login(email: string, password: string) {
  const response = await fetch(`${origin}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const cookie = response.headers.get("set-cookie")?.split(";")[0];
  if (response.status !== 200 || !cookie) throw new Error(`QA login failed: HTTP ${response.status}`);
  return cookie;
}

async function main() {
  const safe = assertSafeQaDatabase();
  const qaUrl = process.env.QA_DATABASE_URL;
  const password = process.env.QA_SUPERVISION_E2E_PASSWORD;
  if (!qaUrl || !password) throw new Error("QA environment is incomplete");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const references = JSON.parse(fs.readFileSync(referenceManifestPath, "utf8"));
  const actionEntry = Object.entries(references.node as Record<string, { exportedName?: string }>).find(([, value]) => value.exportedName === "saveSupervisionWeeklyDossier");
  if (!actionEntry) throw new Error("Compiled saveSupervisionWeeklyDossier action was not found");
  const actionId = actionEntry[0];
  const ownDraft = manifest.dossiers.ownDraft as string;
  const otherRowId = manifest.weeklyRows.otherResult as string;
  const projectB = manifest.projects.B as string;
  const categoryA = manifest.fieldProgressItems.categoryA as string;
  const officer = manifest.users.OFFICER_A;
  const { prisma, close } = createSafeQaPrismaClient(qaUrl);

  try {
    await verifyQaPrismaFingerprint(prisma, safe.qaDatabase);
    const snapshot = async () => ({
      target: await prisma.supervisionWeeklyDossier.findUniqueOrThrow({ where: { id: ownDraft }, select: { id: true, status: true, lockVersion: true, updatedAt: true, reportNumber: true, place: true } }),
      targetEntryIds: (await prisma.supervisionWeeklyEntry.findMany({ where: { dossierId: ownDraft }, select: { id: true }, orderBy: { id: "asc" } })).map((row) => row.id),
      targetRevisionIds: (await prisma.supervisionWeeklyRevision.findMany({ where: { dossierId: ownDraft }, select: { id: true }, orderBy: { id: "asc" } })).map((row) => row.id),
      foreignRow: await prisma.supervisionWeeklyEntry.findUniqueOrThrow({ where: { id: otherRowId }, select: { id: true, dossierId: true, updatedAt: true } }),
      project: await prisma.project.findUniqueOrThrow({ where: { id: projectB }, select: { id: true, updatedAt: true } }),
    });
    const before = await snapshot();
    const cookie = await login(officer.email, password);
    const input = {
      expectedLockVersion: before.target.lockVersion,
      reportNumber: before.target.reportNumber,
      place: before.target.place,
      recipientName: "QA-CONSTRUCTION-SUPERVISOR-FINAL-QA-CS-REVIEWER",
      recipientTitle: "Giám đốc",
      shiftSelections: [{ documentType: "RESULT", entryDate: "2026-09-08", shift: "MORNING" }],
      entries: [{
        id: otherRowId,
        documentType: "RESULT",
        entryDate: "2026-09-08",
        shift: "MORNING",
        sortOrder: 0,
        inputMode: "PROJECT_MANUAL_ITEM",
        projectId: projectB,
        projectNameSnapshot: "QA-CONSTRUCTION-SUPERVISOR-FINAL-PROJECT-B",
        manualWorkItemName: "CROSS-DOSSIER-INJECTION",
        displayText: "QA-CONSTRUCTION-SUPERVISOR-FINAL-CROSS-DOSSIER-INJECTION",
        inspectionContent: "Must be rejected",
        result: "Must not persist",
      }],
      observations: [],
      transitions: [],
      quantities: [],
      progressRows: [],
    };
    const body = await encodeReply([ownDraft, input], { temporaryReferences: createTemporaryReferenceSet() });
    const response = await fetch(`${origin}/reports/weekly-inspection/${ownDraft}/edit`, {
      method: "POST",
      headers: {
        Accept: "text/x-component",
        Cookie: cookie,
        Origin: origin,
        "next-action": actionId,
      },
      body,
      redirect: "manual",
    });
    const responseText = await response.text();
    const after = await snapshot();
    const denialAudit = await prisma.auditLog.findFirst({
      where: { userId: officer.id, action: "CROSS_DOSSIER_ROW_REJECTED", entityId: ownDraft },
      orderBy: { createdAt: "desc" },
    });
    const unchanged = JSON.stringify(before) === JSON.stringify(after);

    const crossProjectInput = {
      ...input,
      entries: [{
        documentType: "RESULT",
        entryDate: "2026-09-08",
        shift: "MORNING",
        sortOrder: 0,
        inputMode: "PROJECT_WORK_ITEM",
        projectId: projectB,
        projectNameSnapshot: "QA-CONSTRUCTION-SUPERVISOR-FINAL-PROJECT-B",
        categoryItemId: categoryA,
        categoryNameSnapshot: "QA-CONSTRUCTION-SUPERVISOR-FINAL-CATEGORY-A",
        displayText: "QA-CONSTRUCTION-SUPERVISOR-FINAL-CROSS-PROJECT-INJECTION",
        inspectionContent: "Must be rejected",
        result: "Must not persist",
      }],
    };
    const crossProjectBody = await encodeReply([ownDraft, crossProjectInput], { temporaryReferences: createTemporaryReferenceSet() });
    const crossProjectResponse = await fetch(`${origin}/reports/weekly-inspection/${ownDraft}/edit`, {
      method: "POST",
      headers: { Accept: "text/x-component", Cookie: cookie, Origin: origin, "next-action": actionId },
      body: crossProjectBody,
      redirect: "manual",
    });
    const crossProjectResponseText = await crossProjectResponse.text();
    const afterCrossProject = await snapshot();
    const crossProjectAudit = await prisma.auditLog.findFirst({
      where: { userId: officer.id, action: "CROSS_PROJECT_RESOURCE_REJECTED", entityId: categoryA },
      orderBy: { createdAt: "desc" },
    });
    const crossProjectUnchanged = JSON.stringify(after) === JSON.stringify(afterCrossProject);
    const evidence = {
      status: response.status >= 400 && unchanged && denialAudit && crossProjectResponse.status >= 400 && crossProjectUnchanged && crossProjectAudit ? "PASS" : "FAIL",
      testedAt: new Date().toISOString(),
      databaseFingerprint: safe.qaDatabase,
      request: {
        principal: "QA-CS-OFFICER-A",
        route: `/reports/weekly-inspection/${ownDraft}/edit`,
        action: "saveSupervisionWeeklyDossier",
        targetDossierId: ownDraft,
        injectedRowId: otherRowId,
        injectedRowOwnerDossierId: before.foreignRow.dossierId,
      },
      response: {
        status: response.status,
        contentType: response.headers.get("content-type"),
        returnedFile: Boolean(response.headers.get("content-disposition")),
        containsConflictMarker: /conflict|cross.dossier|foreign|row/i.test(responseText),
        bodyBytes: Buffer.byteLength(responseText),
      },
      before,
      after,
      databaseUnchanged: unchanged,
      auditEvent: denialAudit,
      crossProjectResourceInjection: {
        request: { projectId: projectB, categoryItemId: categoryA, relationship: "category belongs to Project A but request claims Project B" },
        response: {
          status: crossProjectResponse.status,
          contentType: crossProjectResponse.headers.get("content-type"),
          returnedFile: Boolean(crossProjectResponse.headers.get("content-disposition")),
          containsRelationshipErrorMarker: /project|category|resource|hạng mục|công trình/i.test(crossProjectResponseText),
          bodyBytes: Buffer.byteLength(crossProjectResponseText),
        },
        before: after,
        after: afterCrossProject,
        databaseUnchanged: crossProjectUnchanged,
        auditEvent: crossProjectAudit,
      },
    };
    fs.writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
    console.log(JSON.stringify({ evidencePath, status: evidence.status, rowInjectionResponse: evidence.response, rowInjectionDatabaseUnchanged: unchanged, rowInjectionAuditEventId: denialAudit?.id ?? null, crossProjectResponse: evidence.crossProjectResourceInjection.response, crossProjectDatabaseUnchanged: crossProjectUnchanged, crossProjectAuditEventId: crossProjectAudit?.id ?? null }, null, 2));
    if (evidence.status !== "PASS") process.exitCode = 1;
  } finally {
    await close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
