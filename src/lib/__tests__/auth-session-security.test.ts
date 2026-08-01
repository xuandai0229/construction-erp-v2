import { describe, it, expect, beforeAll } from 'vitest';
import { createSessionToken, verifySessionToken } from '@/lib/session-token';
import { resolvePostLoginRoute, getDefaultRouteForRole, canRoleAccessRoute } from '@/lib/roles/role-workspace-policy';
import type { UserRole } from '@prisma/client';

describe("Auth & Session Token Security Audit Suite", () => {
  beforeAll(() => {
    process.env.AUTH_SECRET = "7d0df714335ae7d984444d9791ecb19ca384d31289fcba2f0ed3b5bbc5d2c4db";
  });

  it("generates and verifies valid session tokens", () => {
    const userId = "user-qa-12345";
    const token = createSessionToken(userId);
    expect(typeof token).toBe("string");

    const payload = verifySessionToken(token);
    expect(payload).not.toBeNull();
    expect(payload?.userId).toBe(userId);
  });

  it("rejects tampered session tokens", () => {
    const userId = "user-qa-12345";
    const token = createSessionToken(userId);
    const tamperedToken = token.slice(0, -4) + "XXXX";

    const payload = verifySessionToken(tamperedToken);
    expect(payload).toBeNull();
  });

  it("rejects malformed token strings", () => {
    expect(verifySessionToken("")).toBeNull();
    expect(verifySessionToken("invalid.token.structure")).toBeNull();
    expect(verifySessionToken("abc.def")).toBeNull();
  });

  it("prevents Open Redirect attacks in post-login route resolution", () => {
    const role: UserRole = "STAFF";
    
    // External URLs must be rejected
    expect(resolvePostLoginRoute(role, "https://malicious-site.com/steal-cookie")).toBe("/tasks?mine=1");
    expect(resolvePostLoginRoute(role, "http://phishing.com")).toBe("/tasks?mine=1");
    expect(resolvePostLoginRoute(role, "//evil.com/path")).toBe("/tasks?mine=1");
    expect(resolvePostLoginRoute(role, "\\\\evil.com\\path")).toBe("/tasks?mine=1");

    // Access to unauthorized routes must be redirected to role default
    expect(resolvePostLoginRoute(role, "/dashboard")).toBe("/tasks?mine=1");
    expect(resolvePostLoginRoute(role, "/users")).toBe("/tasks?mine=1");

    // Access to valid, authorized local routes must be preserved
    expect(resolvePostLoginRoute(role, "/tasks?mine=1")).toBe("/tasks?mine=1");
  });

  it("enforces strict role-based workspace default routes for all 9 roles", () => {
    const roleMapping: Record<UserRole, string> = {
      ADMIN: "/dashboard",
      DIRECTOR: "/dashboard",
      DEPUTY_DIRECTOR: "/dashboard",
      CHIEF_COMMANDER: "/projects",
      MANAGER: "/projects",
      ENGINEER: "/tasks?mine=1",
      STAFF: "/tasks?mine=1",
      SUPERVISION_HEAD: "/reports/weekly-inspection",
      CONSTRUCTION_SUPERVISOR: "/reports/weekly-inspection",
    };

    (Object.keys(roleMapping) as UserRole[]).forEach((role) => {
      const defaultRoute = getDefaultRouteForRole(role);
      expect(defaultRoute).toBe(roleMapping[role]);
      const pathname = defaultRoute.split('?')[0];
      expect(canRoleAccessRoute(role, pathname)).toBe(true);
    });
  });
});
