import dotenv from "dotenv";
import path from "node:path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

// Mock server-only for node tsx execution
const Module = require("module");
const originalRequire = Module.prototype.require;
Module.prototype.require = function (id: string) {
  if (id === "server-only") return {};
  return originalRequire.apply(this, arguments);
};

import { OpenAIProvider } from "../../src/lib/ai/provider/openai-provider";
import { executeAIChatTurn } from "../../src/lib/ai/controller/ai-chat-controller";
import prisma from "../../src/lib/prisma";

export interface LiveOpenAISmokeResult {
  executed: boolean;
  status: "PASS" | "FAIL" | "BLOCKED_NO_KEY";
  providerKind: "remote-openai" | "none";
  modelName: string;
  responseId?: string;
  httpStatus?: number;
  latencyMs?: number;
  promptTokens?: number;
  completionTokens?: number;
  toolCallsCount?: number;
  message: string;
}

export async function runRealOpenAISmoke(): Promise<LiveOpenAISmokeResult> {
  const apiKey = process.env.OPENAI_API_KEY;

  console.log("=======================================================");
  console.log("REAL OPENAI REMOTE PROVIDER SMOKE GATE");
  console.log("=======================================================");

  if (!apiKey || apiKey.trim().length === 0 || apiKey.includes("your-api-key")) {
    console.error("[LIVE GATE BLOCKED] OPENAI_API_KEY is not configured in server environment (.env.local).");
    console.error("Invariant Enforcement: Mock adapter is strictly FORBIDDEN from satisfying this gate.");
    console.log("=======================================================\n");
    return {
      executed: false,
      status: "BLOCKED_NO_KEY",
      providerKind: "none",
      modelName: process.env.AI_MODEL_NAME || "gpt-4o-mini",
      message: "OPENAI_API_KEY is missing. Real remote OpenAI API call cannot be executed in this environment without operator credentials.",
    };
  }

  const model = process.env.AI_MODEL_NAME || "gpt-4o-mini";
  console.log(`Target Remote Model: ${model}`);
  console.log(`Connecting to remote endpoint: https://api.openai.com/v1/chat/completions ...\n`);

  try {
    const adminUser = await prisma.user.findFirst({
      where: { email: "daicongtu2910@gmail.com", deletedAt: null },
      select: { id: true, username: true, email: true, name: true, role: true, isActive: true, phone: true },
    });

    if (!adminUser) {
      throw new Error("Admin user not found in database for smoke test.");
    }

    const startTime = Date.now();
    const result = await executeAIChatTurn({
      messages: [{ role: "user", content: "Tôi đang phụ trách những công trình nào?" }],
      contextOptions: { explicitUser: adminUser },
      preferredProvider: "openai",
    });
    const latency = Date.now() - startTime;

    if (!result.success) {
      console.error(`[LIVE GATE FAIL] Remote OpenAI API call failed: ${result.error?.message}`);
      return {
        executed: true,
        status: "FAIL",
        providerKind: "remote-openai",
        modelName: model,
        latencyMs: latency,
        message: result.error?.message || "Unknown error during remote execution",
      };
    }

    console.log(`[LIVE GATE PASS] Remote OpenAI execution successful!`);
    console.log(`- Provider: openai (remote)`);
    console.log(`- Model: ${result.telemetry.model}`);
    console.log(`- Latency: ${latency}ms`);
    console.log(`- Tool Calls Executed: ${result.toolCallsExecuted}`);
    console.log(`- Tokens: Prompt=${result.telemetry.promptTokens}, Completion=${result.telemetry.completionTokens}`);
    console.log(`- Content Preview: ${result.content.substring(0, 100)}...`);
    console.log("=======================================================\n");

    return {
      executed: true,
      status: "PASS",
      providerKind: "remote-openai",
      modelName: result.telemetry.model,
      latencyMs: latency,
      promptTokens: result.telemetry.promptTokens,
      completionTokens: result.telemetry.completionTokens,
      toolCallsCount: result.toolCallsExecuted,
      message: "Remote OpenAI call verified end-to-end with real tool selection and synthesis.",
    };
  } catch (err: any) {
    console.error(`[LIVE GATE FAIL] Exception during remote OpenAI execution: ${err.message}`);
    return {
      executed: true,
      status: "FAIL",
      providerKind: "remote-openai",
      modelName: model,
      message: err.message,
    };
  }
}

if (process.argv[1]?.includes("live-openai-smoke")) {
  runRealOpenAISmoke()
    .then((res) => {
      if (res.status === "PASS") process.exit(0);
      else process.exit(1);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
