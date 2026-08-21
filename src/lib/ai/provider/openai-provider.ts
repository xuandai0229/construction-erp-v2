import "server-only";
import { AIProvider, AIGenerateOptions, AIGenerateResult } from "./ai-provider";
import { AIApplicationError } from "../errors";

export const ALLOWED_MODELS_ALLOWLIST = [
  "gpt-5.6-sol",
  "gpt-5.6-terra",
  "gpt-5.6-luna",
  "gpt-5.6",
  "gpt-4o",
  "gpt-4o-mini",
  "o3-mini",
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
  "qwen/qwen3.6-27b",
];

export const ALLOWED_REASONING_EFFORTS = [
  "none",
  "low",
  "medium",
  "high",
  "xhigh",
  "max",
] as const;

export type AIReasoningEffort = (typeof ALLOWED_REASONING_EFFORTS)[number];
export const DEFAULT_AI_MODEL = "gpt-5.6-terra";
export const DEFAULT_REASONING_EFFORT: AIReasoningEffort = "medium";

export function buildOpenAIChatPayload(
  options: AIGenerateOptions,
  model: string,
  reasoningEffort?: AIReasoningEffort,
) {
  const payload: any = {
    model,
    messages: options.messages.map((m) => ({
      role: m.role,
      content: m.content || "",
      ...(m.toolCalls ? { tool_calls: m.toolCalls } : {}),
      ...(m.toolCallId ? { tool_call_id: m.toolCallId } : {}),
      ...(m.name ? { name: m.name } : {}),
    })),
    temperature: options.temperature ?? 0.1,
    max_completion_tokens: Math.max(1, Math.min(options.maxTokens ?? 1000, 4000)),
  };
  if (options.tools?.length) {
    payload.tools = options.tools;
    payload.tool_choice = "auto";
  }
  const effectiveEffort = options.reasoningEffort ?? reasoningEffort;
  if (effectiveEffort && (model.startsWith("gpt-5.6") || model === "o3-mini")) {
    payload.reasoning_effort = effectiveEffort;
  }
  return payload;
}

export function mapOpenAIHttpFailure(input: {
  status: number;
  requestId?: string;
  retryAfterSeconds?: number;
}): AIApplicationError {
  if (input.status === 401 || input.status === 403) {
    return new AIApplicationError(
      "PROVIDER_UNAUTHORIZED",
      "Dịch vụ AI từ xa từ chối thông tin xác thực server.",
      503,
      { requestId: input.requestId },
    );
  }
  if (input.status === 429) {
    return new AIApplicationError(
      "PROVIDER_RATE_LIMITED",
      "Dịch vụ AI từ xa đang giới hạn lưu lượng. Vui lòng thử lại sau.",
      503,
      { requestId: input.requestId, retryAfterSeconds: input.retryAfterSeconds },
    );
  }
  return new AIApplicationError(
    "PROVIDER_FAILED",
    input.status >= 500
      ? "Dịch vụ AI từ xa đang gặp sự cố. Vui lòng thử lại sau."
      : "Dịch vụ AI từ xa không chấp nhận yêu cầu hiện tại.",
    503,
    { requestId: input.requestId },
  );
}

export function parseOpenAIChatResult(input: {
  data: any;
  model: string;
  requestId?: string;
  httpStatus: number;
  latencyMs: number;
}): AIGenerateResult {
  const choice = input.data?.choices?.[0]?.message;
  if (!choice) {
    throw new AIApplicationError(
      "PROVIDER_MALFORMED_RESPONSE",
      "Dịch vụ AI từ xa trả về phản hồi không hợp lệ.",
      502,
      { requestId: input.requestId },
    );
  }
  const toolCalls = Array.isArray(choice.tool_calls)
    ? choice.tool_calls
        .filter(
          (tc: any) =>
            typeof tc?.id === "string" && tc?.type === "function" &&
            typeof tc?.function?.name === "string" && typeof tc?.function?.arguments === "string",
        )
        .map((tc: any) => ({
          id: tc.id,
          type: "function" as const,
          function: { name: tc.function.name, arguments: tc.function.arguments },
        }))
    : undefined;
  const reasoningTokens = input.data.usage?.completion_tokens_details?.reasoning_tokens;
  return {
    content: choice.content || null,
    toolCalls,
    usage: {
      promptTokens: input.data.usage?.prompt_tokens || 0,
      completionTokens: input.data.usage?.completion_tokens || 0,
      reasoningTokens: typeof reasoningTokens === "number" ? reasoningTokens : undefined,
      totalTokens: input.data.usage?.total_tokens || 0,
    },
    model: input.data.model || input.model,
    provider: "openai",
    requestId: input.requestId,
    httpStatus: input.httpStatus,
    latencyMs: input.latencyMs,
    remote: true,
  };
}

export class OpenAIProvider implements AIProvider {
  name = "openai";
  private apiKey: string | undefined;
  private baseUrl: string;
  private configuredModel: string;
  private configuredReasoningEffort: AIReasoningEffort;

