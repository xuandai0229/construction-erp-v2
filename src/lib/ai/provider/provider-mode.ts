import "server-only";
import { AIProviderMode } from "../types";

const VALID_MODES = new Set<AIProviderMode>([
  "DEVELOPMENT_MOCK",
  "PILOT_REMOTE",
  "PRODUCTION_REMOTE",
]);

export type AIProviderName = "mock" | "openai" | "groq" | "gemini";

export interface AIProviderStatus {
  mode: AIProviderMode;
  provider: AIProviderName;
  configuredModel: string;
  available: boolean;
  remote: boolean;
  mock: boolean;
  blockedReason?: "BLOCKED_NO_KEY";
}

export function getAIProviderMode(
  env: Partial<Pick<NodeJS.ProcessEnv, "AI_PROVIDER_MODE" | "NODE_ENV">> = process.env,
): AIProviderMode {
  const configured = env.AI_PROVIDER_MODE?.trim().toUpperCase() as AIProviderMode | undefined;
  if (configured && VALID_MODES.has(configured)) return configured;
  if (env.NODE_ENV === "test" || env.NODE_ENV === "development") return "DEVELOPMENT_MOCK";
  return "PRODUCTION_REMOTE";
}

export function getAIProviderStatus(): AIProviderStatus {
  const mode = getAIProviderMode();
  if (mode === "DEVELOPMENT_MOCK") {
    return {
      mode,
      provider: "mock",
      configuredModel: "mock-construction-agent-v1",
      available: true,
      remote: false,
      mock: true,
    };
  }

  const explicitProvider = process.env.AI_PROVIDER?.trim().toLowerCase() as AIProviderName | undefined;
  let resolvedProvider: AIProviderName = "openai";

  if (explicitProvider === "groq" || explicitProvider === "gemini" || explicitProvider === "openai") {
    resolvedProvider = explicitProvider;
  } else if (process.env.GROQ_API_KEY?.trim() && !process.env.OPENAI_API_KEY?.trim()) {
    resolvedProvider = "groq";
  } else if (process.env.GEMINI_API_KEY?.trim() && !process.env.OPENAI_API_KEY?.trim()) {
    resolvedProvider = "gemini";
  }

  let available = false;
  let configuredModel = "";

  if (resolvedProvider === "groq") {
    available = Boolean(process.env.GROQ_API_KEY?.trim());
    configuredModel = process.env.AI_MODEL_NAME?.trim() || "openai/gpt-oss-20b";
  } else if (resolvedProvider === "gemini") {
    available = Boolean(process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_API_KEY?.trim());
    configuredModel = process.env.AI_MODEL_NAME?.trim() || "gemini-2.5-flash";
  } else {
    available = Boolean(process.env.OPENAI_API_KEY?.trim());
    configuredModel = process.env.AI_MODEL_NAME?.trim() || "gpt-5.6-terra";
  }

  return {
    mode,
    provider: resolvedProvider,
    configuredModel,
    available,
    remote: true,
    mock: false,
    ...(available ? {} : { blockedReason: "BLOCKED_NO_KEY" as const }),
  };
}
