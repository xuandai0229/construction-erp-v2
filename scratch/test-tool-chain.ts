import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import * as https from 'https';

const apiKey = process.env.GROQ_API_KEY?.replace(/^<|>$/g, '').trim();

async function testAssistantMessageWithTools() {
  const toolCallId = "call_abc123";

  // Test with content: "" vs content: null
  const payloadWithEmptyString = {
    model: "openai/gpt-oss-120b",
    messages: [
      { role: "user", content: "Tôi phụ trách dự án nào?" },
      {
        role: "assistant",
        content: "",
        tool_calls: [{
          id: toolCallId,
          type: "function",
          function: { name: "get_my_projects", arguments: "{}" }
        }]
      },
      {
        role: "tool",
        tool_call_id: toolCallId,
        name: "get_my_projects",
        content: JSON.stringify({ success: true, data: [{ code: "CT-2026-0009", name: "Trường Mầm Non" }] })
      }
    ],
    temperature: 0.1,
  };

  const payloadWithNull = {
    ...payloadWithEmptyString,
    messages: [
      payloadWithEmptyString.messages[0],
      {
        role: "assistant",
        content: null,
        tool_calls: [{
          id: toolCallId,
          type: "function",
          function: { name: "get_my_projects", arguments: "{}" }
        }]
      },
      payloadWithEmptyString.messages[2]
    ]
  };

  async function send(payload: any, label: string) {
    const dataStr = JSON.stringify(payload);
    return new Promise((resolve) => {
      const req = https.request({
        hostname: 'api.groq.com',
        port: 443,
        path: '/openai/v1/chat/completions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(dataStr),
          'Authorization': `Bearer ${apiKey}`,
        },
      }, (res) => {
        let body = '';
        res.on('data', (d) => { body += d; });
        res.on('end', () => {
          console.log(`[${label}] Status: ${res.statusCode}`);
          if (res.statusCode !== 200) {
            console.log(`  -> Error:`, body);
          } else {
            console.log(`  -> Success! Response content:`, JSON.parse(body).choices?.[0]?.message?.content);
          }
          resolve(null);
        });
      });
      req.write(dataStr);
      req.end();
    });
  }

  await send(payloadWithEmptyString, "With content: ''");
  await send(payloadWithNull, "With content: null");
}

testAssistantMessageWithTools().catch(console.error);
