import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function testGeminiNative() {
  const apiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY)?.replace(/^<|>$/g, '').trim();

  // Test models: 'gemini-2.5-flash', 'gemini-flash-latest', 'gemini-2.5-pro'
  const model = "gemini-2.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const payload = {
    contents: [
      {
        role: "user",
        parts: [{ text: "Chào bạn, hãy giới thiệu ngắn gọn trong 1 câu." }]
      }
    ],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 1000,
    }
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  console.log("Status:", res.status, res.statusText);
  const data = await res.json();
  console.log("Response text:", data.candidates?.[0]?.content?.parts?.[0]?.text);
  console.log("Usage metadata:", data.usageMetadata);
}

testGeminiNative().catch(console.error);
