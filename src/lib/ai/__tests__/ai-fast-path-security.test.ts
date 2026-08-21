import { describe, it, expect, vi } from "vitest";
import { executeAIChatTurn } from "../controller/ai-chat-controller";
import prisma from "@/lib/prisma";
import { AIRequestContext } from "../types";

describe("AI Fast Path Security Order & Invariant Tests", () => {
  it("Invariant 1: Unauthenticated request to Fast Path query is rejected with HTTP 401 UNAUTHENTICATED", async () => {
    const res = await executeAIChatTurn({
      messages: [{ role: "user", content: "Tôi đang phụ trách những công trình nào?" }],
      contextOptions: { explicitUser: null as any },
    });

    expect(res.success).toBe(false);
    expect(res.httpStatus).toBe(401);
    expect(res.error?.code).toBe("UNAUTHENTICATED");
    expect(res.toolCallsExecuted).toBe(0);
  });

  it("Invariant 2: Rate limit guard triggers BEFORE Fast Path execution", async () => {
    const mockUser = {
      id: "user_rate_limit_fast_path_test",
      email: "fastpath_rate@test.com",
      username: "fastpath_rate",
      role: "ADMIN" as const,
      name: "FastPath Rate Tester",
      phone: null,
      isActive: true,
      deletedAt: null,
      mustChangePassword: false,
    };

    vi.spyOn(prisma.user, "findUnique").mockResolvedValue(mockUser as any);
    vi.spyOn(prisma.project, "count").mockResolvedValue(1);
    vi.spyOn(prisma.project, "findMany").mockResolvedValue([
      {
        id: "proj_1",
        code: "CT-2026-0001",
        name: "P1",
        displayName: null,
        status: "ACTIVE",
        location: null,
        startDate: null,
        endDate: null,
        updatedAt: new Date(),
        _count: { members: 1 },
      },
    ] as any);

    // Exhaust 10 requests
    for (let i = 0; i < 10; i++) {
      await executeAIChatTurn({
        messages: [{ role: "user", content: "Tôi đang phụ trách những công trình nào?" }],
        contextOptions: { explicitUser: mockUser },
      });
    }

    // 11th request must be blocked by rate limiter
    const blockedRes = await executeAIChatTurn({
      messages: [{ role: "user", content: "Tôi đang phụ trách những công trình nào?" }],
      contextOptions: { explicitUser: mockUser },
    });

    expect(blockedRes.success).toBe(false);
    expect(blockedRes.httpStatus).toBe(429);
    expect(blockedRes.error?.code).toBe("APP_RATE_LIMITED");
    expect(blockedRes.content).toContain("quá nhanh");
  });

  it("Invariant 3: Fast Path enforces project scope and does NOT leak global project count to scoped users", async () => {
    const scopedUser = {
      id: "user_scoped_fast_path_test",
      email: "commander_fastpath@test.com",
      username: "commander_fastpath",
      role: "CHIEF_COMMANDER" as const,
      name: "Commander FastPath",
      phone: null,
      isActive: true,
      deletedAt: null,
      mustChangePassword: false,
    };

    vi.spyOn(prisma.user, "findUnique").mockResolvedValue(scopedUser as any);
    vi.spyOn(prisma.projectMember, "findMany").mockResolvedValue([
      { projectId: "proj_1" },
      { projectId: "proj_2" },
    ] as any);

    vi.spyOn(prisma.project, "count").mockResolvedValue(2);
    vi.spyOn(prisma.project, "findMany").mockResolvedValue([
      {
        id: "proj_1",
        code: "CT-2026-0001",
        name: "Project 1",
        displayName: "Project 1 Display",
        status: "ACTIVE",
        location: "Hà Nội",
        startDate: null,
        endDate: null,
        updatedAt: new Date(),
        _count: { members: 3 },
      },
      {
        id: "proj_2",
        code: "CT-2026-0002",
        name: "Project 2",
        displayName: "Project 2 Display",
        status: "ACTIVE",
        location: "Hồ Chí Minh",
        startDate: null,
        endDate: null,
        updatedAt: new Date(),
        _count: { members: 2 },
      },
    ] as any);

    const res = await executeAIChatTurn({
      messages: [{ role: "user", content: "Tôi đang phụ trách những công trình nào?" }],
      contextOptions: { explicitUser: scopedUser },
    });

    expect(res.success).toBe(true);
    expect(res.httpStatus).toBe(200);
    expect(res.content).toContain("Bạn đang phụ trách **2 công trình**");
    expect(res.content).not.toContain("21 công trình");
  });
});
