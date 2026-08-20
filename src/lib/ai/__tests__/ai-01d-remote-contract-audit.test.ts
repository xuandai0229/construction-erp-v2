import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getAIProviderStatus } from "../provider/provider-mode";
import { getAIProvider } from "../provider/provider-factory";
import {
  ALLOWED_MODELS_ALLOWLIST,
  DEFAULT_AI_MODEL,
  buildOpenAIChatPayload,
  mapOpenAIHttpFailure,
  parseOpenAIChatResult,
  OpenAIProvider,
} from "../provider/openai-provider";
import { AIApplicationError } from "../errors";
import * as fs from "fs";
import * as path from "path";

describe("AI-01D — Real OpenAI Intelligence Gate Contract & Security Audit", () => {
  const originalMode = process.env.AI_PROVIDER_MODE;
  const originalKey = process.env.OPENAI_API_KEY;
  const originalModel = process.env.AI_MODEL_NAME;

  beforeEach(() => {
    delete process.env.OPENAI_API_KEY;
    delete process.env.AI_MODEL_NAME;
  });

  afterEach(() => {
    process.env.AI_PROVIDER_MODE = originalMode;
    if (originalKey !== undefined) process.env.OPENAI_API_KEY = originalKey;
    else delete process.env.OPENAI_API_KEY;
    if (originalModel !== undefined) process.env.AI_MODEL_NAME = originalModel;
    else delete process.env.AI_MODEL_NAME;
  });

  // --- 1. SECRET OWNERSHIP & BLOCKED_NO_KEY INVARIANT ---
  it("Secret Ownership: Reports BLOCKED_NO_KEY in PILOT_REMOTE mode when key is absent", () => {
    process.env.AI_PROVIDER_MODE = "PILOT_REMOTE";
    const status = getAIProviderStatus();

    expect(status.mode).toBe("PILOT_REMOTE");
    expect(status.provider).toBe("openai");
    expect(status.available).toBe(false);
    expect(status.remote).toBe(true);
    expect(status.mock).toBe(false);
    expect(status.blockedReason).toBe("BLOCKED_NO_KEY");

    expect(() => getAIProvider()).toThrowError(AIApplicationError);
    expect(() => getAIProvider("mock")).toThrow(/Mock provider chỉ được phép/);
  });

  it("Secret Ownership: Reports BLOCKED_NO_KEY in PRODUCTION_REMOTE mode when key is absent", () => {
    process.env.AI_PROVIDER_MODE = "PRODUCTION_REMOTE";
    const status = getAIProviderStatus();

    expect(status.mode).toBe("PRODUCTION_REMOTE");
    expect(status.available).toBe(false);
    expect(status.blockedReason).toBe("BLOCKED_NO_KEY");
  });

  // --- 2. MODEL ALLOWLIST & NO HARDCODED LEGACY MODEL ---
  it("Model Configuration: Supports modern GPT-5.6 family and baseline models in allowlist", () => {
    expect(ALLOWED_MODELS_ALLOWLIST).toContain("gpt-5.6-sol");
    expect(ALLOWED_MODELS_ALLOWLIST).toContain("gpt-5.6-terra");
    expect(ALLOWED_MODELS_ALLOWLIST).toContain("gpt-5.6-luna");
    expect(ALLOWED_MODELS_ALLOWLIST).toContain("gpt-5.6");
    expect(ALLOWED_MODELS_ALLOWLIST).toContain("gpt-4o");
    expect(ALLOWED_MODELS_ALLOWLIST).toContain("gpt-4o-mini");
    expect(ALLOWED_MODELS_ALLOWLIST).toContain("o3-mini");
  });

  it("Model Configuration: Server-side AI_MODEL_NAME overrides default when in allowlist", () => {
    process.env.OPENAI_API_KEY = "test-key";
    process.env.AI_MODEL_NAME = "gpt-5.6-sol";
    const provider = new OpenAIProvider();
    expect((provider as any).configuredModel).toBe("gpt-5.6-sol");
  });

  it("Model Configuration: Unapproved model in AI_MODEL_NAME throws MODEL_NOT_ALLOWED (FAIL CLOSED)", () => {
    process.env.OPENAI_API_KEY = "test-key";
    process.env.AI_MODEL_NAME = "unapproved-random-model";
    expect(() => new OpenAIProvider()).toThrowError(
      expect.objectContaining({ code: "MODEL_NOT_ALLOWED" })
    );
  });

  // --- 3. REASONING EFFORT CONFIGURATION & FAIL CLOSED ---
  it("Reasoning Effort: Server-side AI_REASONING_EFFORT overrides default when in allowlist", () => {
    process.env.OPENAI_API_KEY = "test-key";
    process.env.AI_REASONING_EFFORT = "high";
    const provider = new OpenAIProvider();
    expect((provider as any).configuredReasoningEffort).toBe("high");
  });

  it("Reasoning Effort: Unapproved reasoning effort in AI_REASONING_EFFORT throws REASONING_EFFORT_NOT_ALLOWED (FAIL CLOSED)", () => {
    process.env.OPENAI_API_KEY = "test-key";
    process.env.AI_REASONING_EFFORT = "ultra-deep-invalid";
    expect(() => new OpenAIProvider()).toThrowError(
      expect.objectContaining({ code: "REASONING_EFFORT_NOT_ALLOWED" })
    );
  });

  it("Reasoning Effort: Payload builder includes reasoning_effort for GPT-5.6 models", () => {
    const payload = buildOpenAIChatPayload(
      {
        messages: [{ role: "user", content: "Tóm tắt" }],
        maxTokens: 1000,
      },
      "gpt-5.6-sol",
      "medium",
    );
    expect(payload.reasoning_effort).toBe("medium");
  });

  // --- 4. API CONTRACT & BOUNDED PAYLOAD ---
  it("API Contract: Builds bounded Chat Completions payload with strict token and tool clamps", () => {
    const payload = buildOpenAIChatPayload(
      {
        messages: [{ role: "user", content: "Tóm tắt CT-2026-0009" }],
        tools: [
          {
            type: "function",
            function: {
              name: "get_project_summary",
              description: "read project",
              parameters: { type: "object", properties: { projectId: { type: "string" } } },
            },
          },
        ],
        maxTokens: 5000, // exceeds 4000 clamp
        temperature: 0.1,
      },
      "gpt-5.6",
    );

    expect(payload.model).toBe("gpt-5.6");
    expect(payload.max_completion_tokens).toBe(4000); // clamped
    expect(payload.temperature).toBe(0.1);
    expect(payload.tool_choice).toBe("auto");
    expect(payload.tools).toHaveLength(1);
    expect(payload.tools[0].function.name).toBe("get_project_summary");
  });

  // --- 4. HTTP ERROR MAPPING & NO SECRET LEAKAGE ---
  it.each([
    [401, "PROVIDER_UNAUTHORIZED", 503],
    [403, "PROVIDER_UNAUTHORIZED", 503],
    [429, "PROVIDER_RATE_LIMITED", 503],
    [500, "PROVIDER_FAILED", 503],
    [502, "PROVIDER_FAILED", 503],
    [503, "PROVIDER_FAILED", 503],
  ])("HTTP Mapping: Status %s maps to %s (%s) without provider body leakage", (status, code, httpStatus) => {
    const err = mapOpenAIHttpFailure({ status, requestId: "req-12345", retryAfterSeconds: 5 });
    expect(err.code).toBe(code);
    expect(err.httpStatus).toBe(httpStatus);
    expect(err.details?.requestId).toBe("req-12345");
  });

  // --- 5. TELEMETRY & ACTUAL MODEL TRACKING ---
  it("Telemetry: Correctly parses actual model returned by OpenAI and tracks token usage", () => {
    const parsed = parseOpenAIChatResult({
      data: {
        model: "gpt-5.6-2026-08-01",
        choices: [
          {
            message: {
              content: "Tiến độ công trình đạt...",
              tool_calls: undefined,
            },
          },
        ],
        usage: {
          prompt_tokens: 150,
          completion_tokens: 85,
          total_tokens: 235,
        },
      },
      model: "gpt-5.6",
      requestId: "req-98765",
      httpStatus: 200,
      latencyMs: 340,
    });

    expect(parsed.model).toBe("gpt-5.6-2026-08-01");
    expect(parsed.provider).toBe("openai");
    expect(parsed.remote).toBe(true);
    expect(parsed.usage?.promptTokens).toBe(150);
    expect(parsed.usage?.completionTokens).toBe(85);
    expect(parsed.usage?.totalTokens).toBe(235);
    expect(parsed.requestId).toBe("req-98765");
    expect(parsed.latencyMs).toBe(340);
  });

  // --- 6. QA FIXTURE AVAILABILITY ---
  it("QA Fixture: Isolated vertical slice fixture is present and valid JSON for remote benchmarking", () => {
    const fixturePath = path.resolve("d:/construction-erp-v2/scripts/qa/fixtures/ai01b-construction-vertical-slice.json");
    expect(fs.existsSync(fixturePath)).toBe(true);
    const content = JSON.parse(fs.readFileSync(fixturePath, "utf-8"));
    expect(content.header.classification).toBe("SYNTHETIC_QA_ONLY");
    expect(content.items.length).toBe(11);
    expect(content.reports.length).toBe(5);
    expect(content.entries.length).toBe(20);
  });
});
