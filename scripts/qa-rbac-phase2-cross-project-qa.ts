import "dotenv/config";
import { pathToFileURL } from "node:url";
import { assertSafeQaDatabase } from "./qa/assert-safe-qa-database";
import { createSafeQaPrismaClient, verifyQaPrismaFingerprint } from "./qa/create-safe-qa-prisma-client";
import { evaluatePermissionPolicy } from "../src/lib/permissions/evaluate-permission-policy";

type Manifest = { prefix: string; projectIds: string[]; userIds: string[]; documentIds: string[]; reportIds: string[]; attachmentIds: string[]; paymentIds: string[]; approvalIds: string[]; notificationIds: string[] };
const must = (value: unknown, message: string): asserts value => { if (!value) throw new Error(message); };
const denied = (label: string, input: Parameters<typeof evaluatePermissionPolicy>[0]) => must(!evaluatePermissionPolicy(input).allowed, `${label}: expected deny`);

async function createFixture(prefix: string, prisma: ReturnType<typeof createSafeQaPrismaClient>["prisma"]): Promise<Manifest> {
  const user = async (suffix: string, role: "ENGINEER" | "ACCOUNTANT" | "MANAGER") => prisma.user.create({ data: { email: `${prefix.toLowerCase()}-${suffix}@example.invalid`, username: `${prefix}_${suffix}`.slice(0, 48), password: "qa-fixture-not-for-login", name: `${prefix} ${suffix}`, role, isActive: true } });
  const [userA, userB, accountantA, managerA, viewerA, removedA] = await Promise.all([user("user-a", "ENGINEER"), user("user-b", "ENGINEER"), user("accountant-a", "ACCOUNTANT"), user("manager-a", "MANAGER"), user("viewer-a", "ENGINEER"), user("removed-a", "ENGINEER")]);
  const [projectA, projectB] = await Promise.all([
    prisma.project.create({ data: { code: `${prefix}_A`, name: `${prefix} Project A`, status: "ACTIVE" } }),
    prisma.project.create({ data: { code: `${prefix}_B`, name: `${prefix} Project B`, status: "ACTIVE" } }),
  ]);
  await prisma.projectMember.createMany({ data: [
    { projectId: projectA.id, userId: userA.id, role: "QA_QC" }, { projectId: projectB.id, userId: userB.id, role: "QA_QC" },
    { projectId: projectA.id, userId: accountantA.id, role: "QA_QC" }, { projectId: projectA.id, userId: managerA.id, role: "PROJECT_MANAGER" },
    { projectId: projectA.id, userId: viewerA.id, role: "VIEWER" }, { projectId: projectA.id, userId: removedA.id, role: "QA_QC", isActive: false, leftAt: new Date() },
  ] });
  const [folderA, folderB] = await Promise.all([prisma.documentFolder.create({ data: { projectId: projectA.id, name: `${prefix} folder A` } }), prisma.documentFolder.create({ data: { projectId: projectB.id, name: `${prefix} folder B` } })]);
  const [documentA, documentB] = await Promise.all([
    prisma.document.create({ data: { projectId: projectA.id, folderId: folderA.id, originalName: `${prefix}-a.pdf`, storedName: `${prefix}-a.pdf`, mimeType: "application/pdf", extension: "pdf", size: 1, storagePath: `${prefix}/a.pdf`, uploadedById: userA.id } }),
    prisma.document.create({ data: { projectId: projectB.id, folderId: folderB.id, originalName: `${prefix}-b.pdf`, storedName: `${prefix}-b.pdf`, mimeType: "application/pdf", extension: "pdf", size: 1, storagePath: `${prefix}/b.pdf`, uploadedById: userB.id } }),
  ]);
  const [reportA, reportB] = await Promise.all([prisma.siteReport.create({ data: { projectId: projectA.id, createdById: userA.id, reportDate: new Date(), title: `${prefix} report A` } }), prisma.siteReport.create({ data: { projectId: projectB.id, createdById: userB.id, reportDate: new Date(), title: `${prefix} report B` } })]);
  const [attachmentA, attachmentB] = await Promise.all([prisma.siteReportAttachment.create({ data: { reportId: reportA.id, fileName: `${prefix}-a.txt`, mimeType: "text/plain", sizeBytes: 1, storagePath: `${prefix}/attachment-a.txt` } }), prisma.siteReportAttachment.create({ data: { reportId: reportB.id, fileName: `${prefix}-b.txt`, mimeType: "text/plain", sizeBytes: 1, storagePath: `${prefix}/attachment-b.txt` } })]);
  const [paymentA, paymentB] = await Promise.all([prisma.paymentRequest.create({ data: { requestCode: `${prefix}-PAY-A`, projectId: projectA.id, title: `${prefix} payment A`, createdById: userA.id } }), prisma.paymentRequest.create({ data: { requestCode: `${prefix}-PAY-B`, projectId: projectB.id, title: `${prefix} payment B`, createdById: userB.id } })]);
  const [approvalA, approvalB] = await Promise.all([prisma.approvalRequest.create({ data: { code: `${prefix}-APR-A`, projectId: projectA.id, title: `${prefix} approval A`, requesterId: userA.id } }), prisma.approvalRequest.create({ data: { code: `${prefix}-APR-B`, projectId: projectB.id, title: `${prefix} approval B`, requesterId: userB.id } })]);
  const [notificationA, notificationB] = await Promise.all([prisma.notification.create({ data: { userId: userA.id, projectId: projectA.id, type: "QA", title: `${prefix} A` } }), prisma.notification.create({ data: { userId: userA.id, projectId: projectB.id, type: "QA", title: `${prefix} B` } })]);
  return { prefix, projectIds: [projectA.id, projectB.id], userIds: [userA.id, userB.id, accountantA.id, managerA.id, viewerA.id, removedA.id], documentIds: [documentA.id, documentB.id], reportIds: [reportA.id, reportB.id], attachmentIds: [attachmentA.id, attachmentB.id], paymentIds: [paymentA.id, paymentB.id], approvalIds: [approvalA.id, approvalB.id], notificationIds: [notificationA.id, notificationB.id] };
}

