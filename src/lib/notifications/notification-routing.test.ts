import assert from "node:assert/strict";
import test from "node:test";
import {
  buildApprovalNotificationTarget,
  buildReportNotificationTarget,
} from "./notification-routing";

test("approval notifications deep-link to the requested approval detail, not the generic approvals page", () => {
  const target = buildApprovalNotificationTarget({
    approvalId: "approval-123",
    projectId: "project-456",
    approvalType: "MATERIAL",
    sourceType: "MATERIAL_REQUEST",
    sourceId: "material-789",
    notificationId: "app-approval-123",
  });

  assert.equal(target.targetType, "MATERIAL_REQUEST");
  assert.equal(target.targetId, "material-789");
  assert.equal(
    target.actionUrl,
    "/approvals?projectId=project-456&approvalId=approval-123&id=material-789&type=material-request&open=1&notificationId=app-approval-123",
  );
  assert.notEqual(target.actionUrl, "/approvals");
});

test("approval notifications fall back to approval detail when no source record is linked", () => {
  const target = buildApprovalNotificationTarget({
    approvalId: "approval-123",
    projectId: "project-456",
    approvalType: "CHANGE_ORDER",
    sourceType: null,
    sourceId: null,
    notificationId: "app-approval-123",
  });

  assert.equal(target.targetType, "APPROVAL_REQUEST");
  assert.equal(target.targetId, "approval-123");
  assert.equal(
    target.actionUrl,
    "/approvals?projectId=project-456&approvalId=approval-123&id=approval-123&type=change-order&open=1&notificationId=app-approval-123",
  );
});

test("report notifications deep-link to the specific report", () => {
  const target = buildReportNotificationTarget({
    reportId: "report-123",
    projectId: "project-456",
    status: "PENDING",
    notificationId: "rep-report-123",
  });

  assert.equal(target.targetType, "SITE_REPORT");
  assert.equal(target.targetId, "report-123");
  assert.equal(
    target.actionUrl,
    "/reports?projectId=project-456&reportId=report-123&id=report-123&open=1&status=PENDING&notificationId=rep-report-123",
  );
});
