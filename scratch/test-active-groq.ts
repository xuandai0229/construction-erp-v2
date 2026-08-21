import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import * as https from 'https';

const apiKey = process.env.GROQ_API_KEY?.replace(/^<|>$/g, '').trim();

async function testModel(modelName: string) {
  const payload = JSON.stringify({
    model: modelName,
    messages: [
      { role: "system", content: "Bạn là trợ lý AI chuyên nghiệp về xây dựng và điều hành công trường." },
      { role: "user", content: "Xin chào! Bạn hãy tự giới thiệu ngắn gọn trong 1 câu tiếng Việt." }
    ],
    temperature: 0.1,
  });

  return new Promise((resolve) => {
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
      let body = '';
      res.on('data', (d) => { body += d; });
      res.on('end', () => {
        try {
          const data = JSON.parse(body);
          console.log(`[${modelName}] Status: ${res.statusCode}`);
          if (res.statusCode === 200) {
            console.log(`  -> Content: "${data.choices?.[0]?.message?.content}"`);
            console.log(`  -> Usage:`, data.usage);
          } else {
            console.log(`  -> Error:`, data.error?.message || body);
          }
        } catch {
          console.log(`[${modelName}] Raw:`, body);
        }
        resolve(null);
      });
    });

    req.on('error', (e) => {
      console.error(`[${modelName}] Request Error:`, e.message);
      resolve(null);
    });
    req.write(payload);
    req.end();
  });
}

async function runTests() {
  await testModel('openai/gpt-oss-120b');
  await testModel('openai/gpt-oss-20b');
  await testModel('qwen/qwen3.6-27b');
}

runTests().catch(console.error);
