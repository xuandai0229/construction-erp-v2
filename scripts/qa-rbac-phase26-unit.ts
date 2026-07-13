import assert from "node:assert/strict";
import { sanitizeAuditData } from "../src/lib/audit";
import { mapAuthorizationErrorForClient } from "../src/lib/permissions/authorization-error";
import { evaluatePermissionPolicy, type PermissionPolicyContext } from "../src/lib/permissions/evaluate-permission-policy";
import { PermissionDeniedError } from "../src/lib/permissions/permission-resolver";

const actor = "actor";
const project = "project-a";
const member = { projectId: project, role: "QA_QC" as const, isActive: true };
const check = (label: string, expected: boolean, input: Omit<PermissionPolicyContext, "actorUserId">) => assert.equal(evaluatePermissionPolicy({ actorUserId: actor, ...input }).allowed, expected, label);

// ACCOUNTANT and MANAGER are never global merely because of their system role.
check("accountant without membership denied", false, { systemRole: "ACCOUNTANT", permission: "payments.create", requestedProjectId: project });
check("accountant viewer may view", true, { systemRole: "ACCOUNTANT", permission: "payments.view", requestedProjectId: project, membership: { ...member, role: "VIEWER" } });
check("accountant viewer cannot mutate", false, { systemRole: "ACCOUNTANT", permission: "payments.mark_paid", requestedProjectId: project, membership: { ...member, role: "VIEWER" } });
check("accountant assigned project may mutate", true, { systemRole: "ACCOUNTANT", permission: "payments.update", requestedProjectId: project, membership: member });
check("manager without membership approval denied", false, { systemRole: "MANAGER", permission: "approvals.create", requestedProjectId: project });
check("manager assigned project approval allowed", true, { systemRole: "MANAGER", permission: "approvals.create", requestedProjectId: project, membership: { ...member, role: "PROJECT_MANAGER" } });

// VIEWER policy: inspection only, never approval initiation or mutation.
const viewer = { ...member, role: "VIEWER" as const };
check("viewer approvals view", true, { systemRole: "ENGINEER", permission: "approvals.view", requestedProjectId: project, membership: viewer });
for (const permission of ["approvals.create", "approvals.decide", "documents.upload", "documents.update", "documents.delete", "payments.create", "materials.request", "materials.issue", "contracts.create"] as const) check(`viewer ${permission} denied`, false, { systemRole: "ENGINEER", permission, requestedProjectId: project, membership: viewer });

// Membership and scope precedence.
check("inactive membership", false, { systemRole: "ENGINEER", permission: "documents.view", requestedProjectId: project, membership: { ...member, isActive: false } });
check("soft deleted membership", false, { systemRole: "ENGINEER", permission: "documents.view", requestedProjectId: project, membership: { ...member, deletedAt: new Date() } });
check("left membership", false, { systemRole: "ENGINEER", permission: "documents.view", requestedProjectId: project, membership: { ...member, leftAt: new Date() } });
check("membership different project", false, { systemRole: "ENGINEER", permission: "documents.view", requestedProjectId: "project-b", membership: member });
check("inactive project", false, { systemRole: "ENGINEER", permission: "documents.view", requestedProjectId: project, membership: member, projectActive: false });
check("own record", true, { systemRole: "ENGINEER", permission: "documents.update", requestedProjectId: project, membership: viewer, resourceOwnerId: actor });
check("global director", true, { systemRole: "DIRECTOR", permission: "payments.approve", requestedProjectId: "project-b" });
check("no scope supplier only special case", true, { systemRole: "ENGINEER", permission: "suppliers.view" });
check("no project otherwise denied", false, { systemRole: "ENGINEER", permission: "documents.view" });
check("missing resource", false, { systemRole: "ENGINEER", permission: "documents.view", requestedProjectId: project, membership: member, resourceExists: false });
check("self approval", false, { systemRole: "ENGINEER", permission: "approvals.decide", requestedProjectId: project, membership: { ...member, role: "PROJECT_MANAGER" }, resourceOwnerId: actor, resourceStatus: "PENDING" });
check("wrong workflow status", false, { systemRole: "ENGINEER", permission: "approvals.decide", requestedProjectId: project, membership: { ...member, role: "PROJECT_MANAGER" }, resourceOwnerId: "other", resourceStatus: "APPROVED" });
check("wrong resource type", false, { systemRole: "ENGINEER", permission: "approvals.decide", requestedProjectId: project, membership: { ...member, role: "PROJECT_MANAGER" }, resourceOwnerId: "other", resourceStatus: "PENDING", resourceType: "UNSUPPORTED" });

// Error mapper never returns resolution metadata.
const resolution = evaluatePermissionPolicy({ actorUserId: actor, systemRole: "ENGINEER", permission: "documents.view", requestedProjectId: project });
const publicError = mapAuthorizationErrorForClient(new PermissionDeniedError(resolution, project));
assert.deepEqual(publicError, { code: "FORBIDDEN", message: "Bạn không có quyền thực hiện thao tác này." });
assert.ok(!JSON.stringify(publicError).includes("project-a"));
assert.ok(!JSON.stringify(publicError).includes("documents.view"));

// Recursive, array-safe audit sanitization is non-mutating and handles special values.
const auditInput = { apiKey: "key", nested: [{ authorization: "Bearer abc.def", link: "https://x.test/a?signature=abc&safe=1" }], deep: { a: { b: { c: { d: { e: { f: { g: { h: { token: "hidden" } } } } } } } } }, count: 1n, when: new Date("2026-01-01T00:00:00.000Z") };
const sanitized = sanitizeAuditData(auditInput) as Record<string, unknown>;
assert.equal(sanitized.apiKey, "[REDACTED]");
assert.equal(((sanitized.nested as Record<string, unknown>[])[0]).authorization, "[REDACTED]");
assert.ok(String(((sanitized.nested as Record<string, unknown>[])[0]).link).includes("signature=[REDACTED]"));
assert.equal(sanitized.count, "1");
assert.equal(auditInput.apiKey, "key");
assert.equal(auditInput.nested[0].authorization, "Bearer abc.def");

console.log("PASS: Phase 2.6 pure permission, authorization error, and audit sanitizer unit tests.");
