import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import * as fs from 'fs';
import * as path from 'path';

const envPath = path.resolve('d:/construction-erp-v2/.env.local');
let content = fs.readFileSync(envPath, 'utf-8');

// Check if GEMINI_API_KEY has literal angle brackets or quotes
const match = content.match(/GEMINI_API_KEY=["']?<([^>]+)>["']?/);
if (match) {
  console.log('Detected literal angle brackets < > around GEMINI_API_KEY in .env.local!');
  const cleanKey = match[1].trim();
  content = content.replace(/GEMINI_API_KEY=["']?<([^>]+)>["']?/, `GEMINI_API_KEY="${cleanKey}"`);
  fs.writeFileSync(envPath, content, 'utf-8');
  console.log('Cleaned angle brackets from GEMINI_API_KEY in .env.local!');
}

const key = process.env.GEMINI_API_KEY?.replace(/^<|>$/g, '').trim();
console.log('Cleaned key length:', key?.length);
console.log('Cleaned key starts with AIzaSy:', key?.startsWith('AIzaSy'));
