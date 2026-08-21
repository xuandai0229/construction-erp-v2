import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function testEndpoints() {
  const apiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY)?.replace(/^<|>$/g, '').trim();

  const candidates = [
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`,
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-latest:generateContent?key=${apiKey}`,
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${apiKey}`,
  ];

  for (const url of candidates) {
    const modelName = url.split('/models/')[1]?.split(':')[0];
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: 'Xin chào, bạn là ai?' }] }],
        }),
      });
      const data = await res.json().catch(() => null);
      console.log(`[${modelName}] Status: ${res.status}`);
      if (res.ok) {
        console.log(`  -> Response: "${data?.candidates?.[0]?.content?.parts?.[0]?.text?.slice(0, 80)}..."`);
        console.log(`  -> Tokens:`, data?.usageMetadata);
      } else {
        console.log(`  -> Error:`, data?.error?.message);
      }
    } catch (e: any) {
      console.log(`  -> Exception: ${e.message}`);
    }
  }
}

testEndpoints().catch(console.error);
