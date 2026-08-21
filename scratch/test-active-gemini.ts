import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function testNewGeminiModels() {
  const apiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY)?.replace(/^<|>$/g, '').trim();

  const candidates = [
    'gemini-3.6-flash',
    'gemini-3-flash-preview',
    'gemini-2.5-flash-lite',
    'gemini-3.1-flash-lite-preview',
    'gemma-4-26b-a4b-it',
    'gemma-4-31b-it',
  ];

  for (const model of candidates) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: 'Chào bạn, hãy giới thiệu ngắn gọn trong 1 câu.' }] }],
        }),
      });
      const data = await res.json().catch(() => null);
      console.log(`[${model}] Status: ${res.status}`);
      if (res.ok) {
        console.log(`  -> SUCCESS! Response: "${data?.candidates?.[0]?.content?.parts?.[0]?.text?.slice(0, 100)}..."`);
        console.log(`  -> Tokens:`, data?.usageMetadata);
      } else {
        console.log(`  -> Error:`, data?.error?.message?.slice(0, 120));
      }
    } catch (e: any) {
      console.log(`  -> Exception: ${e.message}`);
    }
  }
}

testNewGeminiModels().catch(console.error);
