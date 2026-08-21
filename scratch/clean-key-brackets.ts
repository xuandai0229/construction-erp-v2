import * as fs from 'fs';
import * as path from 'path';

const envPath = path.resolve('d:/construction-erp-v2/.env.local');
let content = fs.readFileSync(envPath, 'utf-8');

// Check if OPENAI_API_KEY has literal angle brackets < >
const match = content.match(/OPENAI_API_KEY=["']?<([^>]+)>["']?/);
if (match) {
  console.log('Detected literal angle brackets < > around the key in .env.local!');
  const cleanKey = match[1];
  console.log('Clean key starts with sk-:', cleanKey.startsWith('sk-'));
  console.log('Clean key starts with sk-proj-:', cleanKey.startsWith('sk-proj-'));
  
  // Replace in content
  content = content.replace(/OPENAI_API_KEY=["']?<([^>]+)>["']?/, `OPENAI_API_KEY="${cleanKey}"`);
  fs.writeFileSync(envPath, content, 'utf-8');
  console.log('Successfully stripped literal angle brackets from .env.local!');
} else {
  console.log('No literal angle brackets found.');
}