async function runPolicyChecks(manifest: Manifest, prisma: ReturnType<typeof createSafeQaPrismaClient>["prisma"]) {
  const [projectA, projectB] = manifest.projectIds;
  const [userA, , accountantA, managerA, viewerA, removedA] = manifest.userIds;
  const active = { projectId: projectA, role: "QA_QC" as const, isActive: true };
  const viewer = { projectId: projectA, role: "VIEWER" as const, isActive: true };
  denied("User A Project B view", { actorUserId: userA, systemRole: "ENGINEER", permission: "projects.view", requestedProjectId: projectB, membership: active });
  for (const permission of ["documents.view", "documents.download", "documents.upload", "documents.update", "documents.delete", "reports.view", "reports.update", "reports.export", "payments.view", "payments.create", "payments.update", "payments.approve", "payments.mark_paid", "payments.export", "approvals.view", "approvals.create", "approvals.decide", "materials.view", "materials.request", "materials.update", "materials.approve", "materials.receive", "materials.issue", "contracts.view", "contracts.create", "contracts.update", "contracts.delete"] as const) {
    denied(`User A ${permission} on Project B`, { actorUserId: userA, systemRole: "ENGINEER", permission, requestedProjectId: projectB, membership: active });
  }
  denied("Accountant A payment Project B", { actorUserId: accountantA, systemRole: "ACCOUNTANT", permission: "payments.update", requestedProjectId: projectB, membership: active });
  denied("Manager A approval Project B", { actorUserId: managerA, systemRole: "MANAGER", permission: "approvals.create", requestedProjectId: projectB, membership: active });
  must(evaluatePermissionPolicy({ actorUserId: accountantA, systemRole: "ACCOUNTANT", permission: "payments.create", requestedProjectId: projectA, membership: active }).allowed, "Accountant A Project A payment should allow");
  must(evaluatePermissionPolicy({ actorUserId: managerA, systemRole: "MANAGER", permission: "approvals.create", requestedProjectId: projectA, membership: { projectId: projectA, role: "PROJECT_MANAGER", isActive: true } }).allowed, "Manager A Project A approval should allow");
  for (const permission of ["approvals.create", "approvals.decide", "documents.upload", "documents.update", "documents.delete", "payments.create", "materials.request", "contracts.create"] as const) denied(`Viewer A ${permission}`, { actorUserId: viewerA, systemRole: "ENGINEER", permission, requestedProjectId: projectA, membership: viewer });
  denied("Removed member old project", { actorUserId: removedA, systemRole: "ENGINEER", permission: "documents.download", requestedProjectId: projectA, membership: { ...active, isActive: false, leftAt: new Date() } });
  // Database reads prove the fixture is isolated; authorization uses the same pure layer called by the server resolver.
  must(await prisma.document.count({ where: { id: manifest.documentIds[1], projectId: projectB } }) === 1, "Project B document fixture missing");
}

async function cleanup(manifest: Manifest, prisma: ReturnType<typeof createSafeQaPrismaClient>["prisma"]) {
  await prisma.project.deleteMany({ where: { id: { in: manifest.projectIds } } });
  await prisma.user.deleteMany({ where: { id: { in: manifest.userIds } } });
  const remaining = await Promise.all([prisma.project.count({ where: { id: { in: manifest.projectIds } } }), prisma.user.count({ where: { id: { in: manifest.userIds } } })]);
  must(remaining.every((count) => count === 0), `Cleanup verification failed: ${remaining.join(",")}`);
}

/** Optional only when a QA app instance and an authenticated User-A cookie are explicitly supplied. */
async function runHttpBoundaryCheck(manifest: Manifest) {
  const baseUrl = process.env.QA_RBAC_HTTP_BASE_URL;
  const cookie = process.env.QA_RBAC_USER_A_COOKIE;
  if (!baseUrl || !cookie) return { status: "SKIPPED_NO_QA_HTTP_SESSION" as const };
  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/documents/${manifest.documentIds[1]}/download`, { headers: { cookie }, redirect: "manual" });
  const body = await response.text();
  must(response.status === 403 || response.status === 404, `Document B download must be denied safely, got ${response.status}`);
  must(!body.includes(`${manifest.prefix}-b.pdf`) && !body.includes(manifest.projectIds[1]), "Denied API response leaked Project B metadata");
  return { status: "PASS_HTTP_DENY" as const, httpStatus: response.status };
}

async function main() {
  const guard = await assertSafeQaDatabase();
  if (!guard.safe || !guard.qaFingerprint || !process.env.QA_DATABASE_URL) { console.error(`BLOCKED: ${guard.reason}`); process.exitCode = 2; return; }
  const client = createSafeQaPrismaClient(process.env.QA_DATABASE_URL);
  let manifest: Manifest | undefined;
  try {
    await verifyQaPrismaFingerprint(client.prisma, guard.qaFingerprint);
    manifest = await createFixture(`QA_RBAC_PHASE25_${Date.now()}`, client.prisma);
    await runPolicyChecks(manifest, client.prisma);
    const http = await runHttpBoundaryCheck(manifest);
    console.log(JSON.stringify({ status: "PASS_POLICY_AND_FIXTURE", prefix: manifest.prefix, http }, null, 2));
  } finally {
    if (manifest) await cleanup(manifest, client.prisma);
    await client.close();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) void main();
