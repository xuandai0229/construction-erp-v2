import { describe, expect, it } from "vitest";
import type { UserRole } from "@prisma/client";
import {
  assertCanAccessExecutiveDashboard,
  canAccessExecutiveDashboard,
  canRoleAccessRoute,
  getDefaultNavigationHrefForRole,
  getDefaultRouteForRole,
  resolvePostLoginRoute,
} from "./role-workspace-policy";
import { canViewNavigationItem } from "../navigation-permissions";

const executiveRoles: UserRole[] = ["ADMIN", "DIRECTOR", "DEPUTY_DIRECTOR"];
const operationalRoles: UserRole[] = [
  "SUPERVISION_HEAD",
  "CONSTRUCTION_SUPERVISOR",
  "CHIEF_COMMANDER",
  "MANAGER",
  "ENGINEER",
  "STAFF",
];

describe("role workspace policy", () => {
  it.each(executiveRoles)("%s keeps the existing dashboard route and menu", (role) => {
    expect(getDefaultRouteForRole(role)).toBe("/dashboard");
    expect(getDefaultNavigationHrefForRole(role)).toBe("/dashboard");
    expect(canAccessExecutiveDashboard(role)).toBe(true);
    expect(canViewNavigationItem(role, "/dashboard")).toBe(true);
    expect(resolvePostLoginRoute(role, "/dashboard?period=30d")).toBe("/dashboard?period=30d");
    expect(() => assertCanAccessExecutiveDashboard(role)).not.toThrow();
  });

  it.each(operationalRoles)("%s cannot render or navigate to the executive dashboard", (role) => {
    expect(getDefaultRouteForRole(role)).not.toBe("/dashboard");
    expect(canAccessExecutiveDashboard(role)).toBe(false);
    expect(canViewNavigationItem(role, "/dashboard")).toBe(false);
    expect(resolvePostLoginRoute(role, "/dashboard")).toBe(getDefaultRouteForRole(role));
    expect(() => assertCanAccessExecutiveDashboard(role)).toThrow("FORBIDDEN_EXECUTIVE_DASHBOARD");
  });

  it("maps every operational role to an existing work route", () => {
    expect(getDefaultRouteForRole("SUPERVISION_HEAD")).toBe("/reports/weekly-inspection");
    expect(getDefaultNavigationHrefForRole("SUPERVISION_HEAD")).toBe("/reports");
    expect(getDefaultRouteForRole("CONSTRUCTION_SUPERVISOR")).toBe("/reports/weekly-inspection");
    expect(getDefaultNavigationHrefForRole("CONSTRUCTION_SUPERVISOR")).toBe("/reports");
    expect(getDefaultRouteForRole("CHIEF_COMMANDER")).toBe("/projects");
    expect(getDefaultRouteForRole("MANAGER")).toBe("/projects");
    expect(getDefaultRouteForRole("ENGINEER")).toBe("/projects");
    expect(getDefaultNavigationHrefForRole("ENGINEER")).toBe("/projects");
    expect(getDefaultRouteForRole("STAFF")).toBe("/projects");
    expect(getDefaultNavigationHrefForRole("STAFF")).toBe("/projects");
  });

  it("keeps authorized local callbacks and rejects unsafe or unauthorized callbacks", () => {
    expect(resolvePostLoginRoute("ENGINEER", "/projects")).toBe("/projects");
    expect(resolvePostLoginRoute("ENGINEER", "/users")).toBe("/projects");
    expect(resolvePostLoginRoute("ENGINEER", "https://example.com/dashboard")).toBe("/projects");
    expect(resolvePostLoginRoute("ENGINEER", "//example.com/dashboard")).toBe("/projects");
    expect(canRoleAccessRoute("DIRECTOR", "/users")).toBe(true);
    expect(canRoleAccessRoute("STAFF", "/users")).toBe(false);
  });
});
