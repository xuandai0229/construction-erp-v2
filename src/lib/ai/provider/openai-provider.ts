import { AIProvider, AIGenerateOptions, AIGenerateResult } from "./ai-provider";

export const ALLOWED_MODELS_ALLOWLIST = [
  "gpt-4o-mini",
  "gpt-4o",
  "gpt-5.6",
  "mock-gpt-4o",
];

export const DEFAULT_AI_MODEL = "gpt-4o-mini";

export class OpenAIProvider implements AIProvider {
  name = "openai";
  private apiKey: string | undefined;
  private configuredModel: string;

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY;
    const envModel = process.env.AI_MODEL_NAME;
    this.configuredModel =
      envModel && ALLOWED_MODELS_ALLOWLIST.includes(envModel)
        ? envModel
        : DEFAULT_AI_MODEL;
  }

  isAvailable(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
  }

  async generate(options: AIGenerateOptions): Promise<AIGenerateResult> {
    if (!this.apiKey) {
      throw new Error("OPENAI_API_KEY is not configured on the server.");
    }

    // Model Allowlist Enforcement (Server-side clamp)
    let model = this.configuredModel;
    if (options.model && ALLOWED_MODELS_ALLOWLIST.includes(options.model)) {
      model = options.model;
    }

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
    };

    if (options.tools && options.tools.length > 0) {
      payload.tools = options.tools;
      payload.tool_choice = "auto";
    }

    // 15s Request Timeout to prevent hanging connections
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`OpenAI API error [HTTP ${response.status}]: ${errText}`);
      }

      const data = await response.json();
      const choice = data.choices?.[0]?.message;

      return {
        content: choice?.content || null,
        toolCalls: choice?.tool_calls?.map((tc: any) => ({
          id: tc.id,
          type: "function",
          function: {
            name: tc.function.name,
            arguments: tc.function.arguments,
          },
        })),
        usage: {
          promptTokens: data.usage?.prompt_tokens || 0,
          completionTokens: data.usage?.completion_tokens || 0,
          totalTokens: data.usage?.total_tokens || 0,
        },
        model: data.model || model,
        provider: "openai",
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
