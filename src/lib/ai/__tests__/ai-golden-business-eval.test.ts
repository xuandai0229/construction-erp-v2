import { afterAll, beforeAll, describe, expect, it } from "vitest";
import prisma from "@/lib/prisma";
import { executeAIChatTurn, AIChatTurnOutput } from "../controller/ai-chat-controller";
import { clearAIAuditRecords, getAIAuditRecords } from "../audit/ai-audit-logger";
import { clearAIConversationStore } from "../conversation/ai-conversation-store";
import { GOLDEN_BUSINESS_CASES, GoldenBusinessCase } from "../evals/golden-business-cases";

type EvalVerdict = "PASS" | "PARTIAL" | "FAIL";

function classify(
  testCase: GoldenBusinessCase,
  output: AIChatTurnOutput,
  usedTools: string[],
): { verdict: EvalVerdict; reason: string } {
  if (output.toolCallsExecuted > 5) return { verdict: "FAIL", reason: "hard tool cap exceeded" };
  if (testCase.expectedError) {
    return output.error?.code === testCase.expectedError
      ? { verdict: "PASS", reason: `explicit ${testCase.expectedError}` }
      : { verdict: "FAIL", reason: `expected ${testCase.expectedError}, got ${output.error?.code || "success"}` };
  }
  if (testCase.expectedBehavior === "CLARIFY") {
    return ["PROJECT_REQUIRED", "PROJECT_AMBIGUOUS"].includes(output.error?.code || "")
      ? { verdict: "PASS", reason: "explicit clarification" }
      : { verdict: "FAIL", reason: "clarification missing" };
  }
  if (!output.success) return { verdict: "FAIL", reason: output.error?.code || "request failed" };

  const missingTools = testCase.expectedTools.filter((tool) => !usedTools.includes(tool));
  if (missingTools.length > 0) return { verdict: "FAIL", reason: `missing tools: ${missingTools.join(",")}` };
  if (testCase.expectedEntity && !output.content.includes(testCase.expectedEntity) && output.contextSnapshot?.activeProjectCode !== testCase.expectedEntity) {
    return { verdict: "FAIL", reason: `wrong/missing entity ${testCase.expectedEntity}` };
  }
  if (testCase.expectedEvidence === "SOURCE" && output.sources.length === 0) {
    return { verdict: "FAIL", reason: "missing source object" };
  }
  if (testCase.expectedEvidence === "COVERAGE" && !output.coverageSummary && output.qualityFlags.length === 0) {
    return { verdict: "FAIL", reason: "missing no-data/coverage evidence" };
  }
  if (testCase.expectedBehavior === "BRIEFING") {
    if (output.toolCallsExecuted < 2 || !output.content.includes("Ba kiểm tra ưu tiên tiếp theo")) {
      return { verdict: "FAIL", reason: "briefing structure/orchestration missing" };
    }
  }
  if (testCase.expectedBehavior === "COMPARE" && output.toolCallsExecuted < 2) {
    return { verdict: "FAIL", reason: "comparison did not use bounded multi-tool" };
  }

  const hasDataGap = output.qualityFlags.some((flag) => /^(NO_|MISSING_|UNAVAILABLE_)/.test(flag));
  if (testCase.businessDataRequired && hasDataGap) {
    return { verdict: "PARTIAL", reason: "architecture passed; BLOCKED_BY_DATA_READINESS" };
  }
  return { verdict: "PASS", reason: "expected behavior/evidence observed" };
}

describe.sequential("AI-01 Golden Business Eval — exact audit 30", () => {
  const originalMode = process.env.AI_PROVIDER_MODE;

  beforeAll(() => {
    process.env.AI_PROVIDER_MODE = "DEVELOPMENT_MOCK";
    clearAIAuditRecords();
    clearAIConversationStore();
  });

  afterAll(() => {
    process.env.AI_PROVIDER_MODE = originalMode;
  });

  it("re-runs all 30 prompts against the real UAT database without claiming remote provider quality", async () => {
    const admin = await prisma.user.findFirstOrThrow({
      where: { role: "ADMIN", isActive: true, deletedAt: null },
      select: { id: true, username: true, name: true, role: true, email: true, isActive: true, phone: true },
    });
    const activeProject = await prisma.project.findUniqueOrThrow({
      where: { code: "CT-2026-0009" },
      select: { id: true, code: true },
    });

    let followUpConversation: string | undefined;
    let provenanceConversation: string | undefined;
    const ledger: Array<{
      id: number;
      verdict: EvalVerdict;
      reason: string;
      error?: string;
      tools: string[];
      toolCalls: number;
      sources: number;
      qualityFlags: string[];
    }> = [];
    const outputs = new Map<number, AIChatTurnOutput>();

    for (const testCase of GOLDEN_BUSINESS_CASES) {
      const conversationId = testCase.id >= 4 && testCase.id <= 8
        ? followUpConversation
        : testCase.id >= 20 && testCase.id <= 21
          ? provenanceConversation
          : undefined;
      const output = await executeAIChatTurn({
        messages: [{ role: "user", content: testCase.prompt }],
        conversationId,
        activeProjectId: testCase.screenContext === "ACTIVE_CT_2026_0009" ? activeProject.id : undefined,
        uiContext: testCase.screenContext === "ACTIVE_CT_2026_0009"
          ? { route: `/projects/${activeProject.id}`, recordType: "PROJECT", recordId: activeProject.id }
          : { route: "/dashboard" },
        contextOptions: { explicitUser: admin },
        preferredProvider: "mock",
      });
      if (testCase.id >= 4 && testCase.id <= 8) followUpConversation = output.conversationId;
      if (testCase.id >= 20 && testCase.id <= 21) provenanceConversation = output.conversationId;
      outputs.set(testCase.id, output);
      const usedTools = [...new Set(
        getAIAuditRecords()
          .filter((record) => record.aiRunId === output.traceId && record.eventType === "TOOL_EXECUTION")
          .map((record) => record.toolName),
      )];
      const classification = classify(testCase, output, usedTools);
      ledger.push({
        id: testCase.id,
        verdict: classification.verdict,
        reason: classification.reason,
        error: output.error?.code,
        tools: usedTools,
        toolCalls: output.toolCallsExecuted,
        sources: output.sources.length,
        qualityFlags: output.qualityFlags,
      });
    }

    const summary = ledger.reduce((counts, row) => ({ ...counts, [row.verdict]: counts[row.verdict] + 1 }), { PASS: 0, PARTIAL: 0, FAIL: 0 });
    console.log("AI01_GOLDEN_30_LEDGER", JSON.stringify({ summary, ledger }));

    expect(GOLDEN_BUSINESS_CASES).toHaveLength(30);
    expect(ledger).toHaveLength(30);
    expect(ledger.every((row) => row.toolCalls <= 5)).toBe(true);
    expect(outputs.get(14)?.error?.code).toBe("PROJECT_NOT_FOUND");
    expect(outputs.get(14)?.content).not.toContain("CT-2026-0002");
    expect(outputs.get(19)?.contextSnapshot?.activeProjectCode).toBe("CT-2026-0009");
    expect(outputs.get(19)?.content).not.toContain("CT-2026-0002");
    expect(outputs.get(27)?.error?.code).toBe("SECURITY_REFUSAL");
    expect(outputs.get(28)?.error?.code).toBe("SECURITY_REFUSAL");
    expect([...outputs.values()].every((output) => output.providerStatus.mock && !output.providerStatus.remote)).toBe(true);
  }, 120_000);
});
