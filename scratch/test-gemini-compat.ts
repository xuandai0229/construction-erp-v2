import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function testGeminiOpenAICompatibility() {
  const apiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY)?.replace(/^<|>$/g, '').trim();

  const payload = {
    model: "gemini-2.5-flash",
    messages: [
      { role: "system", content: "You are a helpful construction assistant in Vietnam." },
      { role: "user", content: "Chào bạn, hãy giới thiệu ngắn gọn trong 1 câu." }
    ],
    temperature: 0.1,
  };

  const res = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  console.log("Status:", res.status, res.statusText);
  const data = await res.json();
  console.log("Response content:", data.choices?.[0]?.message?.content);
  console.log("Usage:", data.usage);
}

testGeminiOpenAICompatibility().catch(console.error);
