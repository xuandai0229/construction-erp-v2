import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function inspectGroqError() {
  const apiKey = process.env.GROQ_API_KEY?.replace(/^<|>$/g, "").trim();
  console.log('Sending raw request to Groq API...');

  // Sending a request with 1 token to check headers and error format
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'openai/gpt-oss-20b',
      messages: [{ role: 'user', content: 'test' }],
    }),
  });

  console.log('Groq HTTP Status:', response.status);
  console.log('Groq Headers:');
  response.headers.forEach((val, key) => {
    if (key.includes('ratelimit') || key.includes('retry') || key.includes('request')) {
      console.log(`  ${key}: ${val}`);
    }
  });
  const data = await response.json();
  console.log('Groq Response Body:', JSON.stringify(data, null, 2));
}

inspectGroqError().catch(console.error);
