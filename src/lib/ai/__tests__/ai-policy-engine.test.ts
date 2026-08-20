import { describe, it, expect } from "vitest";
import { evaluateAIPolicy } from "../policy/ai-policy-engine";
import { AIRequestContext } from "../types";

describe("AI Policy Engine — Fail-Closed & RBAC Enforcement", () => {
  const adminContext: AIRequestContext = {
    userId: "admin_1",
    role: "ADMIN",
    projectScope: { kind: "ALL_PROJECTS" },
    requestId: "req_admin",
  };

  const commanderContextProjectA: AIRequestContext = {
    userId: "commander_1",
    role: "CHIEF_COMMANDER",
    projectScope: { kind: "PROJECT_IDS", projectIds: ["project_A"] },
    allowedProjectIds: ["project_A"],
    requestId: "req_commander",
  };

  const staffContextNoProjects: AIRequestContext = {
    userId: "staff_1",
    role: "STAFF",
    projectScope: { kind: "NO_PROJECTS" },
    allowedProjectIds: [],
    requestId: "req_staff",
  };

  // 1. Identity / Unauthenticated Tests
  it("should DENY any tool execution when context is null", () => {
    const res = evaluateAIPolicy({
      toolName: "get_my_projects",
      input: {},
      context: null,
    });
    expect(res.decision).toBe("DENY");
    expect(res.reason).toContain("UNAUTHENTICATED");
  });

  // 2. Tool Registration Tests
  it("should DENY unknown / unregistered tools", () => {
    const res = evaluateAIPolicy({
      toolName: "unknown_hack_tool",
      input: {},
      context: adminContext,
    });
    expect(res.decision).toBe("DENY");
    expect(res.reason).toContain("TOOL_NOT_REGISTERED");
  });

  // 3. Explicit Forbidden Tools
  it("should DENY raw_sql tool even if requested by ADMIN", () => {
    const res = evaluateAIPolicy({
      toolName: "raw_sql",
      input: { query: "SELECT * FROM User" },
      context: adminContext,
    });
    expect(res.decision).toBe("DENY");
    expect(res.reason).toContain("TOOL_FORBIDDEN");
  });

  it("should DENY delete_project tool even if requested by ADMIN", () => {
    const res = evaluateAIPolicy({
      toolName: "delete_project",
      input: { projectId: "project_A" },
      context: adminContext,
    });
    expect(res.decision).toBe("DENY");
    expect(res.reason).toContain("TOOL_FORBIDDEN");
  });

  it("should DENY update_user_role tool", () => {
    const res = evaluateAIPolicy({
      toolName: "update_user_role",
      input: { targetUserId: "staff_1", role: "ADMIN" },
      context: adminContext,
    });
    expect(res.decision).toBe("DENY");
    expect(res.reason).toContain("TOOL_FORBIDDEN");
  });

  // 4. Project Scope Tests (Positive & Negative)
  it("should ALLOW get_project_summary for Commander on assigned Project A", () => {
    const res = evaluateAIPolicy({
      toolName: "get_project_summary",
      input: { projectId: "project_A" },
      context: commanderContextProjectA,
      targetProjectId: "project_A",
    });
    expect(res.decision).toBe("ALLOW");
  });

  it("should DENY get_project_summary for Commander on unassigned Project B", () => {
    const res = evaluateAIPolicy({
      toolName: "get_project_summary",
      input: { projectId: "project_B" },
      context: commanderContextProjectA,
      targetProjectId: "project_B",
    });
    expect(res.decision).toBe("DENY");
    expect(res.reason).toContain("PROJECT_SCOPE_DENIED");
  });

  it("should DENY get_project_summary when projectId is missing for project-scoped tools", () => {
    const res = evaluateAIPolicy({
      toolName: "get_project_summary",
      input: {},
      context: commanderContextProjectA,
    });
    expect(res.decision).toBe("DENY");
    expect(res.reason).toContain("PROJECT_ID_REQUIRED");
  });

  // 5. Cross-Project Resource Ownership Guard
  it("should DENY tool execution if queried resource belongs to an unauthorized project", () => {
    const res = evaluateAIPolicy({
      toolName: "get_latest_field_reports",
      input: { projectId: "project_A" },
      context: commanderContextProjectA,
      targetProjectId: "project_A",
      resourceOwnerProjectId: "project_B", // Resource actually belongs to B
    });
    expect(res.decision).toBe("DENY");
    expect(res.reason).toContain("CROSS_PROJECT_RESOURCE_DENIED");
  });

  // 6. Role Hierarchy & Unauthorized Role Negative Tests
  it("should DENY get_latest_field_reports for Staff with NO_PROJECTS when attempting to access Project A", () => {
    const res = evaluateAIPolicy({
      toolName: "get_latest_field_reports",
      input: { projectId: "project_A" },
      context: staffContextNoProjects,
      targetProjectId: "project_A",
    });
    expect(res.decision).toBe("DENY");
    expect(res.reason).toContain("PROJECT_SCOPE_DENIED");
  });
});
