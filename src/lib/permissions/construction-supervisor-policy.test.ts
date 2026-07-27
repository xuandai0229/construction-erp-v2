import { describe, expect, it } from "vitest";
import { evaluatePermissionPolicy } from "./evaluate-permission-policy";
import { getMaterialPermissions } from "../materials/materials-permissions";
import { getFieldProgressPermissions } from "../field-progress/field-progress-permissions";
import { canCreateReport, canExportReport, canSubmitReport, canUpdateReport } from "../reports/report-workflow-policy";
import { canDownloadDocument } from "../documents/permissions";

const actor = { actorUserId: "officer", systemRole: "CONSTRUCTION_SUPERVISOR" as const, requestedProjectId: "project-without-membership" };

describe("construction supervisor canonical permission matrix", () => {
  it.each(["projects.view", "documents.view", "reports.view", "materials.view", "approvals.view"] as const)("allows %s globally without membership", (permission) => {
    const result = evaluatePermissionPolicy({ ...actor, permission, membership: null });
    expect(result.allowed).toBe(true);
    expect(result.scope).toBe("GLOBAL");
  });

  it.each([
    "projects.create", "projects.update", "projects.assign_member",
    "documents.upload", "documents.update", "documents.delete", "documents.download",
    "reports.create", "reports.update", "reports.submit", "reports.approve", "reports.reject", "reports.export",
    "materials.request", "materials.update", "materials.approve", "materials.receive", "materials.issue",
    "approvals.create", "approvals.decide", "users.view", "settings.company",
  ] as const)("denies %s without a mutation grant", (permission) => {
    const result = evaluatePermissionPolicy({ ...actor, permission, membership: null });
    expect(result.allowed).toBe(false);
  });

  it("does not change the existing director management grant", () => {
    expect(evaluatePermissionPolicy({ ...actor, systemRole: "DIRECTOR", permission: "projects.update" }).allowed).toBe(true);
  });

  it.each([
    ["ADMIN", true],
    ["DIRECTOR", true],
    ["DEPUTY_DIRECTOR", true],
    ["SUPERVISION_HEAD", false],
    ["CHIEF_COMMANDER", false],
    ["MANAGER", false],
    ["ENGINEER", false],
    ["STAFF", false],
  ] as const)("preserves the existing %s project-management grant", (systemRole, expected) => {
    expect(evaluatePermissionPolicy({ ...actor, systemRole, permission: "projects.update", membership: null }).allowed).toBe(expected);
  });

  it("keeps source module policies read-only even when all-project access is true", () => {
    const materials = getMaterialPermissions("CONSTRUCTION_SUPERVISOR", null);
    expect(materials.canView).toBe(true);
    expect(materials.canCreate).toBe(false);
    expect(materials.canImport).toBe(false);
    expect(materials.canExport).toBe(false);

    const progress = getFieldProgressPermissions("CONSTRUCTION_SUPERVISOR", null);
    expect(progress).toEqual({ canViewProgress: true, canUpdateProgress: false, canApproveProgress: false, canLockProgress: false });

    const user = { id: "officer", role: "CONSTRUCTION_SUPERVISOR" as const };
    const report = { createdById: user.id, status: "DRAFT" };
    expect(canCreateReport(user, true)).toBe(false);
    expect(canUpdateReport(report, user, true)).toBe(false);
    expect(canSubmitReport(report, user, true)).toBe(false);
    expect(canExportReport(report, user, true)).toBe(false);
    expect(canDownloadDocument(user, { id: "document", status: "DRAFT", uploadedById: user.id })).toBe(false);
  });
});
