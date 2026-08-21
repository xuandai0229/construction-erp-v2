import * as fs from 'fs';
import * as path from 'path';

const envPath = path.resolve('d:/construction-erp-v2/.env.local');
let content = fs.readFileSync(envPath, 'utf-8');

if (!content.includes('AI_MODEL_NAME=')) {
  content += '\nAI_MODEL_NAME="openai/gpt-oss-20b"';
} else {
  content = content.replace(/AI_MODEL_NAME=.*/, 'AI_MODEL_NAME="openai/gpt-oss-20b"');
}

fs.writeFileSync(envPath, content, 'utf-8');
console.log('Saved AI_MODEL_NAME="openai/gpt-oss-20b" to .env.local');
