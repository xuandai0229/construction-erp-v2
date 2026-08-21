import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function checkGeminiKey() {
  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  const googleApiKey = process.env.GOOGLE_API_KEY?.trim() || process.env.GOOGLE_AI_KEY?.trim();
  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  const provider = process.env.AI_PROVIDER || 'openai';
  const mode = process.env.AI_PROVIDER_MODE || 'NOT_SET';

  console.log('=== ENVIRONMENT KEYS STATUS ===');
  console.log('GEMINI_API_KEY present:', Boolean(geminiKey));
  console.log('GEMINI_API_KEY length:', geminiKey ? geminiKey.length : 0);
  console.log('GEMINI_API_KEY starts with AIzaSy:', geminiKey ? geminiKey.startsWith('AIzaSy') : false);
  console.log('GOOGLE_API_KEY present:', Boolean(googleApiKey));
  console.log('OPENAI_API_KEY present:', Boolean(openaiKey));
  console.log('AI_PROVIDER:', provider);
  console.log('AI_PROVIDER_MODE:', mode);
}

checkGeminiKey().catch(console.error);
