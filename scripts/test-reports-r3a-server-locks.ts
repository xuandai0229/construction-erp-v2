import assert from "node:assert/strict";
import test from "node:test";
import { DocumentStatus, SiteReportStatus, UserRole } from "@prisma/client";
import {
  assertReportWritableForAttachment,
  canApproveReport,
  canDeleteReportAttachment,
  canEditReportContent,
  canRejectReport,
  canSoftDeleteReport,
  canSubmitReport,
  canUploadReportAttachment,
} from "../src/lib/reports/report-workflow-policy";
import { assertFieldProgressEntryWritable } from "../src/lib/field-progress/entry-workflow-policy";
import {
  canDeleteDocument,
  canEditDocumentMetadata,
  canRenameDocument,
  isValidDocumentStatusTransition,
} from "../src/lib/documents/permissions";
import prisma from "../src/lib/prisma";
import {
  approveSiteReportTransition,
  rejectSiteReportTransition,
  submitSiteReportTransition,
} from "../src/lib/reports/report-transition-service";
import { createSiteReportWithAudit } from "../src/lib/reports/report-create-service";

const allReportStatuses = Object.values(SiteReportStatus);

test("report policy grants write access only to explicitly writable statuses", () => {
  for (const status of allReportStatuses) {
    const editable = status === "DRAFT" || status === "REJECTED";
    const reviewable = status === "SUBMITTED";

    assert.equal(canEditReportContent(status), editable, `${status}: edit`);
    assert.equal(canUploadReportAttachment(status), editable, `${status}: upload`);
    assert.equal(canDeleteReportAttachment(status), editable, `${status}: delete attachment`);
    assert.equal(canSubmitReport(status), editable, `${status}: submit`);
    assert.equal(canApproveReport(status), reviewable, `${status}: approve`);
    assert.equal(canRejectReport(status), reviewable, `${status}: reject`);
    assert.equal(canSoftDeleteReport(status), editable, `${status}: soft delete`);
  }
});

test("report policy fails closed for unknown statuses", () => {
  const unknown = "FUTURE_STATUS";
  assert.equal(canEditReportContent(unknown), false);
  assert.equal(canUploadReportAttachment(unknown), false);
  assert.equal(canDeleteReportAttachment(unknown), false);
  assert.equal(canSubmitReport(unknown), false);
  assert.equal(canApproveReport(unknown), false);
  assert.equal(canRejectReport(unknown), false);
  assert.equal(canSoftDeleteReport(unknown), false);
  assert.throws(
    () => assertReportWritableForAttachment({ status: unknown }),
    /không thể thêm file đính kèm/i,
  );
});

test("attachment guard allows draft and rejected but blocks immutable reports", () => {
  assert.doesNotThrow(() => assertReportWritableForAttachment({ status: "DRAFT" }));
  assert.doesNotThrow(() => assertReportWritableForAttachment({ status: "REJECTED" }));

  for (const status of ["SUBMITTED", "APPROVED", "CANCELLED", "LOCKED"]) {
    assert.throws(
      () => assertReportWritableForAttachment({ status }),
      /Báo cáo đã gửi\/đã duyệt nên không thể thêm file đính kèm\./,
      status,
    );
  }
});

test("approved field progress entries cannot be changed or soft-deleted", () => {
  assert.throws(
    () => assertFieldProgressEntryWritable("APPROVED"),
    /Khối lượng đã duyệt không thể sửa\/xóa\./,
  );
  assert.doesNotThrow(() => assertFieldProgressEntryWritable("DRAFT"));
  assert.doesNotThrow(() => assertFieldProgressEntryWritable("SUBMITTED"));
  assert.doesNotThrow(() => assertFieldProgressEntryWritable("REVISION_REQUESTED"));
});

test("approved archived and superseded documents are immutable for every role", () => {
  const folder = { id: "folder-1", name: "08. Báo cáo ngày" };

  for (const role of Object.values(UserRole)) {
    const user = { id: `user-${role}`, role };
    for (const status of [
      DocumentStatus.APPROVED,
      DocumentStatus.ARCHIVED,
      DocumentStatus.SUPERSEDED,
    ]) {
      const document = {
        id: `document-${status}`,
        status,
        uploadedById: user.id,
      };
      assert.equal(canRenameDocument(user, document, folder), false, `${role}/${status}: rename`);
      assert.equal(canEditDocumentMetadata(user, document, folder), false, `${role}/${status}: metadata`);
      assert.equal(canDeleteDocument(user, document, folder), false, `${role}/${status}: delete`);
    }
  }
});

test("document status transitions follow the minimal review workflow", () => {
  const allowed: Array<[DocumentStatus, DocumentStatus]> = [
    ["DRAFT", "SUBMITTED"],
    ["SUBMITTED", "APPROVED"],
    ["SUBMITTED", "REJECTED"],
    ["REJECTED", "SUBMITTED"],
  ];

  for (const current of Object.values(DocumentStatus)) {
    for (const next of Object.values(DocumentStatus)) {
      const expected = allowed.some(([from, to]) => from === current && to === next);
      assert.equal(
        isValidDocumentStatusTransition(current, next),
        expected,
        `${current} -> ${next}`,
      );
    }
  }
});

const createdReportIds: string[] = [];

