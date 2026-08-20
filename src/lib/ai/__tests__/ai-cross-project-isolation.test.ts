import { describe, it, expect, vi, beforeEach } from "vitest";
import { executeAIToolGateway } from "../gateway/ai-tool-gateway";
import { evaluateAIPolicy } from "../policy/ai-policy-engine";
import { AIRequestContext } from "../types";

describe("AI Cross-Project Security & Multi-Tenant Isolation", () => {
  const userAContext: AIRequestContext = {
    userId: "user_A",
    role: "CHIEF_COMMANDER",
    projectScope: { kind: "PROJECT_IDS", projectIds: ["project_A"] },
    allowedProjectIds: ["project_A"],
    requestId: "req_user_a",
  };

  const userBContext: AIRequestContext = {
    userId: "user_B",
    role: "CHIEF_COMMANDER",
    projectScope: { kind: "PROJECT_IDS", projectIds: ["project_B"] },
    allowedProjectIds: ["project_B"],
    requestId: "req_user_b",
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("User A can access Project A via Tool Gateway", async () => {
    const policyResult = evaluateAIPolicy({
      toolName: "get_project_summary",
      input: { projectId: "project_A" },
      context: userAContext,
      targetProjectId: "project_A",
    });

    expect(policyResult.decision).toBe("ALLOW");
  });

  it("User A is DENIED when attempting to access Project B via Tool Gateway", async () => {
    const result = await executeAIToolGateway({
      toolName: "get_project_summary",
      input: { projectId: "project_B" },
      explicitContext: userAContext,
    });

    expect(result.success).toBe(false);
    expect(result.policyDecision).toBe("DENY");
    expect(result.error?.code).toBe("POLICY_DENIED");
    expect(result.error?.message).toContain("PROJECT_SCOPE_DENIED");
  });

  it("User B can access Project B but is DENIED on Project A", async () => {
    const allowedResult = evaluateAIPolicy({
      toolName: "get_project_summary",
      input: { projectId: "project_B" },
      context: userBContext,
      targetProjectId: "project_B",
    });
    expect(allowedResult.decision).toBe("ALLOW");

    const deniedResult = await executeAIToolGateway({
      toolName: "get_project_summary",
      input: { projectId: "project_A" },
      explicitContext: userBContext,
    });
    expect(deniedResult.success).toBe(false);
    expect(deniedResult.policyDecision).toBe("DENY");
  });

  it("Cross-Project Resource Injection: User A sending reportId belonging to Project B is DENIED", () => {
    const policyResult = evaluateAIPolicy({
      toolName: "get_latest_field_reports",
      input: { projectId: "project_A", reportId: "report_from_project_B" },
      context: userAContext,
      targetProjectId: "project_A",
      resourceOwnerProjectId: "project_B",
    });

    expect(policyResult.decision).toBe("DENY");
    expect(policyResult.reason).toContain("CROSS_PROJECT_RESOURCE_DENIED");
  });

  it("Anti-Enumeration Safety: Non-existent projects and unauthorized projects return consistent DENY structure", async () => {
    const resultFake = await executeAIToolGateway({
      toolName: "get_project_summary",
      input: { projectId: "non_existent_project_999" },
      explicitContext: userAContext,
    });

    const resultOtherReal = await executeAIToolGateway({
      toolName: "get_project_summary",
      input: { projectId: "project_B" },
      explicitContext: userAContext,
    });

    // Both should return identical error code and policy decision, preventing attacker from discovering valid project IDs
    expect(resultFake.policyDecision).toBe("DENY");
    expect(resultOtherReal.policyDecision).toBe("DENY");
    expect(resultFake.error?.code).toBe("POLICY_DENIED");
    expect(resultOtherReal.error?.code).toBe("POLICY_DENIED");
  });
});
