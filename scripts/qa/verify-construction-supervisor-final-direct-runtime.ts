import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { assertSafeQaDatabase } from "./assert-safe-qa-database";
import { createSafeQaPrismaClient, verifyQaPrismaFingerprint } from "./create-safe-qa-prisma-client";

const origin = "http://127.0.0.1:3100";
const artifactDirectory = path.join(process.cwd(), "artifacts", "construction-supervisor-final");
const manifestPath = path.join(artifactDirectory, "fixture-manifest-20260727.json");
const evidencePath = path.join(artifactDirectory, "direct-runtime-evidence-20260727.json");
const exportDirectory = path.join(artifactDirectory, "exports");

async function login(email: string, password: string) {
  const response = await fetch(`${origin}/api/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password }) });
  const cookie = response.headers.get("set-cookie")?.split(";")[0];
  if (response.status !== 200 || !cookie) throw new Error(`Login failed for ${email}: HTTP ${response.status}`);
  return cookie;
}

function byteSignature(buffer: Buffer) {
  return buffer.subarray(0, 8).toString("hex").toUpperCase();
}

async function main() {
  const safety = assertSafeQaDatabase();
  const qaDatabaseUrl = process.env.QA_DATABASE_URL;
  const password = process.env.QA_SUPERVISION_E2E_PASSWORD;
  if (!qaDatabaseUrl || !password) throw new Error("QA environment is incomplete");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  if (manifest.status !== "READY" || JSON.stringify(manifest.databaseFingerprint) !== JSON.stringify(safety.qaDatabase)) throw new Error("Fixture manifest is not READY for this QA database");
  fs.mkdirSync(exportDirectory, { recursive: true });
  const { prisma, close } = createSafeQaPrismaClient(qaDatabaseUrl);
  await verifyQaPrismaFingerprint(prisma, safety.qaDatabase);

  const officer = manifest.users.OFFICER_A;
  const ordinary = manifest.users.ORDINARY;
  const projectA = manifest.projects.A as string;
  const projectB = manifest.projects.B as string;
  const folderA = manifest.documents.folders.A as string;
  const documentA = manifest.documents.files.previewA as string;
  const ownDraft = manifest.dossiers.ownDraft as string;
  const ownLocked = manifest.dossiers.ownLocked as string;
  const otherDraft = manifest.dossiers.otherDraft as string;
  const cases: Array<Record<string, unknown>> = [];

  const snapshot = async () => ({
    officerMemberships: await prisma.projectMember.count({ where: { userId: officer.id } }),
    projects: await prisma.project.count({ where: { deletedAt: null } }),
    fixtureProjects: await prisma.project.count({ where: { id: { in: [projectA, projectB] }, deletedAt: null } }),
    reports: await prisma.siteReport.findMany({ where: { id: { in: Object.values(manifest.reports) } }, select: { id: true, status: true, updatedAt: true, deletedAt: true }, orderBy: { id: "asc" } }),
    materialStocks: await prisma.projectMaterialStock.findMany({ where: { id: { in: Object.values(manifest.materials.stocks) } }, select: { id: true, stock: true, updatedAt: true }, orderBy: { id: "asc" } }),
    documents: await prisma.document.count({ where: { id: { in: Object.values(manifest.documents.files) } } }),
    approvals: await prisma.approvalRequest.findMany({ where: { id: { in: Object.values(manifest.approvals) } }, select: { id: true, status: true, updatedAt: true }, orderBy: { id: "asc" } }),
    dossiers: await prisma.supervisionWeeklyDossier.findMany({ where: { id: { in: Object.values(manifest.dossiers) } }, select: { id: true, status: true, lockVersion: true, updatedAt: true }, orderBy: { id: "asc" } }),
    revisions: await prisma.supervisionWeeklyRevision.count({ where: { dossierId: { in: Object.values(manifest.dossiers) } } }),
    weeklyRows: await prisma.supervisionWeeklyEntry.count({ where: { dossierId: { in: Object.values(manifest.dossiers) } } }),
  });

  const officerCookie = await login(officer.email, password);
  const ordinaryCookie = await login(ordinary.email, password);
  const baseline = await snapshot();

  async function requestCase(input: { name: string; url: string; expected: number[]; cookie?: string; method?: string; headers?: Record<string, string>; body?: BodyInit; saveAs?: string; denied?: boolean }) {
    const before = input.denied ? await snapshot() : undefined;
    const response = await fetch(`${origin}${input.url}`, { method: input.method ?? "GET", headers: { ...(input.cookie ? { cookie: input.cookie } : {}), ...input.headers }, body: input.body });
    const buffer = Buffer.from(await response.arrayBuffer());
    const contentType = response.headers.get("content-type");
    const contentDisposition = response.headers.get("content-disposition");
    if (input.saveAs && response.status === 200) fs.writeFileSync(path.join(exportDirectory, input.saveAs), buffer);
    const after = input.denied ? await snapshot() : undefined;
    const unchanged = input.denied ? JSON.stringify(before) === JSON.stringify(after) : undefined;
    const result = {
      name: input.name,
      principal: input.cookie === officerCookie ? "QA-CS-OFFICER-A" : input.cookie === ordinaryCookie ? "QA-CS-ORDINARY" : "ANONYMOUS",
      route: input.url,
      expected: input.expected,
      status: response.status,
      contentType,
      contentDisposition,
      byteLength: buffer.length,
      signature: byteSignature(buffer),
      returnedFile: response.status === 200 && Boolean(contentDisposition),
      dbBefore: before,
      dbAfter: after,
      dbUnchanged: unchanged,
      pass: input.expected.includes(response.status) && (input.denied ? unchanged && !contentDisposition : true),
    };
    cases.push(result);
    return result;
  }

  for (const route of ["/projects", `/projects/${projectA}`, `/projects/${projectB}`, "/reports", "/materials", "/documents", "/approvals", "/supervision/weekly"]) {
    await requestCase({ name: `READ ${route}`, url: route, expected: [200], cookie: officerCookie });
  }
  await requestCase({ name: "DOCUMENT PREVIEW", url: `/api/documents/${documentA}/download?preview=true`, expected: [200], cookie: officerCookie });
  await requestCase({ name: "DOCUMENT DOWNLOAD DENIED", url: `/api/documents/${documentA}/download`, expected: [403], cookie: officerCookie, denied: true });
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2n5sAAAAASUVORK5CYII=", "base64");
  await requestCase({ name: "DOCUMENT UPLOAD DENIED", url: `/api/documents/upload?projectId=${projectA}&folderId=${folderA}&fileName=${encodeURIComponent("denied.png")}`, expected: [403], cookie: officerCookie, method: "POST", headers: { "content-type": "image/png", "content-length": String(png.length) }, body: png, denied: true });

  for (const documentType of ["RESULT", "NEXT_WEEK_PLAN"] as const) {
    for (const format of ["docx", "pdf"] as const) {
      const extension = format;
      await requestCase({ name: `OWN ${documentType} ${format.toUpperCase()}`, url: `/api/supervision/weekly/${ownDraft}/export?document=${documentType}&format=${format}&filename=${documentType}.${extension}`, expected: [200], cookie: officerCookie, saveAs: `own-${documentType.toLowerCase()}.${extension}` });
      await requestCase({ name: `OTHER ${documentType} ${format.toUpperCase()} DENIED`, url: `/api/supervision/weekly/${otherDraft}/export?document=${documentType}&format=${format}`, expected: [403], cookie: officerCookie, denied: true });
    }
  }
  await requestCase({ name: "ANONYMOUS DOCX DENIED", url: `/api/supervision/weekly/${ownDraft}/export?document=RESULT&format=docx`, expected: [401], denied: true });
  await requestCase({ name: "ANONYMOUS PDF DENIED", url: `/api/supervision/weekly/${ownDraft}/export?document=RESULT&format=pdf`, expected: [401], denied: true });
  await requestCase({ name: "ORDINARY DOCX DENIED", url: `/api/supervision/weekly/${ownDraft}/export?document=RESULT&format=docx`, expected: [403], cookie: ordinaryCookie, denied: true });
  await requestCase({ name: "ORDINARY PDF DENIED", url: `/api/supervision/weekly/${ownDraft}/export?document=RESULT&format=pdf`, expected: [403], cookie: ordinaryCookie, denied: true });
  await requestCase({ name: "LOCKED OWN DOCX DENIED", url: `/api/supervision/weekly/${ownLocked}/export?document=RESULT&format=docx`, expected: [403], cookie: officerCookie, denied: true });
  await requestCase({ name: "LOCKED OWN PDF DENIED", url: `/api/supervision/weekly/${ownLocked}/export?document=RESULT&format=pdf`, expected: [403], cookie: officerCookie, denied: true });
  await requestCase({ name: "INVALID DOSSIER", url: "/api/supervision/weekly/not-a-real-dossier/export?document=RESULT&format=docx", expected: [403, 404], cookie: officerCookie, denied: true });
  await requestCase({ name: "UNSUPPORTED FORMAT", url: `/api/supervision/weekly/${ownDraft}/export?document=RESULT&format=xlsx`, expected: [400], cookie: officerCookie, denied: true });

  const finalSnapshot = await snapshot();
  const auditEvents = await prisma.auditLog.findMany({
    where: { userId: { in: [officer.id, ordinary.id] }, createdAt: { gte: new Date(manifest.committedAt) } },
    select: { id: true, userId: true, projectId: true, action: true, entityType: true, entityId: true, afterData: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  const evidence = {
    conclusion: cases.every((item) => item.pass) ? "PASS" : "FAIL",
    timestamp: new Date().toISOString(),
    databaseFingerprint: safety.qaDatabase,
    baseline,
    finalSnapshot,
    officerVisibleProjectCount: baseline.projects,
    officerMembershipCount: baseline.officerMemberships,
    cases,
    auditEvents,
    summary: { total: cases.length, passed: cases.filter((item) => item.pass).length, failed: cases.filter((item) => !item.pass).map((item) => item.name) },
  };
  fs.writeFileSync(evidencePath, JSON.stringify(evidence, null, 2), "utf8");
  console.log(JSON.stringify({ evidencePath, conclusion: evidence.conclusion, summary: evidence.summary, auditEvents: auditEvents.length }, null, 2));
  await close();
  if (evidence.conclusion !== "PASS") process.exitCode = 1;
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
