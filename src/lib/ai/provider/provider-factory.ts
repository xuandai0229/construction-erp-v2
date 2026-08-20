import { AIProvider } from "./ai-provider";
import { OpenAIProvider } from "./openai-provider";
import { MockAIProvider } from "./mock-provider";

export function getAIProvider(preferred?: string): AIProvider {
  if (preferred === "mock") {
    return new MockAIProvider();
  }

  const openAI = new OpenAIProvider();
  if (openAI.isAvailable()) {
    return openAI;
  }

  // Fallback to Mock Provider when no remote API key is set
  return new MockAIProvider();
}
