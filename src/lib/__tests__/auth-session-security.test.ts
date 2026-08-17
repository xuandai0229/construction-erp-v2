import { describe, it, expect, beforeAll } from 'vitest';
import { randomBytes } from 'node:crypto';
import { createSessionToken, verifySessionToken } from '@/lib/session-token';
import { resolvePostLoginRoute, getDefaultRouteForRole, canRoleAccessRoute } from '@/lib/roles/role-workspace-policy';
import type { UserRole } from '@prisma/client';

describe("Auth & Session Token Security Audit Suite", () => {
  beforeAll(() => {
    process.env.AUTH_SECRET = process.env.AUTH_SECRET || randomBytes(32).toString('hex');
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

  it("preserves the mandatory first-login password-change flag", () => {
    const token = createSessionToken("temporary-user", 1_800_000_000, "credential-v1", true);
    const payload = verifySessionToken(token, 1_800_000_001);
    expect(payload?.mustChangePassword).toBe(true);
    expect(payload?.credentialVersion).toBe("credential-v1");
  });

  it("prevents Open Redirect attacks in post-login route resolution", () => {
    const role: UserRole = "STAFF";
    
    // External URLs must be rejected
    expect(resolvePostLoginRoute(role, "https://malicious-site.com/steal-cookie")).toBe("/projects");
    expect(resolvePostLoginRoute(role, "http://phishing.com")).toBe("/projects");
    expect(resolvePostLoginRoute(role, "//evil.com/path")).toBe("/projects");
    expect(resolvePostLoginRoute(role, "\\\\evil.com\\path")).toBe("/projects");

    // Access to unauthorized routes must be redirected to role default
    expect(resolvePostLoginRoute(role, "/dashboard")).toBe("/projects");
    expect(resolvePostLoginRoute(role, "/users")).toBe("/projects");

    // Access to valid, authorized local routes must be preserved
    expect(resolvePostLoginRoute(role, "/projects")).toBe("/projects");
  });

  it("enforces strict role-based workspace default routes for all 9 roles", () => {
    const roleMapping: Record<UserRole, string> = {
      ADMIN: "/dashboard",
      DIRECTOR: "/dashboard",
      DEPUTY_DIRECTOR: "/dashboard",
      CHIEF_COMMANDER: "/projects",
      MANAGER: "/projects",
      ENGINEER: "/projects",
      STAFF: "/projects",
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
