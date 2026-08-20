import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getAIProvider } from "../provider/provider-factory";
import { getAIProviderStatus } from "../provider/provider-mode";
import {
  buildOpenAIChatPayload,
  mapOpenAIHttpFailure,
  parseOpenAIChatResult,
} from "../provider/openai-provider";
import { AIApplicationError } from "../errors";

describe("AI-01 provider contract and no-silent-fallback", () => {
  const originalMode = process.env.AI_PROVIDER_MODE;
  const originalKey = process.env.OPENAI_API_KEY;

  beforeEach(() => {
    process.env.AI_PROVIDER_MODE = "PILOT_REMOTE";
    delete process.env.OPENAI_API_KEY;
  });

  afterEach(() => {
    process.env.AI_PROVIDER_MODE = originalMode;
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalKey;
  });

  it("reports BLOCKED_NO_KEY and refuses mock fallback in remote modes", () => {
    expect(getAIProviderStatus()).toEqual({
      mode: "PILOT_REMOTE",
      provider: "openai",
      available: false,
      remote: true,
      mock: false,
      blockedReason: "BLOCKED_NO_KEY",
    });
    expect(() => getAIProvider()).toThrowError(AIApplicationError);
    expect(() => getAIProvider("mock")).toThrow(/Mock provider chỉ được phép/);
  });

  it("builds the bounded output/tool contract without making a remote request", () => {
    const payload = buildOpenAIChatPayload({
      messages: [{ role: "user", content: "projects" }],
      tools: [{ type: "function", function: { name: "get_my_projects", description: "read", parameters: { type: "object" } } }],
      maxTokens: 1234,
    }, "gpt-4o-mini");
    expect(payload.max_completion_tokens).toBe(1234);
    expect(payload.tool_choice).toBe("auto");
    expect(payload.tools).toHaveLength(1);
    expect(payload.messages).toEqual([{ role: "user", content: "projects" }]);
  });

  it.each([
    [401, "PROVIDER_UNAUTHORIZED"],
    [403, "PROVIDER_UNAUTHORIZED"],
    [429, "PROVIDER_RATE_LIMITED"],
    [500, "PROVIDER_FAILED"],
  ])("maps HTTP %s to controlled %s without provider-body leakage", (status, code) => {
    expect(mapOpenAIHttpFailure({ status, requestId: "redacted-provider-request", retryAfterSeconds: 7 }))
      .toMatchObject({ code });
  });

  it("parses actual-model metadata/tool calls and rejects malformed success bodies", () => {
    const result = parseOpenAIChatResult({
      data: {
        model: "actual-model-from-response",
        choices: [{ message: { content: null, tool_calls: [{ id: "call_1", type: "function", function: { name: "get_my_projects", arguments: "{\"limit\":10}" } }] } }],
        usage: { prompt_tokens: 12, completion_tokens: 8, total_tokens: 20 },
      },
      model: "configured-model",
      requestId: "redacted-provider-request",
      httpStatus: 200,
      latencyMs: 42,
    });
    expect(result).toMatchObject({
      model: "actual-model-from-response",
      provider: "openai",
      httpStatus: 200,
      latencyMs: 42,
      remote: true,
    });
    expect(result.toolCalls?.[0].function.name).toBe("get_my_projects");
    expect(() => parseOpenAIChatResult({
      data: {},
      model: "configured-model",
      httpStatus: 200,
      latencyMs: 1,
    })).toThrowError(expect.objectContaining({ code: "PROVIDER_MALFORMED_RESPONSE" }));
  });
});
