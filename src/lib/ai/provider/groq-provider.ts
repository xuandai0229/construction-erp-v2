import "server-only";
import { AIProvider, AIGenerateOptions, AIGenerateResult } from "./ai-provider";
import { AIApplicationError } from "../errors";

export const GROQ_ALLOWED_MODELS = [
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
  "qwen/qwen3.6-27b",
  "llama-3.3-70b-versatile",
] as const;

export const DEFAULT_GROQ_MODEL = "openai/gpt-oss-20b";

export function buildGroqChatPayload(options: AIGenerateOptions, model: string) {
  const payload: any = {
    model,
    messages: options.messages.map((m) => {
      const hasContent = m.content !== undefined && m.content !== null;
      const isToolCallAssistant = m.role === "assistant" && Array.isArray(m.toolCalls) && m.toolCalls.length > 0;
      return {
        role: m.role,
        ...(hasContent ? { content: m.content } : isToolCallAssistant ? { content: null } : { content: "" }),
        ...(m.toolCalls ? { tool_calls: m.toolCalls } : {}),
        ...(m.toolCallId ? { tool_call_id: m.toolCallId } : {}),
        ...(m.name ? { name: m.name } : {}),
      };
    }),
    temperature: options.temperature ?? 0.1,
    max_completion_tokens: Math.max(1, Math.min(options.maxTokens ?? 1000, 4000)),
  };

  if (options.tools?.length) {
    payload.tools = options.tools;
    payload.tool_choice = "auto";
  }

  return payload;
}

export function mapGroqHttpFailure(input: {
  status: number;
  data?: any;
  requestId?: string;
  retryAfterSeconds?: number;
}): AIApplicationError {
  const errCode = input.data?.error?.code;
  const errType = input.data?.error?.type;
  const errMsg = input.data?.error?.message || "";

  if (errCode === "billing_not_active" || errType === "billing_not_active") {
    return new AIApplicationError(
      "PROVIDER_BILLING_INACTIVE",
      "Dịch vụ AI hiện chưa khả dụng do tài khoản nhà cung cấp chưa được kích hoạt.",
      503,
      { requestId: input.requestId },
    );
  }

  if (errCode === "insufficient_quota" || errType === "insufficient_quota") {
    return new AIApplicationError(
      "PROVIDER_QUOTA_EXHAUSTED",
      "Hạn mức sử dụng AI của nhà cung cấp hiện đã hết.",
      503,
      { requestId: input.requestId },
    );
  }

  if (input.status === 401 || input.status === 403) {
    return new AIApplicationError(
      "PROVIDER_UNAUTHORIZED",
      "Không thể xác thực dịch vụ AI.",
      503,
      { requestId: input.requestId },
    );
  }

  if (input.status === 429 || errCode === "rate_limit_exceeded" || /tokens per minute|requests per minute|rate limit/i.test(errMsg)) {
    const waitMatch = errMsg.match(/try again in ([\d.]+)s/i);
    const retrySec = input.retryAfterSeconds ?? (waitMatch ? Math.ceil(Number(waitMatch[1])) : undefined);
    const waitMsg = retrySec
      ? ` Có thể thử lại sau ${retrySec} giây.`
      : "";
    return new AIApplicationError(
      "PROVIDER_RATE_LIMITED",
      `Dịch vụ AI đang tạm giới hạn lưu lượng.${waitMsg}`,
      503,
      { requestId: input.requestId, retryAfterSeconds: retrySec },
    );
  }

  if (input.status === 404 || errCode === "model_not_found") {
    return new AIApplicationError(
      "PROVIDER_MODEL_UNAVAILABLE",
      "Model AI được cấu hình không khả dụng trên nhà cung cấp.",
      503,
      { requestId: input.requestId },
    );
  }

  if (input.status === 400) {
    return new AIApplicationError(
      "PROVIDER_BAD_REQUEST",
      "Yêu cầu gửi tới dịch vụ AI không hợp lệ.",
      503,
      { requestId: input.requestId },
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

export function parseGroqChatResult(input: {
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
            typeof tc?.id === "string" &&
            tc?.type === "function" &&
            typeof tc?.function?.name === "string" &&
            typeof tc?.function?.arguments === "string",
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
    provider: "groq",
    requestId: input.requestId,
    httpStatus: input.httpStatus,
    latencyMs: input.latencyMs,
    remote: true,
  };
}

export class GroqProvider implements AIProvider {
  name = "groq";
  private apiKey: string | undefined;
  private baseUrl = "https://api.groq.com/openai/v1";
  public readonly configuredModel: string;

  constructor() {
    this.apiKey = process.env.GROQ_API_KEY?.replace(/^<|>$/g, "").trim();

    const envModel = process.env.AI_MODEL_NAME?.trim();
    if (envModel) {
      if (!GROQ_ALLOWED_MODELS.includes(envModel as any)) {
        throw new AIApplicationError(
          "PROVIDER_MODEL_MISMATCH",
          `Model '${envModel}' không thuộc danh mục hỗ trợ của Groq (${GROQ_ALLOWED_MODELS.join(", ")}).`,
          400,
        );
      }
      this.configuredModel = envModel;
    } else {
      this.configuredModel = DEFAULT_GROQ_MODEL;
    }
  }

  isAvailable(): boolean {
    return Boolean(this.apiKey && this.apiKey.length > 0);
  }

  async generate(options: AIGenerateOptions): Promise<AIGenerateResult> {
    if (!this.apiKey) {
      throw new AIApplicationError(
        "PROVIDER_UNAVAILABLE",
        "Dịch vụ AI Groq chưa được Operator cấu hình GROQ_API_KEY.",
        503,
      );
    }

    const startedAt = Date.now();

    let model = this.configuredModel;
    if (options.model) {
      if (!GROQ_ALLOWED_MODELS.includes(options.model as any)) {
        throw new AIApplicationError(
          "PROVIDER_MODEL_MISMATCH",
          `Model '${options.model}' không nằm trong danh sách cho phép của Groq.`,
          400,
        );
      }
      model = options.model;
    }

    const payload = buildGroqChatPayload(options, model);

    const maxRetries = 2;
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
          const waitMs = (retryAfterSeconds ? Math.min(retryAfterSeconds, 5) : attempt * 2) * 1000;
          await new Promise((resolve) => setTimeout(resolve, waitMs));
          continue;
        }

        const data = await response.json().catch(() => null);

        if (!response.ok) {
          throw mapGroqHttpFailure({
            status: response.status,
            data,
            requestId,
            retryAfterSeconds: Number.isFinite(retryAfterSeconds) ? retryAfterSeconds : undefined,
          });
        }

        return parseGroqChatResult({
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
