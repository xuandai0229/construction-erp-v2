import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function preflightCheck() {
  const { getAIProviderStatus } = await import('../src/lib/ai/provider/provider-mode');
  const { getAIProvider } = await import('../src/lib/ai/provider/provider-factory');

  const status = getAIProviderStatus();
  console.log('=== PHASE 1: PREFLIGHT STATUS ===');
  console.log('Provider Mode:', status.mode);
  console.log('Provider Name:', status.provider);
  console.log('Provider Available:', status.available);
  console.log('Remote Mode:', status.remote);
  console.log('Mock Mode:', status.mock);
  console.log('Blocked Reason:', status.blockedReason || 'NONE');

  const provider = getAIProvider();
  console.log('Provider Instance:', provider.name);
  console.log('Provider Configured Model:', (provider as any).configuredModel);
  console.log('Provider Configured Reasoning Effort:', (provider as any).configuredReasoningEffort);
  console.log('PREFLIGHT VERDICT:', status.available && status.remote && !status.mock ? 'PASS' : 'FAIL');
}

preflightCheck().catch(console.error);
