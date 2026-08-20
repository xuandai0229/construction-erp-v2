export interface AIChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  toolCalls?: AIToolCall[];
  toolCallId?: string;
  name?: string;
}

export interface AIToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string; // JSON string
  };
}

export interface AIToolExportDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>; // JSON Schema
  };
}

export interface AIGenerateOptions {
  messages: AIChatMessage[];
  tools?: AIToolExportDefinition[];
  maxTokens?: number;
  temperature?: number;
  model?: string;
}

export interface AIGenerateResult {
  content: string | null;
  toolCalls?: AIToolCall[];
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  provider: string;
}

export interface AIProvider {
  name: string;
  isAvailable(): boolean;
  generate(options: AIGenerateOptions): Promise<AIGenerateResult>;
}
