import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import * as https from 'https';

const apiKey = process.env.GROQ_API_KEY?.replace(/^<|>$/g, '').trim();

async function testGroqNode() {
  const options = {
    hostname: 'api.groq.com',
    port: 443,
    path: '/openai/v1/models',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'User-Agent': 'Node-Fetch',
    },
  };

  const req = https.request(options, (res) => {
    console.log('HTTPS Status:', res.statusCode, res.statusMessage);
    let body = '';
    res.on('data', (d) => { body += d; });
    res.on('end', () => {
      console.log('Body:', body.slice(0, 300));
    });
  });

  req.on('error', (e) => {
    console.error('HTTPS Error:', e);
  });
  req.end();
}

testGroqNode().catch(console.error);
