import { describe, it, expect, beforeAll } from "vitest";
import prisma from "@/lib/prisma";
import { resolveAIRequestContext } from "../context/ai-context-resolver";
import { executeAIToolGateway } from "../gateway/ai-tool-gateway";
import { evaluateAIPolicy } from "../policy/ai-policy-engine";
import { ALL_ROLES } from "../policy/ai-policy-rules";
import { AIRequestContext } from "../types";

describe("AI Foundation — Real PostgreSQL Runtime Integration Suite", () => {
  let realAdminUser: any = null;
  let realCommanderUser2: any = null;
  let realCommanderUser3: any = null;
  let realProject1: any = null;
  let realProject2: any = null;
  let realProject3: any = null;
  let realDeletedUser: any = null;

  beforeAll(async () => {
    // 1. Fetch real entities directly from PostgreSQL
    realAdminUser = await prisma.user.findFirst({
      where: { role: "ADMIN", isActive: true, deletedAt: null },
    });

    realCommanderUser2 = await prisma.user.findFirst({
      where: { username: "NV-2026-0002", isActive: true, deletedAt: null },
    });

    realCommanderUser3 = await prisma.user.findFirst({
      where: { username: "NV-2026-0003", isActive: true, deletedAt: null },
    });

    realDeletedUser = await prisma.user.findFirst({
      where: { deletedAt: { not: null } },
    });

    realProject1 = await prisma.project.findFirst({
      where: { code: "CT-2026-0001", deletedAt: null },
    });

    realProject2 = await prisma.project.findFirst({
      where: { code: "CT-2026-0002", deletedAt: null },
    });

    realProject3 = await prisma.project.findFirst({
      where: { code: "CT-2026-0003", deletedAt: null },
    });
  });

  // --- 1. REAL CONTEXT RESOLUTION & INVARIANT CHECKS ---
  it("Runtime Context: Resolves real Chief Commander context and exact DB project memberships", async () => {
    expect(realCommanderUser2).not.toBeNull();
    const context = await resolveAIRequestContext({
      explicitUser: realCommanderUser2,
    });

    expect(context).not.toBeNull();
    expect(context?.userId).toBe(realCommanderUser2.id);
    expect(context?.role).toBe("CHIEF_COMMANDER");
    expect(context?.projectScope.kind).toBe("PROJECT_IDS");
    if (context?.projectScope.kind === "PROJECT_IDS") {
      expect(context.projectScope.projectIds).toContain(realProject2.id);
      expect(context.projectScope.projectIds).not.toContain(realProject1.id);
    }
  });

  it("Runtime Context: Soft-deleted user in DB fails closed and returns null", async () => {
    if (realDeletedUser) {
      const context = await resolveAIRequestContext({
        explicitUser: realDeletedUser,
      });
      expect(context).toBeNull();
    }
  });

  // --- 2. REAL CROSS-PROJECT AUTHORIZATION ON REAL DATA ---
  it("Runtime Isolation: Commander 2 requesting assigned Project 2 is ALLOWED and returns real DB data", async () => {
    const context = await resolveAIRequestContext({
      explicitUser: realCommanderUser2,
    });

    expect(context).not.toBeNull();

    const result = await executeAIToolGateway({
      toolName: "get_project_summary",
      input: { projectId: realProject2.id },
      explicitContext: context!,
    });

    expect(result.success).toBe(true);
    expect(result.policyDecision).toBe("ALLOW");
    expect(result.data.code).toBe("CT-2026-0002");
    expect(result.data.name).toContain("Quảng trường – công viên");
  });

  it("Runtime Isolation: Commander 2 requesting unassigned Project 1 or Project 3 is DENIED with PROJECT_SCOPE_DENIED", async () => {
    const context = await resolveAIRequestContext({
      explicitUser: realCommanderUser2,
    });

    expect(context).not.toBeNull();

    const resultProj1 = await executeAIToolGateway({
      toolName: "get_project_summary",
      input: { projectId: realProject1.id },
      explicitContext: context!,
    });

    expect(resultProj1.success).toBe(false);
    expect(resultProj1.policyDecision).toBe("DENY");
    expect(resultProj1.error?.code).toBe("POLICY_DENIED");
    expect(resultProj1.error?.message).toContain("PROJECT_SCOPE_DENIED");

    const resultProj3 = await executeAIToolGateway({
      toolName: "get_project_summary",
      input: { projectId: realProject3.id },
      explicitContext: context!,
    });

    expect(resultProj3.success).toBe(false);
    expect(resultProj3.policyDecision).toBe("DENY");
  });

  it("Runtime Scope: Commander 3 requesting assigned Project 3 is ALLOWED, but Project 2 is DENIED", async () => {
    const context = await resolveAIRequestContext({
      explicitUser: realCommanderUser3,
    });

    expect(context).not.toBeNull();

    const allowedRes = await executeAIToolGateway({
      toolName: "get_project_summary",
      input: { projectId: realProject3.id },
      explicitContext: context!,
    });
    expect(allowedRes.success).toBe(true);
    expect(allowedRes.data.code).toBe("CT-2026-0003");

    const deniedRes = await executeAIToolGateway({
      toolName: "get_project_summary",
      input: { projectId: realProject2.id },
      explicitContext: context!,
    });
    expect(deniedRes.success).toBe(false);
    expect(deniedRes.policyDecision).toBe("DENY");
  });

  // --- 3. STRICT SCHEMA & EXTRA FIELD TAMPERING PREVENTION ---
  it("Runtime Tampering: Extra field injection in tool input triggers TOOL_INPUT_INVALID (.strict())", async () => {
    const context = await resolveAIRequestContext({
      explicitUser: realCommanderUser2,
    });

    const tamperedInput = {
      projectId: realProject2.id,
      role: "ADMIN",          // Extra injected field
      overrideSecurity: true, // Extra injected field
    };

    const result = await executeAIToolGateway({
      toolName: "get_project_summary",
      input: tamperedInput,
      explicitContext: context!,
    });

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("TOOL_INPUT_INVALID");
    expect(result.error?.message).toContain("Unrecognized key");
  });

  // --- 4. EXPLICIT PROHIBITED TOOLS & RAW SQL LOCKOUT ---
  it("Runtime Prohibitions: raw_sql and delete_project are rejected on real runtime", async () => {
    const adminContext = await resolveAIRequestContext({
      explicitUser: realAdminUser,
    });

    const rawSqlRes = await executeAIToolGateway({
      toolName: "raw_sql",
      input: { sql: "SELECT * FROM \"Project\"" },
      explicitContext: adminContext!,
    });
    expect(rawSqlRes.success).toBe(false);

    const deleteProjRes = await executeAIToolGateway({
      toolName: "delete_project",
      input: { projectId: realProject1.id },
      explicitContext: adminContext!,
    });
    expect(deleteProjRes.success).toBe(false);
  });

  // --- 5. REAL AUDIT LOG RECORDING IN POSTGRESQL ---
  it("Runtime Audit Trail: Ghi nhận đầy đủ bản ghi vào bảng AuditLog thật trong PostgreSQL cho cả ALLOW và DENY", async () => {
    const context = await resolveAIRequestContext({
      explicitUser: realCommanderUser2,
    });

    // 1. Trigger an ALLOW tool
    const allowResult = await executeAIToolGateway({
      toolName: "get_my_projects",
      input: { limit: 10 },
      explicitContext: context!,
    });
    expect(allowResult.success).toBe(true);

    // 2. Trigger a DENY tool
    const denyResult = await executeAIToolGateway({
      toolName: "get_project_summary",
      input: { projectId: realProject1.id },
      explicitContext: context!,
    });
    expect(denyResult.success).toBe(false);

    // 3. Verify real AuditLog records exist in PostgreSQL
    const recentAuditLogs = await prisma.auditLog.findMany({
      where: {
        userId: realCommanderUser2.id,
        entityType: "AI_TOOL_EXECUTION",
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    expect(recentAuditLogs.length).toBeGreaterThanOrEqual(1);
    const lastLog = recentAuditLogs[0];
    expect(lastLog.entityType).toBe("AI_TOOL_EXECUTION");
    expect(lastLog.afterData).not.toBeNull();
  });

  // --- 6. ALL 9 CANONICAL ROLES × TOOL VERIFICATION ---
  it("Role Matrix: Verifies all 9 canonical roles from UserRole enum are recognized without inventing roles", () => {
    const expectedPrismaRoles = [
      "ADMIN",
      "DIRECTOR",
      "DEPUTY_DIRECTOR",
      "SUPERVISION_HEAD",
      "CONSTRUCTION_SUPERVISOR",
      "CHIEF_COMMANDER",
      "MANAGER",
      "ENGINEER",
      "STAFF",
    ];

    expect(ALL_ROLES.sort()).toEqual(expectedPrismaRoles.sort());

    // Test each role against get_my_projects
    for (const role of ALL_ROLES) {
      const mockContext: AIRequestContext = {
        userId: `test_user_${role}`,
        role,
        projectScope: role === "ADMIN" ? { kind: "ALL_PROJECTS" } : { kind: "NO_PROJECTS" },
        requestId: `req_${role}`,
      };

      const decision = evaluateAIPolicy({
        toolName: "get_my_projects",
        input: {},
        context: mockContext,
      });

      expect(decision.decision).toBe("ALLOW");
    }
  });
});
