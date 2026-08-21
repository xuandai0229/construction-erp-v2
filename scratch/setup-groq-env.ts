import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import * as fs from 'fs';
import * as path from 'path';

const envPath = path.resolve('d:/construction-erp-v2/.env.local');
let content = fs.readFileSync(envPath, 'utf-8');

// Ensure AI_PROVIDER="groq", AI_MODEL_NAME="openai/gpt-oss-120b", AI_PROVIDER_MODE="PILOT_REMOTE"
if (!content.includes('AI_PROVIDER=')) {
  content += '\nAI_PROVIDER="groq"';
} else {
  content = content.replace(/AI_PROVIDER=.*/, 'AI_PROVIDER="groq"');
}

if (!content.includes('AI_MODEL_NAME=')) {
  content += '\nAI_MODEL_NAME="openai/gpt-oss-120b"';
} else {
  content = content.replace(/AI_MODEL_NAME=.*/, 'AI_MODEL_NAME="openai/gpt-oss-120b"');
}

if (!content.includes('AI_PROVIDER_MODE=')) {
  content += '\nAI_PROVIDER_MODE="PILOT_REMOTE"';
} else {
  content = content.replace(/AI_PROVIDER_MODE=.*/, 'AI_PROVIDER_MODE="PILOT_REMOTE"');
}

fs.writeFileSync(envPath, content, 'utf-8');
console.log('Successfully configured .env.local for Groq / gpt-oss-120b!');
