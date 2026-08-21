import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function testGroqConnection() {
  const apiKey = process.env.GROQ_API_KEY?.replace(/^<|>$/g, '').trim();
  if (!apiKey) {
    console.log('No Groq key found');
    return;
  }

  console.log('Testing Groq key...');
  console.log('Key length:', apiKey.length);
  console.log('Key starts with "gsk_":', apiKey.startsWith('gsk_'));

  try {
    const res = await fetch('https://api.groq.com/openai/v1/models', {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    console.log('HTTP Status from Groq /v1/models:', res.status, res.statusText);
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      console.log('Groq Error Details:', JSON.stringify(data));
      return;
    }

    console.log('SUCCESS! Available models count:', data?.data?.length);
    const models = data?.data?.map((m: any) => m.id);
    console.log('Sample Groq Models:', models?.slice(0, 10));

    // Test a real chat completion call with Llama 3.3 70B
    console.log('\nTesting Chat Completion with llama-3.3-70b-versatile...');
    const chatRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: 'You are a construction assistant in Vietnam.' },
          { role: 'user', content: 'Xin chào, bạn là ai? Hãy trả lời ngắn gọn trong 1 câu tiếng Việt.' }
        ],
        temperature: 0.1,
      }),
    });

    console.log('Chat Completion HTTP Status:', chatRes.status);
    const chatData = await chatRes.json();
    console.log('Response content:', chatData.choices?.[0]?.message?.content);
    console.log('Usage:', chatData.usage);
  } catch (e: any) {
    console.error('Fetch exception:', e.message);
  }
}

testGroqConnection().catch(console.error);
