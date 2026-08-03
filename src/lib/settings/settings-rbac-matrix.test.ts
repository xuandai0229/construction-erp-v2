import { describe, it, expect } from "vitest";
import { UserRole, ProjectRole } from "@prisma/client";
import { resolvePermission } from "@/lib/permissions/permission-resolver";
import type { SessionUser } from "@/lib/auth";

const ALL_USER_ROLES: UserRole[] = [
  "ADMIN",
  "DIRECTOR",
  "DEPUTY_DIRECTOR",
  "CHIEF_COMMANDER",
  "MANAGER",
  "ENGINEER",
  "STAFF",
  "SUPERVISION_HEAD",
  "CONSTRUCTION_SUPERVISOR",
];

const ALL_PROJECT_ROLES: ProjectRole[] = [
  "PROJECT_MANAGER",
  "SITE_COMMANDER",
  "CHIEF_COMMANDER",
  "ASSISTANT_COMMANDER",
  "QA_QC",
  "HSE",
  "SUPERVISOR",
  "VIEWER",
];

function createMockSession(role: UserRole): SessionUser {
  return {
    id: `user_${role.toLowerCase()}`,
    name: `User ${role}`,
    email: `${role.toLowerCase()}@qa-e2e.local`,
    username: role.toLowerCase(),
    role,
    phone: null,
    isActive: true,
  };
}

describe("Phase 2 — Reconciled Canonical Role RBAC Matrix (9 System Roles + 8 Project Roles)", () => {
  describe("1. System Roles (UserRole) Settings Access Matrix", () => {
    const viewAllowed: UserRole[] = ["ADMIN", "DIRECTOR", "DEPUTY_DIRECTOR"];
    const companyManageAllowed: UserRole[] = ["ADMIN", "DIRECTOR"];
    const documentsManageAllowed: UserRole[] = ["ADMIN"];
    const adminViewAllowed: UserRole[] = ["ADMIN"];

    for (const role of ALL_USER_ROLES) {
      it(`UserRole ${role}: settings.view -> ${viewAllowed.includes(role)}`, async () => {
        const res = await resolvePermission(createMockSession(role), "settings.view");
        expect(res.allowed).toBe(viewAllowed.includes(role));
      });

      it(`UserRole ${role}: settings.company.manage -> ${companyManageAllowed.includes(role)}`, async () => {
        const res = await resolvePermission(createMockSession(role), "settings.company.manage");
        expect(res.allowed).toBe(companyManageAllowed.includes(role));
      });

      it(`UserRole ${role}: settings.documents.manage -> ${documentsManageAllowed.includes(role)}`, async () => {
        const res = await resolvePermission(createMockSession(role), "settings.documents.manage");
        expect(res.allowed).toBe(documentsManageAllowed.includes(role));
      });

      it(`UserRole ${role}: settings.administration.view -> ${adminViewAllowed.includes(role)}`, async () => {
        const res = await resolvePermission(createMockSession(role), "settings.administration.view");
        expect(res.allowed).toBe(adminViewAllowed.includes(role));
      });
    }
  });

  describe("2. Project Roles (ProjectRole) Settings Isolation", () => {
    // Non-company-wide system roles with any ProjectRole should NOT gain global settings management
    for (const projectRole of ALL_PROJECT_ROLES) {
      it(`ProjectRole ${projectRole} under STAFF user cannot manage settings.company`, async () => {
        const session = createMockSession("STAFF");
        const res = await resolvePermission(session, "settings.company.manage", { membership: { projectId: "proj_01", role: projectRole } });
        expect(res.allowed).toBe(false);
      });

      it(`ProjectRole ${projectRole} under STAFF user cannot manage settings.documents`, async () => {
        const session = createMockSession("STAFF");
        const res = await resolvePermission(session, "settings.documents.manage", { membership: { projectId: "proj_01", role: projectRole } });
        expect(res.allowed).toBe(false);
      });

      it(`ProjectRole ${projectRole} under ADMIN user retains settings.documents.manage`, async () => {
        const session = createMockSession("ADMIN");
        const res = await resolvePermission(session, "settings.documents.manage", { membership: { projectId: "proj_01", role: projectRole } });
        expect(res.allowed).toBe(true);
      });
    }
  });
});
