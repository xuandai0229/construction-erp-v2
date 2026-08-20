import { describe, it, expect, vi, beforeEach } from "vitest";
import { executeAIToolGateway } from "../gateway/ai-tool-gateway";
import { AIRequestContext } from "../types";
import { getAIAuditRecords, clearAIAuditRecords } from "../audit/ai-audit-logger";
import prisma from "@/lib/prisma";

describe("AI Tool Gateway — Security Boundary & Execution Orchestration", () => {
  const mockAdminContext: AIRequestContext = {
    userId: "admin_test",
    role: "ADMIN",
    projectScope: { kind: "ALL_PROJECTS" },
    requestId: "req_gate_admin",
  };

  const mockCommanderContext: AIRequestContext = {
    userId: "commander_test",
    role: "CHIEF_COMMANDER",
    projectScope: { kind: "PROJECT_IDS", projectIds: ["project_123"] },
    allowedProjectIds: ["project_123"],
    requestId: "req_gate_commander",
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    clearAIAuditRecords();
  });

  it("should fail closed and reject execution with TOOL_NOT_REGISTERED for unknown tool", async () => {
    const result = await executeAIToolGateway({
      toolName: "non_existent_tool",
      input: {},
      explicitContext: mockAdminContext,
    });

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("TOOL_NOT_REGISTERED");

    const auditLogs = getAIAuditRecords();
    expect(auditLogs.length).toBe(1);
    expect(auditLogs[0].executionStatus).toBe("REJECTED");
    expect(auditLogs[0].errorCode).toBe("TOOL_NOT_REGISTERED");
  });

  it("should reject execution with TOOL_INPUT_INVALID when input violates Zod schema", async () => {
    const result = await executeAIToolGateway({
      toolName: "get_latest_field_reports",
      input: {
        projectId: "", // Invalid empty projectId
        limit: 9999,   // Exceeds max 50
      },
      explicitContext: mockCommanderContext,
    });

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("TOOL_INPUT_INVALID");

    const auditLogs = getAIAuditRecords();
    expect(auditLogs.length).toBe(1);
    expect(auditLogs[0].errorCode).toBe("TOOL_INPUT_INVALID");
  });

  it("should successfully execute get_my_projects and sanitize output data", async () => {
    vi.spyOn(prisma.project, "findMany").mockResolvedValueOnce([
      {
        id: "project_123",
        code: "CT-2026-0001",
        name: "Dự án Test 1",
        displayName: "Dự án Test 1 Display",
        status: "ACTIVE",
        address: "Hà Nội",
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-12-31"),
        _count: { members: 5 },
      },
    ] as any);

    const result = await executeAIToolGateway({
      toolName: "get_my_projects",
      input: { limit: 10 },
      explicitContext: mockCommanderContext,
    });

    expect(result.success).toBe(true);
    expect(result.policyDecision).toBe("ALLOW");
    expect(Array.isArray(result.data)).toBe(true);
    expect(result.data.length).toBe(1);
    expect(result.data[0].code).toBe("CT-2026-0001");

    const auditLogs = getAIAuditRecords();
    expect(auditLogs.length).toBe(1);
    expect(auditLogs[0].executionStatus).toBe("SUCCESS");
    expect(auditLogs[0].policyDecision).toBe("ALLOW");
  });

  it("should execute get_project_summary for allowed project", async () => {
    vi.spyOn(prisma.project, "findFirst").mockResolvedValueOnce({
      id: "project_123",
      code: "CT-2026-0001",
      name: "Dự án A",
      displayName: null,
      status: "ACTIVE",
      address: "Hà Nội",
      startDate: new Date("2026-01-01"),
      endDate: null,
      contractValue: "5000000000",
      _count: {
        members: 4,
        siteReports: 12,
        documents: 8,
        materialItems: 25,
      },
    } as any);

    const result = await executeAIToolGateway({
      toolName: "get_project_summary",
      input: { projectId: "project_123" },
      explicitContext: mockCommanderContext,
    });

    expect(result.success).toBe(true);
    expect(result.data.id).toBe("project_123");
    expect(result.data.stats.siteReportsCount).toBe(12);
  });

  it("should block get_project_summary for unallowed project with POLICY_DENIED", async () => {
    const result = await executeAIToolGateway({
      toolName: "get_project_summary",
      input: { projectId: "project_UNAUTHORIZED_999" },
      explicitContext: mockCommanderContext,
    });

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("POLICY_DENIED");

    const auditLogs = getAIAuditRecords();
    expect(auditLogs.length).toBe(1);
    expect(auditLogs[0].executionStatus).toBe("REJECTED");
    expect(auditLogs[0].policyDecision).toBe("DENY");
  });

  it("should strip sensitive credentials and tokens from output", async () => {
    vi.spyOn(prisma.project, "findMany").mockResolvedValueOnce([
      {
        id: "proj_1",
        code: "CT-1",
        name: "P1",
        displayName: null,
        status: "ACTIVE",
        address: "HN",
        startDate: null,
        endDate: null,
        passwordHash: "SECRET_HASH_SHOULD_BE_STRIPPED",
        sessionToken: "SECRET_TOKEN_SHOULD_BE_STRIPPED",
        _count: { members: 1 },
      },
    ] as any);

    const result = await executeAIToolGateway({
      toolName: "get_my_projects",
      input: {},
      explicitContext: mockAdminContext,
    });

    expect(result.success).toBe(true);
    const item = result.data[0];
    expect(item.passwordHash).toBeUndefined();
    expect(item.sessionToken).toBeUndefined();
  });
});
