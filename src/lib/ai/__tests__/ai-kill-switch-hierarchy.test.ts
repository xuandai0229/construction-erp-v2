import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { evaluateAIGuards } from "../controller/ai-guard";
import { isUserInPilotCohort, ALLOWED_PILOT_USER_IDS } from "../pilot/ai-pilot-cohort";
import prisma from "@/lib/prisma";

describe("AI Runtime Kill Switch & Pilot Enforcement Hierarchy Test", () => {
  const originalAiReadOnlyEnv = process.env.AI_READ_ONLY_ENABLED;
  const originalPilotEnv = process.env.AI_PILOT_ENFORCEMENT;
  const testUserId = "cmroatu6r0000mowklk61sv56"; // Enrolled Active Admin

  beforeEach(() => {
    process.env.AI_READ_ONLY_ENABLED = "true";
    process.env.AI_PILOT_ENFORCEMENT = "true";
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env.AI_READ_ONLY_ENABLED = originalAiReadOnlyEnv;
    process.env.AI_PILOT_ENFORCEMENT = originalPilotEnv;
    vi.restoreAllMocks();
  });

  it("1. State 1: Normal Operation (ENV=true, DB=enabled) -> Request succeeds", async () => {
    vi.spyOn(prisma.systemSetting, "findUnique").mockResolvedValue({
      id: "setting-1",
      singletonKey: "DEFAULT_SETTINGS",
      aiReadOnlyEnabled: true,
      updatedAt: new Date(),
    } as any);

    const guard = await evaluateAIGuards(testUserId);
    expect(guard.allowed).toBe(true);
    expect(guard.code).toBeUndefined();
  });

  it("2. State 2: DB Runtime Kill Switch turned OFF -> Same process request blocked immediately", async () => {
    vi.spyOn(prisma.systemSetting, "findUnique").mockResolvedValue({
      id: "setting-1",
      singletonKey: "DEFAULT_SETTINGS",
      aiReadOnlyEnabled: false,
      updatedAt: new Date(),
    } as any);

    const guard = await evaluateAIGuards(testUserId);
    expect(guard.allowed).toBe(false);
    expect(guard.code).toBe("FEATURE_DISABLED");
    expect(guard.message).toContain("Quản trị viên hệ thống");
  });

  it("3. State 3: DB Runtime Kill Switch turned back ON -> Request succeeds again on same process", async () => {
    vi.spyOn(prisma.systemSetting, "findUnique").mockResolvedValue({
      id: "setting-1",
      singletonKey: "DEFAULT_SETTINGS",
      aiReadOnlyEnabled: true,
      updatedAt: new Date(),
    } as any);

    const guard = await evaluateAIGuards(testUserId);
    expect(guard.allowed).toBe(true);
  });

  it("4. State 4: Hard ENV Disable (AI_READ_ONLY_ENABLED=false) ALWAYS WINS over DB=true", async () => {
    process.env.AI_READ_ONLY_ENABLED = "false";

    vi.spyOn(prisma.systemSetting, "findUnique").mockResolvedValue({
      id: "setting-1",
      singletonKey: "DEFAULT_SETTINGS",
      aiReadOnlyEnabled: true,
      updatedAt: new Date(),
    } as any);

    const guard = await evaluateAIGuards(testUserId);
    expect(guard.allowed).toBe(false);
    expect(guard.code).toBe("FEATURE_DISABLED");
    expect(guard.message).toContain("cấu hình môi trường");
  });

  it("5. Pilot Cohort Server-Side Gate: Allows enrolled user and blocks non-enrolled same-role user", () => {
    // Enrolled Active Admin
    const enrolledAdmin = {
      id: "cmroatu6r0000mowklk61sv56",
      email: "daicongtu2910@gmail.com",
      role: "ADMIN" as const,
    };
    expect(isUserInPilotCohort(enrolledAdmin)).toBe(true);

    // Enrolled Active Commander
    const enrolledCommander = {
      id: "cmsraldrt00149ck5366am56m",
      username: "NV-2026-0002",
      role: "CHIEF_COMMANDER" as const,
    };
    expect(isUserInPilotCohort(enrolledCommander)).toBe(true);

    // Non-enrolled Commander with same role (e.g. NV-2026-0005)
    const nonEnrolledCommander = {
      id: "cmsraledh001i9ck58hpkcgrz",
      username: "NV-2026-0005",
      role: "CHIEF_COMMANDER" as const,
    };
    expect(isUserInPilotCohort(nonEnrolledCommander)).toBe(false);

    // Inactive / Soft-deleted Admin (daicongty2910@gmail.com)
    const inactiveAdmin = {
      id: "cmsczcskg00009ck57x7moaxt",
      email: "daicongty2910@gmail.com",
      role: "ADMIN" as const,
    };
    expect(isUserInPilotCohort(inactiveAdmin)).toBe(false);
  });
});
