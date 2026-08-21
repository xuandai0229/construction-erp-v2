import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import * as https from 'https';

const apiKey = process.env.GROQ_API_KEY?.replace(/^<|>$/g, '').trim();

async function testGroqChat() {
  const payload = JSON.stringify({
    model: "llama-3.3-70b-versatile",
    messages: [
      { role: "system", content: "Bạn là trợ lý AI công trường xây dựng." },
      { role: "user", content: "Xin chào, bạn có thể giúp gì cho tôi?" }
    ],
    temperature: 0.1,
  });

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
    console.log('HTTPS Chat Status:', res.statusCode, res.statusMessage);
    let body = '';
    res.on('data', (d) => { body += d; });
    res.on('end', () => {
      try {
        const data = JSON.parse(body);
        console.log('Response content:', data.choices?.[0]?.message?.content);
        console.log('Usage:', data.usage);
      } catch {
        console.log('Raw body:', body);
      }
    });
  });

  req.on('error', (e) => {
    console.error('HTTPS Error:', e);
  });
  req.write(payload);
  req.end();
}

testGroqChat().catch(console.error);
