import "server-only";
import { AIProviderMode } from "../types";

const VALID_MODES = new Set<AIProviderMode>([
  "DEVELOPMENT_MOCK",
  "PILOT_REMOTE",
  "PRODUCTION_REMOTE",
]);

export interface AIProviderStatus {
  mode: AIProviderMode;
  provider: "mock" | "openai";
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
    return { mode, provider: "mock", available: true, remote: false, mock: true };
  }

  const available = Boolean(process.env.OPENAI_API_KEY?.trim());
  return {
    mode,
    provider: "openai",
    available,
    remote: true,
    mock: false,
    ...(available ? {} : { blockedReason: "BLOCKED_NO_KEY" as const }),
  };
}
