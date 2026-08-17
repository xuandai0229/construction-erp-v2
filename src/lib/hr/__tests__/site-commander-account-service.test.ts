import { describe, expect, it, vi } from "vitest";
import {
  normalizePersonName,
  provisionSiteCommanderAccount,
  SiteCommanderProvisioningError,
} from "../site-commander-account-service";

function assignment(projectId: string, name: string) {
  return {
    id: `assignment-${projectId}`,
    employeeId: "employee-1",
    projectId,
    projectPersonnelRoleId: "role-cht",
    project: { id: projectId, code: projectId.toUpperCase(), name },
    projectPersonnelRole: { code: "CHT", name: "Chỉ huy trưởng" },
  };
}

function mockPrisma(employeeOverrides: Record<string, unknown> = {}, existingMembers: unknown[] = []) {
  const createdUser = {
    id: "user-created",
    email: "commander@example.com",
    username: "nv-001",
    password: "hash",
    name: "Phạm Anh Tuấn",
    role: "CHIEF_COMMANDER",
    phone: "0900000000",
    avatar: null,
    isActive: true,
    mustChangePassword: true,
    passwordChangedAt: null,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const tx = {
    $executeRaw: vi.fn().mockResolvedValue(1),
    employee: {
      findUnique: vi.fn().mockResolvedValue({
        id: "employee-1",
        code: "NV-001",
        fullName: "Phạm Anh Tuấn",
        status: "ACTIVE",
        personalEmail: "commander@example.com",
        phoneNumber: "0900000000",
        userId: null,
        user: null,
        projectAssignments: [assignment("project-a", "Công trình A"), assignment("project-b", "Công trình B")],
        ...employeeOverrides,
      }),
      findMany: vi.fn().mockResolvedValue([{ id: "employee-1", fullName: "Phạm Anh Tuấn" }]),
      update: vi.fn().mockResolvedValue({}),
    },
    user: {
      findFirst: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue(createdUser),
    },
    projectMember: {
      findMany: vi.fn().mockResolvedValue(existingMembers),
      createMany: vi.fn().mockResolvedValue({ count: 2 }),
    },
    employeeChangeHistory: { create: vi.fn().mockResolvedValue({}) },
    auditLog: { create: vi.fn().mockResolvedValue({}) },
  };
  const prisma = { $transaction: vi.fn().mockImplementation(async (callback) => callback(tx)) };
  return { prisma, tx };
}

describe("site commander account provisioning", () => {
  it("normalizes case, whitespace and Vietnamese diacritics for duplicate detection", () => {
    expect(normalizePersonName("  PHẠM   Anh Tuấn ")).toBe(normalizePersonName("phạm anh tuấn"));
  });

  it("creates one User and N ProjectMember rows for a multi-project assignment", async () => {
    const { prisma, tx } = mockPrisma();
    const result = await provisionSiteCommanderAccount({ prisma: prisma as never, employeeId: "employee-1", actorUserId: "admin-1" });
    expect(result.code).toBe("CREATED");
    expect(result.projectIds).toEqual(["project-a", "project-b"]);
    expect(tx.user.create).toHaveBeenCalledTimes(1);
    expect(tx.projectMember.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({ projectId: "project-a", userId: "user-created", role: "CHIEF_COMMANDER" }),
        expect.objectContaining({ projectId: "project-b", userId: "user-created", role: "CHIEF_COMMANDER" }),
      ]),
    });
    expect(result.temporaryPassword).toBeTruthy();
  });

  it("does not write when the Employee has no verified CHT assignment", async () => {
    const { prisma, tx } = mockPrisma({ projectAssignments: [] });
    await expect(
      provisionSiteCommanderAccount({ prisma: prisma as never, employeeId: "employee-1", actorUserId: "admin-1" }),
    ).rejects.toMatchObject({ code: "ASSIGNMENT_NOT_FOUND" } satisfies Partial<SiteCommanderProvisioningError>);
    expect(tx.user.create).not.toHaveBeenCalled();
  });

  it("rolls back before account creation when another commander owns a project", async () => {
    const { prisma, tx } = mockPrisma({}, [{
      id: "member-other",
      projectId: "project-a",
      userId: "other-user",
      role: "CHIEF_COMMANDER",
      isActive: true,
      deletedAt: null,
      leftAt: null,
    }]);
    await expect(
      provisionSiteCommanderAccount({ prisma: prisma as never, employeeId: "employee-1", actorUserId: "admin-1" }),
    ).rejects.toMatchObject({ code: "PROJECT_COMMANDER_CONFLICT" } satisfies Partial<SiteCommanderProvisioningError>);
    expect(tx.user.create).not.toHaveBeenCalled();
  });
});
