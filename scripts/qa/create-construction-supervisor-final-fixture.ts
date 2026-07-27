import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import type { UserRole } from "@prisma/client";
import { assertSafeQaDatabase } from "./assert-safe-qa-database";
import { createSafeQaPrismaClient, verifyQaPrismaFingerprint } from "./create-safe-qa-prisma-client";
import { storageProvider } from "../../src/lib/storage";

const PREFIX = "QA-CONSTRUCTION-SUPERVISOR-FINAL-";
const artifactDirectory = path.join(process.cwd(), "artifacts", "construction-supervisor-final");
const manifestPath = path.join(artifactDirectory, "fixture-manifest-20260727.json");
const id = () => randomUUID();
const date = (value: string) => new Date(`${value}T00:00:00.000Z`);

type QaUser = { id: string; key: string; username: string; email: string; name: string; role: UserRole };

async function main() {
  const safety = assertSafeQaDatabase();
  const qaDatabaseUrl = process.env.QA_DATABASE_URL;
  const password = process.env.QA_SUPERVISION_E2E_PASSWORD;
  if (!qaDatabaseUrl || !password) throw new Error("QA_DATABASE_URL and QA_SUPERVISION_E2E_PASSWORD are required");
  if (fs.existsSync(manifestPath)) throw new Error(`Fixture manifest already exists: ${manifestPath}`);

  const users: QaUser[] = [
    ["OFFICER_A", "QA-CS-OFFICER-A", "officer-a", "CONSTRUCTION_SUPERVISOR"],
    ["OFFICER_B", "QA-CS-OFFICER-B", "officer-b", "CONSTRUCTION_SUPERVISOR"],
    ["REVIEWER", "QA-CS-REVIEWER", "reviewer", "DIRECTOR"],
    ["ORDINARY", "QA-CS-ORDINARY", "ordinary", "STAFF"],
    ["ADMIN", "QA-CS-ADMIN", "admin", "ADMIN"],
    ["DEPUTY_DIRECTOR", "QA-CS-DEPUTY-DIRECTOR", "deputy-director", "DEPUTY_DIRECTOR"],
    ["SUPERVISION_HEAD", "QA-CS-SUPERVISION-HEAD", "supervision-head", "SUPERVISION_HEAD"],
    ["CHIEF_COMMANDER", "QA-CS-CHIEF-COMMANDER", "chief-commander", "CHIEF_COMMANDER"],
    ["MANAGER", "QA-CS-MANAGER", "manager", "MANAGER"],
    ["ENGINEER", "QA-CS-ENGINEER", "engineer", "ENGINEER"],
    ["STAFF", "QA-CS-STAFF", "staff", "STAFF"],
  ].map(([key, username, slug, role]) => ({
    id: id(), key, username, email: `${PREFIX.toLowerCase()}${slug}@qa.local`, name: `${PREFIX}${username}`, role: role as UserRole,
  }));
  const user = Object.fromEntries(users.map((item) => [item.key, item])) as Record<string, QaUser>;

  const ids = {
    projects: { A: id(), B: id(), C: id() },
    memberships: { ordinaryA: id(), chiefA: id(), managerA: id(), engineerB: id(), staffB: id() },
    reports: { draftA: id(), submittedB: id() },
    reportLines: { draftA: id(), submittedB: id() },
    wbsItems: { A: id(), B: id() },
    templates: { A: id(), B: id() },
    fieldProgressItems: { categoryA: id(), workA: id(), categoryB: id(), workB: id() },
    fieldProgressEntries: { A: id(), B: id() },
    materialItems: { A: id(), B: id() },
    materialStocks: { A: id(), B: id() },
    materialRequests: { A: id() },
    materialRequestItems: { A: id() },
    tasks: { A: id(), B: id() },
    documentFolders: { A: id() },
    documents: { previewA: id() },
    approvals: { A: id() },
    dossiers: {
      ownDraft: id(), ownRevision: id(), ownSubmitted: id(), ownApproved: id(), ownLocked: id(),
      otherDraft: id(), otherSubmitted: id(),
    },
    weeklyRows: { ownResult: id(), ownNextPlan: id(), ownQuantity: id(), ownProgress: id(), otherResult: id() },
    revisions: {
      ownDraft: id(), ownRevision: id(), ownSubmitted: id(), ownApproved: id(), ownLocked: id(), otherDraft: id(), otherSubmitted: id(),
    },
    attachments: { ownDraft: id() },
  };

  const manifest = {
    status: "PREPARING",
    prefix: PREFIX,
    timestamp: new Date().toISOString(),
    databaseFingerprint: safety.qaDatabase,
    applicationDatabaseFingerprint: safety.productionDatabase,
    users: Object.fromEntries(users.map((item) => [item.key, { id: item.id, username: item.username, email: item.email, role: item.role }])),
    projects: ids.projects,
    memberships: ids.memberships,
    reports: ids.reports,
    reportLines: ids.reportLines,
    wbsItems: ids.wbsItems,
    templates: ids.templates,
    fieldProgressItems: ids.fieldProgressItems,
    fieldProgressEntries: ids.fieldProgressEntries,
    materials: { items: ids.materialItems, stocks: ids.materialStocks, requests: ids.materialRequests, requestItems: ids.materialRequestItems },
    tasks: ids.tasks,
    documents: { folders: ids.documentFolders, files: ids.documents },
    approvals: ids.approvals,
    dossiers: ids.dossiers,
    weeklyRows: ids.weeklyRows,
    revisions: ids.revisions,
    attachments: ids.attachments,
  };

  fs.mkdirSync(artifactDirectory, { recursive: true });
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), { encoding: "utf8", flag: "wx" });

  const { prisma, close } = createSafeQaPrismaClient(qaDatabaseUrl);
  let committed = false;
  let storedPreviewPath: string | null = null;
  try {
    await verifyQaPrismaFingerprint(prisma, safety.qaDatabase);
    const [enumRows, migrationRows] = await Promise.all([
      prisma.$queryRawUnsafe<Array<{ enumlabel: string }>>("SELECT e.enumlabel FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid WHERE t.typname = 'UserRole' AND e.enumlabel = 'CONSTRUCTION_SUPERVISOR'"),
      prisma.$queryRawUnsafe<Array<{ migration_name: string; finished_at: Date | null }>>("SELECT migration_name, finished_at FROM _prisma_migrations WHERE migration_name = '20260727120000_add_construction_supervisor_role' AND finished_at IS NOT NULL"),
    ]);
    if (enumRows.length !== 1 || migrationRows.length !== 1) throw new Error("QA role enum migration is not complete");

    const prefixCounts = await Promise.all([
      prisma.user.count({ where: { name: { startsWith: PREFIX } } }),
      prisma.project.count({ where: { code: { startsWith: PREFIX } } }),
      prisma.siteReport.count({ where: { reportNo: { startsWith: PREFIX } } }),
      prisma.materialRequest.count({ where: { requestNo: { startsWith: PREFIX } } }),
      prisma.approvalRequest.count({ where: { code: { startsWith: PREFIX } } }),
      prisma.supervisionWeeklyDossier.count({ where: { reportNumber: { startsWith: PREFIX } } }),
    ]);
    if (prefixCounts.some(Boolean)) throw new Error(`Existing final fixture prefix detected: ${prefixCounts.join(",")}`);

    const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2n5sAAAAASUVORK5CYII=", "base64");
    const stored = await storageProvider.saveFile({
      buffer: png,
      projectId: ids.projects.A,
      projectCode: `${PREFIX}PROJECT-A`,
      folderId: ids.documentFolders.A,
      originalName: `${PREFIX}PREVIEW.png`,
    });
    storedPreviewPath = stored.storagePath;
    const passwordHash = await bcrypt.hash(password, 12);

    const dossierDefinitions = [
      { key: "ownDraft", owner: user.OFFICER_A.id, start: "2026-09-07", status: "DRAFT" },
      { key: "ownRevision", owner: user.OFFICER_A.id, start: "2026-09-14", status: "REVISION_REQUIRED" },
      { key: "ownSubmitted", owner: user.OFFICER_A.id, start: "2026-09-21", status: "SUBMITTED" },
      { key: "ownApproved", owner: user.OFFICER_A.id, start: "2026-09-28", status: "APPROVED" },
      { key: "ownLocked", owner: user.OFFICER_A.id, start: "2026-10-05", status: "LOCKED" },
      { key: "otherDraft", owner: user.OFFICER_B.id, start: "2026-09-07", status: "DRAFT" },
      { key: "otherSubmitted", owner: user.OFFICER_B.id, start: "2026-09-14", status: "SUBMITTED" },
    ] as const;

    await prisma.$transaction(async (tx) => {
      await tx.user.createMany({ data: users.map(({ key: _key, ...item }) => ({ ...item, password: passwordHash, isActive: true })) });
      await tx.project.createMany({ data: [
        { id: ids.projects.A, code: `${PREFIX}PROJECT-A`, name: `${PREFIX}PROJECT-A`, description: `${PREFIX}PROJECT-DETAIL-A`, investor: `${PREFIX}INVESTOR-A`, location: "Hà Nội", status: "ACTIVE" },
        { id: ids.projects.B, code: `${PREFIX}PROJECT-B`, name: `${PREFIX}PROJECT-B`, description: `${PREFIX}PROJECT-DETAIL-B`, investor: `${PREFIX}INVESTOR-B`, location: "Đà Nẵng", status: "ACTIVE" },
      ] });
      await tx.projectMember.createMany({ data: [
        { id: ids.memberships.ordinaryA, projectId: ids.projects.A, userId: user.ORDINARY.id, role: "VIEWER", assignedById: user.ADMIN.id },
        { id: ids.memberships.chiefA, projectId: ids.projects.A, userId: user.CHIEF_COMMANDER.id, role: "CHIEF_COMMANDER", assignedById: user.ADMIN.id },
        { id: ids.memberships.managerA, projectId: ids.projects.A, userId: user.MANAGER.id, role: "PROJECT_MANAGER", assignedById: user.ADMIN.id },
        { id: ids.memberships.engineerB, projectId: ids.projects.B, userId: user.ENGINEER.id, role: "QA_QC", assignedById: user.ADMIN.id },
        { id: ids.memberships.staffB, projectId: ids.projects.B, userId: user.STAFF.id, role: "VIEWER", assignedById: user.ADMIN.id },
      ] });
      await tx.siteReport.createMany({ data: [
        { id: ids.reports.draftA, reportNo: `${PREFIX}REPORT-DRAFT-A`, projectId: ids.projects.A, reportDate: date("2026-07-25"), status: "DRAFT", createdById: user.ENGINEER.id, reporterName: user.ENGINEER.name, weatherCondition: "SUNNY", summary: `${PREFIX}SOURCE-DRAFT` },
        { id: ids.reports.submittedB, reportNo: `${PREFIX}REPORT-SUBMITTED-B`, projectId: ids.projects.B, reportDate: date("2026-07-26"), status: "SUBMITTED", createdById: user.STAFF.id, reporterName: user.STAFF.name, weatherCondition: "CLOUDY", summary: `${PREFIX}SOURCE-SUBMITTED`, submittedAt: date("2026-07-26") },
      ] });
      await tx.wBSItem.createMany({ data: [
        { id: ids.wbsItems.A, projectId: ids.projects.A, code: `${PREFIX}WBS-A`, name: `${PREFIX}WBS-A`, unit: "m3", designQuantity: 100, progress: 25, status: "IN_PROGRESS", createdById: user.ADMIN.id },
        { id: ids.wbsItems.B, projectId: ids.projects.B, code: `${PREFIX}WBS-B`, name: `${PREFIX}WBS-B`, unit: "m2", designQuantity: 200, progress: 50, status: "IN_PROGRESS", createdById: user.ADMIN.id },
      ] });
      await tx.fieldProgressTemplate.createMany({ data: [
        { id: ids.templates.A, projectId: ids.projects.A, name: `${PREFIX}TEMPLATE-A`, createdById: user.ADMIN.id },
        { id: ids.templates.B, projectId: ids.projects.B, name: `${PREFIX}TEMPLATE-B`, createdById: user.ADMIN.id },
      ] });
      await tx.fieldProgressItem.createMany({ data: [
        { id: ids.fieldProgressItems.categoryA, projectId: ids.projects.A, templateId: ids.templates.A, itemType: "GROUP", categoryName: `${PREFIX}CATEGORY-A`, code: `${PREFIX}CAT-A`, createdById: user.ADMIN.id },
        { id: ids.fieldProgressItems.workA, projectId: ids.projects.A, templateId: ids.templates.A, parentId: ids.fieldProgressItems.categoryA, level: 1, itemType: "WORK", workContent: `${PREFIX}WORK-A`, code: `${PREFIX}WORK-A`, unit: "m3", designQuantity: 100, createdById: user.ADMIN.id },
        { id: ids.fieldProgressItems.categoryB, projectId: ids.projects.B, templateId: ids.templates.B, itemType: "GROUP", categoryName: `${PREFIX}CATEGORY-B`, code: `${PREFIX}CAT-B`, createdById: user.ADMIN.id },
        { id: ids.fieldProgressItems.workB, projectId: ids.projects.B, templateId: ids.templates.B, parentId: ids.fieldProgressItems.categoryB, level: 1, itemType: "WORK", workContent: `${PREFIX}WORK-B`, code: `${PREFIX}WORK-B`, unit: "m2", designQuantity: 200, createdById: user.ADMIN.id },
      ] });
      await tx.fieldProgressEntry.createMany({ data: [
        { id: ids.fieldProgressEntries.A, projectId: ids.projects.A, templateId: ids.templates.A, itemId: ids.fieldProgressItems.workA, entryDate: date("2026-07-25"), quantity: 10, status: "SUBMITTED", createdById: user.ENGINEER.id, submittedAt: date("2026-07-25") },
        { id: ids.fieldProgressEntries.B, projectId: ids.projects.B, templateId: ids.templates.B, itemId: ids.fieldProgressItems.workB, entryDate: date("2026-07-26"), quantity: 20, status: "APPROVED", createdById: user.STAFF.id, approvedById: user.REVIEWER.id, approvedAt: date("2026-07-26") },
      ] });
      await tx.siteReportLine.createMany({ data: [
        { id: ids.reportLines.draftA, siteReportId: ids.reports.draftA, projectId: ids.projects.A, wbsItemId: ids.wbsItems.A, fieldProgressItemId: ids.fieldProgressItems.workA, workContent: `${PREFIX}REPORT-LINE-A`, unit: "m3", designQuantity: 100, quantityToday: 10, quantityCumulative: 25, progressPercent: 25 },
        { id: ids.reportLines.submittedB, siteReportId: ids.reports.submittedB, projectId: ids.projects.B, wbsItemId: ids.wbsItems.B, fieldProgressItemId: ids.fieldProgressItems.workB, workContent: `${PREFIX}REPORT-LINE-B`, unit: "m2", designQuantity: 200, quantityToday: 20, quantityCumulative: 100, progressPercent: 50 },
      ] });
      await tx.materialItem.createMany({ data: [
        { id: ids.materialItems.A, projectId: ids.projects.A, code: `${PREFIX}MAT-A`, name: `${PREFIX}MATERIAL-A`, unit: "kg" },
        { id: ids.materialItems.B, projectId: ids.projects.B, code: `${PREFIX}MAT-B`, name: `${PREFIX}MATERIAL-B`, unit: "m" },
      ] });
      await tx.projectMaterialStock.createMany({ data: [
        { id: ids.materialStocks.A, projectId: ids.projects.A, materialItemId: ids.materialItems.A, stock: 50, minStockLevel: 5 },
        { id: ids.materialStocks.B, projectId: ids.projects.B, materialItemId: ids.materialItems.B, stock: 80, minStockLevel: 8 },
      ] });
      await tx.materialRequest.create({ data: { id: ids.materialRequests.A, projectId: ids.projects.A, requestNo: `${PREFIX}MR-A`, requestedById: user.ENGINEER.id, requestDate: date("2026-07-25"), status: "SUBMITTED", priority: "MEDIUM", note: `${PREFIX}MATERIAL-REQUEST`, items: { create: { id: ids.materialRequestItems.A, materialName: `${PREFIX}MATERIAL-A`, materialCode: `${PREFIX}MAT-A`, unit: "kg", requestedQuantity: 15, remainingQuantity: 15, fieldProgressItemId: ids.fieldProgressItems.workA } } } });
      await tx.workTask.createMany({ data: [
        { id: ids.tasks.A, projectId: ids.projects.A, creatorId: user.MANAGER.id, primaryAssigneeId: user.ENGINEER.id, title: `${PREFIX}TASK-A`, lifecycle: "IN_PROGRESS", acceptance: "PENDING", execution: "IN_PROGRESS", review: "PENDING", handover: "PENDING", progressPercent: 40, snapshot: { fixture: PREFIX } },
        { id: ids.tasks.B, projectId: ids.projects.B, creatorId: user.ADMIN.id, title: `${PREFIX}TASK-B`, lifecycle: "CREATED", acceptance: "PENDING", execution: "NOT_STARTED", review: "PENDING", handover: "PENDING", snapshot: { fixture: PREFIX } },
      ] });
      await tx.documentFolder.create({ data: { id: ids.documentFolders.A, projectId: ids.projects.A, name: `${PREFIX}DOCUMENTS` } });
      await tx.document.create({ data: { id: ids.documents.previewA, projectId: ids.projects.A, folderId: ids.documentFolders.A, originalName: `${PREFIX}PREVIEW.png`, storedName: path.basename(stored.storagePath), mimeType: "image/png", extension: ".png", size: stored.size, storagePath: stored.storagePath, uploadedById: user.ADMIN.id, displayName: `${PREFIX}PREVIEW`, status: "APPROVED", fileHash: stored.fileHash } });
      await tx.approvalRequest.create({ data: { id: ids.approvals.A, code: `${PREFIX}APPROVAL-A`, projectId: ids.projects.A, title: `${PREFIX}APPROVAL-A`, type: "REPORT", status: "PENDING", requesterId: user.ENGINEER.id, entityType: "SiteReport", entityId: ids.reports.draftA, sourceType: "SiteReport", sourceId: ids.reports.draftA } });

      await tx.supervisionWeeklyDossier.createMany({ data: dossierDefinitions.map((item) => {
        const weekStart = date(item.start);
        const weekEnd = new Date(weekStart); weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);
        const nextWeekStart = new Date(weekStart); nextWeekStart.setUTCDate(nextWeekStart.getUTCDate() + 7);
        const nextWeekEnd = new Date(weekStart); nextWeekEnd.setUTCDate(nextWeekEnd.getUTCDate() + 13);
        return { id: ids.dossiers[item.key], reportNumber: `${PREFIX}${item.key.toUpperCase()}`, weekStart, weekEnd, nextWeekStart, nextWeekEnd, place: "Hà Nội", recipientName: user.REVIEWER.name, recipientTitle: "Giám đốc", status: item.status, createdById: item.owner, reviewedById: item.status === "APPROVED" || item.status === "LOCKED" || item.status === "REVISION_REQUIRED" ? user.REVIEWER.id : null, submittedAt: item.status === "DRAFT" ? null : weekEnd, reviewedAt: item.status === "APPROVED" || item.status === "LOCKED" || item.status === "REVISION_REQUIRED" ? weekEnd : null, lockedAt: item.status === "LOCKED" ? weekEnd : null };
      }) });
      await tx.supervisionWeeklyEntry.createMany({ data: [
        { id: ids.weeklyRows.ownResult, dossierId: ids.dossiers.ownDraft, documentType: "RESULT", entryDate: date("2026-09-08"), shift: "MORNING", sortOrder: 0, inputMode: "PROJECT_WORK_ITEM", projectId: ids.projects.A, projectNameSnapshot: `${PREFIX}PROJECT-A`, categoryItemId: ids.fieldProgressItems.categoryA, categoryNameSnapshot: `${PREFIX}CATEGORY-A`, inspectionWorkItemId: ids.fieldProgressItems.workA, inspectionWorkNameSnapshot: `${PREFIX}WORK-A`, displayText: `${PREFIX}PROJECT-A / WORK-A`, inspectionContent: "Kiểm tra chất lượng", result: "Đạt yêu cầu" },
        { id: ids.weeklyRows.ownNextPlan, dossierId: ids.dossiers.ownDraft, documentType: "NEXT_WEEK_PLAN", entryDate: date("2026-09-15"), shift: "AFTERNOON", sortOrder: 0, inputMode: "PROJECT_WORK_ITEM", projectId: ids.projects.B, projectNameSnapshot: `${PREFIX}PROJECT-B`, categoryItemId: ids.fieldProgressItems.categoryB, categoryNameSnapshot: `${PREFIX}CATEGORY-B`, inspectionWorkItemId: ids.fieldProgressItems.workB, inspectionWorkNameSnapshot: `${PREFIX}WORK-B`, displayText: `${PREFIX}PROJECT-B / WORK-B`, inspectionContent: "Kế hoạch kiểm tra", result: "Theo kế hoạch" },
        { id: ids.weeklyRows.otherResult, dossierId: ids.dossiers.otherDraft, documentType: "RESULT", entryDate: date("2026-09-08"), shift: "MORNING", sortOrder: 0, inputMode: "PROJECT_MANUAL_ITEM", projectId: ids.projects.B, projectNameSnapshot: `${PREFIX}PROJECT-B`, manualWorkItemName: "Công việc của Officer B", displayText: `${PREFIX}OTHER-OWNER`, inspectionContent: "Nội dung B", result: "Kết quả B" },
      ] });
      await tx.supervisionWeeklyQuantity.create({ data: { id: ids.weeklyRows.ownQuantity, dossierId: ids.dossiers.ownDraft, sortOrder: 0, projectId: ids.projects.A, projectNameSnapshot: `${PREFIX}PROJECT-A`, displayText: `${PREFIX}QUANTITY-A`, unit: "m3", reportedQuantity: 10, verifiedQuantity: 9.5, varianceQuantity: -0.5, conclusion: "Chấp nhận có điều kiện" } });
      await tx.supervisionWeeklyProgress.create({ data: { id: ids.weeklyRows.ownProgress, dossierId: ids.dossiers.ownDraft, sortOrder: 0, projectId: ids.projects.B, projectNameSnapshot: `${PREFIX}PROJECT-B`, displayText: `${PREFIX}PROGRESS-B`, plannedProgress: "60%", actualProgress: "55%", delayValue: 5, delayType: "PERCENT", delayReason: "Mưa" } });
      await tx.supervisionWeeklyRevision.createMany({ data: dossierDefinitions.map((item) => ({ id: ids.revisions[item.key], dossierId: ids.dossiers[item.key], actorId: item.owner, action: item.status === "REVISION_REQUIRED" ? "REQUEST_REVISION" : "CREATE", fromStatus: item.status === "REVISION_REQUIRED" ? "SUBMITTED" : null, toStatus: item.status, version: 1, changedFields: `${PREFIX}${item.key}` })) });
      await tx.supervisionWeeklyAttachment.create({ data: { id: ids.attachments.ownDraft, dossierId: ids.dossiers.ownDraft, documentId: ids.documents.previewA, entryId: ids.weeklyRows.ownResult, createdById: user.OFFICER_A.id } });
    });
    committed = true;

    const verification = {
      officerAMemberships: await prisma.projectMember.count({ where: { userId: user.OFFICER_A.id } }),
      officerBMemberships: await prisma.projectMember.count({ where: { userId: user.OFFICER_B.id } }),
      users: await prisma.user.count({ where: { id: { in: users.map((item) => item.id) } } }),
      projects: await prisma.project.count({ where: { id: { in: [ids.projects.A, ids.projects.B] } } }),
      dossiers: await prisma.supervisionWeeklyDossier.count({ where: { id: { in: Object.values(ids.dossiers) } } }),
    };
    if (verification.officerAMemberships !== 0 || verification.officerBMemberships !== 0 || verification.users !== users.length || verification.projects !== 2 || verification.dossiers !== 7) throw new Error(`Fixture verification failed: ${JSON.stringify(verification)}`);

    const readyManifest = { ...manifest, status: "READY", committedAt: new Date().toISOString(), storagePaths: [stored.storagePath], verification };
    fs.writeFileSync(manifestPath, JSON.stringify(readyManifest, null, 2), "utf8");
    console.log(JSON.stringify({ safe: true, created: true, manifestPath, databaseFingerprint: safety.qaDatabase, verification }, null, 2));
  } finally {
    await close();
    if (!committed) {
      if (storedPreviewPath) await storageProvider.deleteFile(storedPreviewPath).catch(() => undefined);
      if (fs.existsSync(manifestPath)) fs.unlinkSync(manifestPath);
    }
  }
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
