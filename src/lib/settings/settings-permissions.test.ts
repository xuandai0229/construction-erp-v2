import { describe, expect, it } from "vitest";
import type { UserRole } from "@prisma/client";
import { getSettingsAccess } from "./settings-permissions";
import { canRoleAccessRoute } from "@/lib/roles/role-workspace-policy";

describe("Settings permission matrix", () => {
  it.each([
    ["ADMIN", { canView: true, canViewCompany: true, canManageCompany: true, canViewDocuments: true, canManageDocuments: true, canViewAdministration: true }],
    ["DIRECTOR", { canView: true, canViewCompany: true, canManageCompany: true, canViewDocuments: true, canManageDocuments: false, canViewAdministration: false }],
    ["DEPUTY_DIRECTOR", { canView: true, canViewCompany: true, canManageCompany: false, canViewDocuments: true, canManageDocuments: false, canViewAdministration: false }],
    ["SUPERVISION_HEAD", { canView: false, canViewCompany: false, canManageCompany: false, canViewDocuments: false, canManageDocuments: false, canViewAdministration: false }],
    ["CONSTRUCTION_SUPERVISOR", { canView: false, canViewCompany: false, canManageCompany: false, canViewDocuments: false, canManageDocuments: false, canViewAdministration: false }],
    ["CHIEF_COMMANDER", { canView: false, canViewCompany: false, canManageCompany: false, canViewDocuments: false, canManageDocuments: false, canViewAdministration: false }],
    ["MANAGER", { canView: false, canViewCompany: false, canManageCompany: false, canViewDocuments: false, canManageDocuments: false, canViewAdministration: false }],
    ["ENGINEER", { canView: false, canViewCompany: false, canManageCompany: false, canViewDocuments: false, canManageDocuments: false, canViewAdministration: false }],
    ["STAFF", { canView: false, canViewCompany: false, canManageCompany: false, canViewDocuments: false, canManageDocuments: false, canViewAdministration: false }],
  ] as const)("applies the agreed capability projection for %s", (role, expected) => {
    expect(getSettingsAccess(role as UserRole)).toEqual(expected);
    expect(canRoleAccessRoute(role as UserRole, "/settings")).toBe(expected.canView);
  });
});
