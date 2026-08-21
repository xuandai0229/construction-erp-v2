import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import * as https from 'https';

const apiKey = process.env.GROQ_API_KEY?.replace(/^<|>$/g, '').trim();

const options = {
  hostname: 'api.groq.com',
  port: 443,
  path: '/openai/v1/models',
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${apiKey}`,
  },
};

const req = https.request(options, (res) => {
  let body = '';
  res.on('data', (d) => { body += d; });
  res.on('end', () => {
    const data = JSON.parse(body);
    console.log('Groq models:');
    for (const m of data.data) {
      console.log(' -', m.id);
    }
  });
});
req.end();
