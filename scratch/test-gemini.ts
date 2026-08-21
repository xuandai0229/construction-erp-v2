import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function testGeminiConnection() {
  const apiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY)?.replace(/^<|>$/g, '').trim();
  if (!apiKey) {
    console.log('No Gemini API key found');
    return;
  }

  console.log('Testing Gemini API key...');
  console.log('Key length:', apiKey.length);
  console.log('Prefix (first 4 chars):', apiKey.slice(0, 4));

  // Test call to Gemini 2.0 Flash / 1.5 Flash
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
  try {
    const res = await fetch(url);
    console.log('HTTP Status from Google Gemini API:', res.status, res.statusText);
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      console.log('Gemini Error:', JSON.stringify(data));
    } else {
      console.log('SUCCESS! Available models count:', data?.models?.length);
      const geminiModels = data?.models?.map((m: any) => m.name).filter((n: string) => n.includes('gemini'));
      console.log('Sample Gemini Models:', geminiModels?.slice(0, 10));
    }
  } catch (e: any) {
    console.error('Fetch error:', e.message);
  }
}

testGeminiConnection().catch(console.error);
