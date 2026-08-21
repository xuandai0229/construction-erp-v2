import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function checkAllEnvKeys() {
  const openaiKey = process.env.OPENAI_API_KEY?.replace(/^<|>$/g, '').trim();
  const geminiKey = process.env.GEMINI_API_KEY?.replace(/^<|>$/g, '').trim();
  const groqKey = process.env.GROQ_API_KEY?.replace(/^<|>$/g, '').trim();
  const provider = process.env.AI_PROVIDER || 'openai';
  const mode = process.env.AI_PROVIDER_MODE || 'NOT_SET';
  const model = process.env.AI_MODEL_NAME || 'NOT_SET';

  console.log('=== ENVIRONMENT CHECK ===');
  console.log('OPENAI_API_KEY present:', Boolean(openaiKey), '| length:', openaiKey ? openaiKey.length : 0);
  console.log('GROQ_API_KEY present:', Boolean(groqKey), '| length:', groqKey ? groqKey.length : 0);
  console.log('GEMINI_API_KEY present:', Boolean(geminiKey), '| length:', geminiKey ? geminiKey.length : 0);
  console.log('AI_PROVIDER:', provider);
  console.log('AI_PROVIDER_MODE:', mode);
  console.log('AI_MODEL_NAME:', model);
}

checkAllEnvKeys().catch(console.error);
