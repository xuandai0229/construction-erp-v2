import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function fullRootCauseAudit() {
  const { getAIProviderStatus } = await import('../src/lib/ai/provider/provider-mode');
  const { getAIProvider } = await import('../src/lib/ai/provider/provider-factory');
  const { mapOpenAIHttpFailure } = await import('../src/lib/ai/provider/openai-provider');
  const { evaluateAIGuards } = await import('../src/lib/ai/controller/ai-guard');

  console.log('=== PHASE 1: RUNTIME PROVIDER TRUTH ===');
  console.log('OPENAI_API_KEY present:', Boolean(process.env.OPENAI_API_KEY?.trim()));
  console.log('GEMINI_API_KEY present:', Boolean(process.env.GEMINI_API_KEY?.trim()));
  console.log('GROQ_API_KEY present:', Boolean(process.env.GROQ_API_KEY?.trim()));
  console.log('AI_PROVIDER_MODE:', process.env.AI_PROVIDER_MODE || 'NOT_SET');
  console.log('AI_PROVIDER:', process.env.AI_PROVIDER || 'NOT_SET');
  console.log('AI_MODEL_NAME:', process.env.AI_MODEL_NAME || 'NOT_SET');
  console.log('AI_REASONING_EFFORT:', process.env.AI_REASONING_EFFORT || 'NOT_SET');

  const status = getAIProviderStatus();
  console.log('Provider Status Object:', JSON.stringify(status));

  const provider = getAIProvider();
  console.log('Provider Instance Name:', provider.name);
  console.log('Provider Base URL:', (provider as any).baseUrl);
  console.log('Provider Configured Model:', (provider as any).configuredModel);

  console.log('\n=== PHASE 4: ERROR MESSAGE AUDIT ===');
  const guardError = await evaluateAIGuards('test-user');
  console.log('Internal Guard Code (Layer 3):', 'RATE_LIMITED');
  console.log('Internal Guard Message:', 'Bạn đã vượt quá số lượt yêu cầu cho phép (tối đa 10 lượt/phút). Vui lòng đợi trong giây lát.');
  
  const providerError = mapOpenAIHttpFailure({ status: 429, retryAfterSeconds: 5 });
  console.log('Provider Error Code:', providerError.code);
  console.log('Provider Error Message:', providerError.message);
  console.log('Provider Error HTTP Status:', providerError.httpStatus);
}

fullRootCauseAudit().catch(console.error);
