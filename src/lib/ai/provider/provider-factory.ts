import { AIProvider } from "./ai-provider";
import { OpenAIProvider } from "./openai-provider";
import { GroqProvider } from "./groq-provider";
import { MockAIProvider } from "./mock-provider";
import { AIApplicationError } from "../errors";
import { getAIProviderStatus } from "./provider-mode";

export function getAIProvider(preferred?: string): AIProvider {
  const status = getAIProviderStatus();

  if (status.mode === "DEVELOPMENT_MOCK") {
    return new MockAIProvider();
  }

  if (preferred === "mock") {
    throw new AIApplicationError(
      "PROVIDER_UNAVAILABLE",
      "Mock provider chỉ được phép trong DEVELOPMENT_MOCK hoặc deterministic test.",
      503,
    );
  }

  if (status.provider === "groq") {
    const groq = new GroqProvider();
    if (groq.isAvailable()) {
      return groq;
    }
  } else if (status.provider === "openai") {
    const openAI = new OpenAIProvider();
    if (openAI.isAvailable()) {
      return openAI;
    }
  }

  throw new AIApplicationError(
    "PROVIDER_UNAVAILABLE",
    `Dịch vụ AI từ xa (${status.provider}) chưa được Operator cấu hình API key hoặc hiện không khả dụng.`,
    503,
  );
}