test("direct report transition service enforces status predicates and writes audit logs", async () => {
  const project = await prisma.project.findFirst({
    where: { deletedAt: null },
    select: { id: true },
  });
  const creator = await prisma.user.findFirst({
    where: { deletedAt: null, isActive: true },
    select: { id: true, name: true, role: true },
  });
  const approver = await prisma.user.findFirst({
    where: {
      deletedAt: null,
      isActive: true,
      role: { in: [UserRole.ADMIN, UserRole.DIRECTOR] },
    },
    select: { id: true, name: true, role: true },
  });

  assert.ok(project, "Cần ít nhất một công trình để chạy test R3a");
  assert.ok(creator, "Cần ít nhất một user hoạt động để chạy test R3a");
  assert.ok(approver, "Cần ADMIN hoặc DIRECTOR để chạy test R3a");

  const marker = `R3A-${Date.now()}`;
  const draft = await prisma.siteReport.create({
    data: {
      projectId: project.id,
      type: "DAILY",
      title: `${marker}-TRANSITION`,
      reportDate: new Date(),
      status: "DRAFT",
      createdById: creator.id,
      reporterName: creator.name,
    },
  });
  createdReportIds.push(draft.id);

  const submitted = await submitSiteReportTransition(prisma, draft.id, creator);
  assert.equal(submitted.status, "SUBMITTED");
  await assert.rejects(
    () => submitSiteReportTransition(prisma, draft.id, creator),
    /Trạng thái báo cáo đã thay đổi, vui lòng tải lại\./,
  );

  const approved = await approveSiteReportTransition(
    prisma,
    draft.id,
    approver,
    "R3a direct transition test",
  );
  assert.equal(approved.status, "APPROVED");
  await assert.rejects(
    () => approveSiteReportTransition(prisma, draft.id, approver),
    /Trạng thái báo cáo đã thay đổi, vui lòng tải lại\./,
  );
  await assert.rejects(
    () => rejectSiteReportTransition(prisma, draft.id, approver, "Không hợp lệ"),
    /Trạng thái báo cáo đã thay đổi, vui lòng tải lại\./,
  );

  const submittedForReject = await prisma.siteReport.create({
    data: {
      projectId: project.id,
      type: "DAILY",
      title: `${marker}-REJECT`,
      reportDate: new Date(),
      status: "SUBMITTED",
      submittedAt: new Date(),
      createdById: creator.id,
      reporterName: creator.name,
    },
  });
  createdReportIds.push(submittedForReject.id);

  await assert.rejects(
    () => rejectSiteReportTransition(prisma, submittedForReject.id, approver, " "),
    /Bắt buộc nhập lý do từ chối/,
  );
  const rejected = await rejectSiteReportTransition(
    prisma,
    submittedForReject.id,
    approver,
    "Thiếu bằng chứng hiện trường",
  );
  assert.equal(rejected.status, "REJECTED");
  const resubmitted = await submitSiteReportTransition(
    prisma,
    submittedForReject.id,
    creator,
  );
  assert.equal(resubmitted.status, "SUBMITTED");

  const actions = await prisma.auditLog.findMany({
    where: {
      entityType: "SiteReport",
      entityId: { in: [draft.id, submittedForReject.id] },
    },
    select: { action: true },
  });
  const actionNames = actions.map((item) => item.action);
  assert.ok(actionNames.includes("SITE_REPORT_SUBMITTED"));
  assert.ok(actionNames.includes("SITE_REPORT_APPROVED"));
  assert.ok(actionNames.includes("SITE_REPORT_REJECTED"));
});

test("direct report create service writes created and optional submitted audit logs", async () => {
  const project = await prisma.project.findFirst({
    where: { deletedAt: null },
    select: { id: true },
  });
  const creator = await prisma.user.findFirst({
    where: { deletedAt: null, isActive: true },
    select: { id: true, name: true, role: true },
  });
  assert.ok(project);
  assert.ok(creator);

  const marker = `R3A-CREATE-${Date.now()}`;
  const draft = await createSiteReportWithAudit(prisma, creator, {
    projectId: project.id,
    type: "DAILY",
    title: `${marker}-DRAFT`,
    reportDate: new Date(),
    status: "DRAFT",
  });
  createdReportIds.push(draft.id);

  const submitted = await createSiteReportWithAudit(prisma, creator, {
    projectId: project.id,
    type: "DAILY",
    title: `${marker}-SUBMITTED`,
    reportDate: new Date(),
    status: "SUBMITTED",
  });
  createdReportIds.push(submitted.id);

  assert.equal(draft.submittedAt, null);
  assert.ok(submitted.submittedAt);

  const logs = await prisma.auditLog.findMany({
    where: {
      entityType: "SiteReport",
      entityId: { in: [draft.id, submitted.id] },
    },
    orderBy: { createdAt: "asc" },
    select: { entityId: true, action: true },
  });

  assert.deepEqual(
    logs.filter((log) => log.entityId === draft.id).map((log) => log.action),
    ["SITE_REPORT_CREATED"],
  );
  assert.deepEqual(
    logs
      .filter((log) => log.entityId === submitted.id)
      .map((log) => log.action),
    ["SITE_REPORT_CREATED", "SITE_REPORT_SUBMITTED"],
  );
});

test.after(async () => {
  if (createdReportIds.length > 0) {
    await prisma.auditLog.deleteMany({
      where: { entityType: "SiteReport", entityId: { in: createdReportIds } },
    });
    await prisma.siteReport.deleteMany({
      where: { id: { in: createdReportIds } },
    });
  }
  await prisma.$disconnect();
});
