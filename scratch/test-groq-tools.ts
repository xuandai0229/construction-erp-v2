import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import * as https from 'https';

const apiKey = process.env.GROQ_API_KEY?.replace(/^<|>$/g, '').trim();

async function testGroqTools() {
  const tools = [
    {
      type: "function",
      function: {
        name: "get_project_summary",
        description: "Truy vấn tóm tắt tiến độ, thời hạn, ngân sách và rủi ro của công trình theo projectId.",
        parameters: {
          type: "object",
          properties: {
            projectId: { type: "string", description: "ID hoặc mã công trình" }
          },
          required: ["projectId"]
        }
      }
    }
  ];

  const payload = JSON.stringify({
    model: "openai/gpt-oss-120b",
    messages: [
      { role: "system", content: "Bạn là trợ lý AI điều hành công trường. Hãy dùng tool khi người dùng hỏi về công trình." },
      { role: "user", content: "Tóm tắt tình hình công trình CT-2026-0009." }
    ],
    tools,
    tool_choice: "auto",
    temperature: 0.1,
  });

  return new Promise((resolve) => {
    const options = {
      hostname: 'api.groq.com',
      port: 443,
      path: '/openai/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        'Authorization': `Bearer ${apiKey}`,
        'User-Agent': 'ConstructionERP/1.0',
      },
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (d) => { body += d; });
      res.on('end', () => {
        const data = JSON.parse(body);
        console.log(`Tool Calling Status: ${res.statusCode}`);
        console.log(`Message:`, data.choices?.[0]?.message);
        console.log(`Tool Calls:`, JSON.stringify(data.choices?.[0]?.message?.tool_calls, null, 2));
        resolve(null);
      });
    });

    req.on('error', (e) => {
      console.error(`Tool Request Error:`, e.message);
      resolve(null);
    });
    req.write(payload);
    req.end();
  });
}

testGroqTools().catch(console.error);
