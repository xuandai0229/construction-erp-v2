import { describe, it, expect, beforeEach } from "vitest";
import { logAIAuditEvent, getAIAuditRecords, clearAIAuditRecords } from "../audit/ai-audit-logger";
import { isUserInPilotCohort } from "../pilot/ai-pilot-cohort";
import { AIFailureCategory, AIUserFeedbackType } from "../audit/ai-audit-types";

describe("Phase 1C — Controlled Internal Pilot Operations & Telemetry Test Suite", () => {
  beforeEach(() => {
    clearAIAuditRecords();
  });

  it("1. Logs sanitized telemetry with token tracking and cost calculation", async () => {
    const promptTokens = 450;
    const completionTokens = 120;
    // gpt-4o-mini pricing: $0.15 / 1M prompt, $0.60 / 1M completion
    const costUsd = (promptTokens * 0.15) / 1_000_000 + (completionTokens * 0.60) / 1_000_000;

    const record = await logAIAuditEvent({
      eventType: "TOOL_EXECUTION",
      requestId: "req-pilot-001",
      userId: "cmroatu6r0000mowklk61sv56",
      role: "ADMIN",
      projectId: "CT-2026-0002",
      toolName: "get_project_summary",
      toolVersion: "1.0.0",
      operation: "READ",
      riskLevel: "READ_SAFE",
      policyDecision: "ALLOW",
      confirmationRequired: false,
      rawInput: { projectId: "CT-2026-0002", password: "secret_pass_123" },
      outputSummary: "Project summary retrieved successfully",
      executionStatus: "SUCCESS",
      durationMs: 24,
      modelProvider: "openai",
      modelName: "gpt-4o-mini",
      promptTokens,
      completionTokens,
      estimatedCostUsd: costUsd,
    });

    expect(record.id).toBeDefined();
    expect(record.inputSanitized.projectId).toBe("CT-2026-0002");
    expect(record.inputSanitized.password).toBe("[REDACTED]"); // PII Sanitized
    expect(record.inputSanitized.password).not.toBe("secret_pass_123");
    expect(record.estimatedCostUsd).toBeCloseTo(0.0001395, 6);
    expect(record.executionStatus).toBe("SUCCESS");
  });

  it("2. Records explicit Failure Taxonomy categories without grouping everything into generic AI_ERROR", async () => {
    const failureCategories: AIFailureCategory[] = [
      "MODEL_SELECTION_ERROR",
      "TOOL_SELECTION_ERROR",
      "TOOL_ARGUMENT_ERROR",
      "PROJECT_RESOLUTION_ERROR",
      "POLICY_DENIAL",
      "PROVIDER_TIMEOUT",
      "PROVIDER_RATE_LIMIT",
      "GROUNDING_ERROR",
      "UI_ERROR",
    ];

    for (const category of failureCategories) {
      const rec = await logAIAuditEvent({
        eventType: "TOOL_EXECUTION",
        requestId: `req-${category}`,
        userId: "cmsraldrt00149ck5366am56m",
        role: "CHIEF_COMMANDER",
        toolName: "get_latest_field_reports",
        toolVersion: "1.0.0",
        operation: "READ",
        riskLevel: "READ_SAFE",
        policyDecision: "DENY",
        confirmationRequired: false,
        rawInput: {},
        executionStatus: "FAILED",
        failureCategory: category,
        errorCode: category,
        durationMs: 15,
      });

      expect(rec.failureCategory).toBe(category);
    }

    expect(getAIAuditRecords().length).toBe(failureCategories.length);
  });

  it("3. Records structured User Feedback for continuous operational quality assessment", async () => {
    const feedbackTypes: AIUserFeedbackType[] = [
      "HELPFUL",
      "UNHELPFUL",
      "WRONG_DATA",
      "MISSING_DATA",
      "INCORRECT_PERMISSION",
      "OTHER",
    ];

    for (const fbType of feedbackTypes) {
      const record = await logAIAuditEvent({
        eventType: "USER_FEEDBACK",
        requestId: `req-feedback-${fbType}`,
        userId: "cmsraldzc00189ck5o32c3npg",
        role: "CHIEF_COMMANDER",
        toolName: "get_pending_items",
        toolVersion: "1.0.0",
        operation: "READ",
        riskLevel: "READ_SAFE",
        policyDecision: "ALLOW",
        confirmationRequired: false,
        rawInput: {},
        executionStatus: "SUCCESS",
        durationMs: 5,
        userFeedback: {
          type: fbType,
          comment: `Testing user feedback: ${fbType}`,
          submittedAt: new Date().toISOString(),
        },
      });

      expect(record.userFeedback?.type).toBe(fbType);
      expect(record.eventType).toBe("USER_FEEDBACK");
    }
  });

  it("4. Verifies strictly enforced Pilot Cohort boundaries (Non-pilot denied pre-execution)", () => {
    const nonPilotCommander = {
      id: "cmsraledh001i9ck58hpkcgrz", // NV-2026-0005
      username: "NV-2026-0005",
      role: "CHIEF_COMMANDER" as const,
    };

    expect(isUserInPilotCohort(nonPilotCommander)).toBe(false);
  });
});