  constructor() {
    const isGroq = process.env.AI_PROVIDER?.toLowerCase() === "groq" || Boolean(process.env.GROQ_API_KEY && !process.env.OPENAI_API_KEY);
    this.apiKey = isGroq
      ? (process.env.GROQ_API_KEY?.replace(/^<|>$/g, '').trim() || process.env.OPENAI_API_KEY?.replace(/^<|>$/g, '').trim())
      : process.env.OPENAI_API_KEY?.replace(/^<|>$/g, '').trim();

    this.baseUrl = process.env.OPENAI_BASE_URL || (isGroq ? "https://api.groq.com/openai/v1" : "https://api.openai.com/v1");

    const defaultModel = isGroq ? "openai/gpt-oss-120b" : DEFAULT_AI_MODEL;
    const envModel = process.env.AI_MODEL_NAME?.trim();
    if (envModel) {
      if (!ALLOWED_MODELS_ALLOWLIST.includes(envModel)) {
        throw new AIApplicationError(
          "MODEL_NOT_ALLOWED",
          `Model '${envModel}' không nằm trong danh sách cho phép (${ALLOWED_MODELS_ALLOWLIST.join(", ")}).`,
          400,
        );
      }
      this.configuredModel = envModel;
    } else {
      this.configuredModel = defaultModel;
    }

    const envEffort = process.env.AI_REASONING_EFFORT?.trim().toLowerCase() as AIReasoningEffort | undefined;
    if (envEffort) {
      if (!ALLOWED_REASONING_EFFORTS.includes(envEffort)) {
        throw new AIApplicationError(
          "REASONING_EFFORT_NOT_ALLOWED",
          `Reasoning effort '${envEffort}' không hợp lệ (${ALLOWED_REASONING_EFFORTS.join(", ")}).`,
          400,
        );
      }
      this.configuredReasoningEffort = envEffort;
    } else {
      this.configuredReasoningEffort = DEFAULT_REASONING_EFFORT;
    }
  }

  isAvailable(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
  }

  async generate(options: AIGenerateOptions): Promise<AIGenerateResult> {
    if (!this.apiKey) {
      throw new AIApplicationError(
        "PROVIDER_UNAVAILABLE",
        "Dịch vụ AI từ xa chưa được Operator cấu hình.",
        503,
      );
    }

    const startedAt = Date.now();

    // Model Allowlist Enforcement (Strict Fail Closed)
    let model = this.configuredModel;
    if (options.model) {
      if (!ALLOWED_MODELS_ALLOWLIST.includes(options.model)) {
        throw new AIApplicationError(
          "MODEL_NOT_ALLOWED",
          `Model '${options.model}' không nằm trong danh sách cho phép.`,
          400,
        );
      }
      model = options.model;
    }

    // Reasoning Effort Enforcement (Strict Fail Closed)
    let reasoningEffort = this.configuredReasoningEffort;
    if (options.reasoningEffort) {
      if (!ALLOWED_REASONING_EFFORTS.includes(options.reasoningEffort)) {
        throw new AIApplicationError(
          "REASONING_EFFORT_NOT_ALLOWED",
          `Reasoning effort '${options.reasoningEffort}' không hợp lệ.`,
          400,
        );
      }
      reasoningEffort = options.reasoningEffort;
    }

    const payload = buildOpenAIChatPayload(options, model, reasoningEffort);

    let maxRetries = 2;
    let attempt = 0;

    while (attempt <= maxRetries) {
      attempt += 1;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);

      try {
        const response = await fetch(`${this.baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        const requestId = response.headers.get("x-request-id") || undefined;
        const retryAfterHeader = response.headers.get("retry-after");
        const retryAfterSeconds = retryAfterHeader ? Number(retryAfterHeader) : undefined;

        if (response.status === 429 && attempt <= maxRetries) {
          const waitMs = (retryAfterSeconds ? Math.min(retryAfterSeconds, 5) : (attempt * 2)) * 1000;
          await new Promise((resolve) => setTimeout(resolve, waitMs));
          continue;
        }

        if (!response.ok) {
          throw mapOpenAIHttpFailure({
            status: response.status,
            requestId,
            retryAfterSeconds: Number.isFinite(retryAfterSeconds) ? retryAfterSeconds : undefined,
          });
        }

        const data = await response.json().catch(() => null);
        return parseOpenAIChatResult({
          data,
          model,
          requestId,
          httpStatus: response.status,
          latencyMs: Date.now() - startedAt,
        });
      } catch (error) {
        if (error instanceof AIApplicationError) throw error;
        if (error instanceof Error && error.name === "AbortError") {
          throw new AIApplicationError(
            "PROVIDER_TIMEOUT",
            "Dịch vụ AI từ xa phản hồi quá thời gian cho phép.",
            503,
          );
        }
        if (attempt > maxRetries) {
          throw new AIApplicationError(
            "PROVIDER_FAILED",
            "Không thể kết nối tới dịch vụ AI từ xa.",
            503,
          );
        }
        await new Promise((resolve) => setTimeout(resolve, 1500));
      } finally {
        clearTimeout(timeoutId);
      }
    }

    throw new AIApplicationError(
      "PROVIDER_FAILED",
      "Không thể kết nối tới dịch vụ AI từ xa.",
      503,
    );
  }
}


