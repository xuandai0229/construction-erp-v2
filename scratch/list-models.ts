import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function list56Models() {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const res = await fetch('https://api.openai.com/v1/models', {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  const data = await res.json();
  const models = data.data.map((m: any) => m.id).filter((id: string) => id.includes('5.6') || id.includes('gpt-4o') || id.includes('o3'));
  console.log('Available models matching our allowlist:', models);
}

list56Models().catch(console.error);
