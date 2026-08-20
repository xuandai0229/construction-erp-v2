import { describe, it, expect, vi, beforeEach } from "vitest";
import { resolveAIRequestContext } from "../context/ai-context-resolver";
import prisma from "@/lib/prisma";

describe("AIRequestContext Resolver & Identity Guard", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("should fail closed and return null if no session user exists", async () => {
    const context = await resolveAIRequestContext({ explicitUser: undefined });
    expect(context).toBeNull();
  });

  it("should fail closed and return null if user is soft-deleted in DB", async () => {
    vi.spyOn(prisma.user, "findUnique").mockResolvedValueOnce({
      id: "deleted_user_123",
      email: "deleted@example.com",
      username: "deleted",
      name: "Deleted User",
      role: "STAFF",
      isActive: false,
      deletedAt: new Date(),
      mustChangePassword: false,
    } as any);

    const context = await resolveAIRequestContext({
      explicitUser: {
        id: "deleted_user_123",
        role: "STAFF",
        email: "deleted@example.com",
        username: "deleted",
        name: "Deleted User",
        isActive: false,
        phone: null,
      },
    });

    expect(context).toBeNull();
  });

  it("should resolve ALL_PROJECTS scope for ADMIN user from database", async () => {
    vi.spyOn(prisma.user, "findUnique").mockResolvedValueOnce({
      id: "admin_user_1",
      email: "admin@construction.local",
      username: "admin",
      name: "System Admin",
      role: "ADMIN",
      isActive: true,
      deletedAt: null,
      mustChangePassword: false,
    } as any);

    const context = await resolveAIRequestContext({
      explicitUser: {
        id: "admin_user_1",
        role: "ADMIN",
        email: "admin@construction.local",
        username: "admin",
        name: "System Admin",
        isActive: true,
        phone: null,
      },
    });

    expect(context).not.toBeNull();
    expect(context?.userId).toBe("admin_user_1");
    expect(context?.role).toBe("ADMIN");
    expect(context?.projectScope.kind).toBe("ALL_PROJECTS");
  });

  it("should resolve PROJECT_IDS scope for CHIEF_COMMANDER based on database memberships", async () => {
    vi.spyOn(prisma.user, "findUnique").mockResolvedValueOnce({
      id: "commander_user_1",
      email: null,
      username: "NV-2026-0002",
      name: "Lê Mạnh Hùng",
      role: "CHIEF_COMMANDER",
      isActive: true,
      deletedAt: null,
      mustChangePassword: false,
    } as any);

    vi.spyOn(prisma.projectMember, "findMany").mockResolvedValueOnce([
      { projectId: "project_A" },
      { projectId: "project_B" },
    ] as any);

    const context = await resolveAIRequestContext({
      explicitUser: {
        id: "commander_user_1",
        role: "CHIEF_COMMANDER",
        email: null,
        username: "NV-2026-0002",
        name: "Lê Mạnh Hùng",
        isActive: true,
        phone: null,
      },
    });

    expect(context).not.toBeNull();
    expect(context?.userId).toBe("commander_user_1");
    expect(context?.role).toBe("CHIEF_COMMANDER");
    expect(context?.projectScope.kind).toBe("PROJECT_IDS");
    if (context?.projectScope.kind === "PROJECT_IDS") {
      expect(context.projectScope.projectIds).toEqual(["project_A", "project_B"]);
    }
  });

  it("should clamp activeProjectId if it is outside user's authorized scope", async () => {
    vi.spyOn(prisma.user, "findUnique").mockResolvedValueOnce({
      id: "engineer_user_1",
      email: "eng@example.com",
      username: "engineer",
      name: "Site Engineer",
      role: "ENGINEER",
      isActive: true,
      deletedAt: null,
      mustChangePassword: false,
    } as any);

    vi.spyOn(prisma.projectMember, "findMany").mockResolvedValueOnce([
      { projectId: "project_A" },
    ] as any);

    const context = await resolveAIRequestContext({
      explicitUser: {
        id: "engineer_user_1",
        role: "ENGINEER",
        email: "eng@example.com",
        username: "engineer",
        name: "Site Engineer",
        isActive: true,
        phone: null,
      },
      activeProjectId: "project_UNAUTHORIZED_X",
    });

    expect(context).not.toBeNull();
    expect(context?.activeProjectId).toBeUndefined(); // Clamped/cleared
  });
});
