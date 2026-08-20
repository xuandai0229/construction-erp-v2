import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

async function checkOpenAIEnvStatus() {
  const hasKey = Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim().length > 0);
  const keyLength = process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.trim().length : 0;
  const configuredModel = process.env.AI_MODEL_NAME || 'NOT_SET (defaults to gpt-4o-mini)';
  const providerMode = process.env.AI_PROVIDER_MODE || 'NOT_SET';

  console.log('=== OPENAI ENVIRONMENT STATUS AUDIT ===');
  console.log(`OPENAI_API_KEY present: ${hasKey}`);
  console.log(`Key character length: ${keyLength}`);
  console.log(`Configured AI_MODEL_NAME: ${configuredModel}`);
  console.log(`Configured AI_PROVIDER_MODE: ${providerMode}`);
}

checkOpenAIEnvStatus().catch(console.error);
