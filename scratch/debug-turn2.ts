import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function debugTurn2Error() {
  const { exportAIToolDefinitions } = await import('../src/lib/ai/gateway/ai-tool-exporter');
  const { buildOpenAIChatPayload } = await import('../src/lib/ai/provider/openai-provider');
  const apiKey = process.env.GROQ_API_KEY?.trim();

  const exportedTools = exportAIToolDefinitions();
  const messages: any[] = [
    { role: "system", content: "Bạn là trợ lý AI công trường." },
    { role: "user", content: "Tôi đang phụ trách những công trình nào?" }
  ];

  // Turn 1
  const payload1 = buildOpenAIChatPayload({ messages, tools: exportedTools }, "openai/gpt-oss-20b");
  const res1 = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(payload1),
  });
  const data1 = await res1.json();
  const toolCall = data1.choices?.[0]?.message?.tool_calls?.[0];

  // Turn 2
  const messages2: any[] = [
    ...messages,
    {
      role: "assistant",
      content: data1.choices[0].message.content,
      toolCalls: data1.choices[0].message.tool_calls,
    },
    {
      role: "tool",
      toolCallId: toolCall.id,
      name: toolCall.function.name,
      content: JSON.stringify({
        success: true,
        data: [{ code: "CT-2026-0009", name: "Trường mầm non" }],
        sources: [{ type: "PROJECT", id: "p1", code: "CT-2026-0009", label: "CT-2026-0009" }]
      }),
    }
  ];

  const payload2 = buildOpenAIChatPayload({ messages: messages2, tools: exportedTools }, "openai/gpt-oss-20b");
  const res2 = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(payload2),
  });
  const data2 = await res2.json();
  console.log("Turn 2 Status:", res2.status, res2.statusText);
  console.log("Turn 2 Body:", JSON.stringify(data2, null, 2));
}

debugTurn2Error().catch(console.error);
