import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function diagnoseOpenAIKey() {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    console.log('No key found in env');
    return;
  }

  console.log('API Key diagnostics:');
  console.log('Key length:', apiKey.length);
  console.log('Key starts with "sk-":', apiKey.startsWith('sk-'));
  console.log('Key starts with "sk-proj-":', apiKey.startsWith('sk-proj-'));
  console.log('Has quotes around it:', apiKey.startsWith('"') || apiKey.endsWith('"'));
  console.log('Has newline in it:', apiKey.includes('\n') || apiKey.includes('\r'));

  // Test fetch to OpenAI /v1/models
  try {
    const res = await fetch('https://api.openai.com/v1/models', {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    console.log('HTTP Status from OpenAI /v1/models:', res.status, res.statusText);
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      console.log('OpenAI Error Details:', JSON.stringify(data));
    } else {
      console.log('Success! Available models count:', data?.data?.length);
      const gptModels = data?.data?.map((m: any) => m.id).filter((id: string) => id.includes('gpt') || id.includes('5.6'));
      console.log('Sample GPT Models:', gptModels?.slice(0, 10));
    }
  } catch (e: any) {
    console.error('Fetch exception:', e.message);
  }
}

diagnoseOpenAIKey().catch(console.error);
