import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function verifyRuntimeTruth() {
  const { getAIProviderStatus } = await import('../src/lib/ai/provider/provider-mode');
  const { getAIProvider } = await import('../src/lib/ai/provider/provider-factory');
  const { executeAIChatTurn } = await import('../src/lib/ai/controller/ai-chat-controller');
  const { evaluateAIGuards, resetAIGuardRateLimits } = await import('../src/lib/ai/controller/ai-guard');
  const { mapGroqHttpFailure } = await import('../src/lib/ai/provider/groq-provider');
  const { default: prisma } = await import('../src/lib/prisma');

  console.log('================================================================');
  console.log('1. SERVER RUNTIME PROVIDER STATUS');
  console.log('================================================================');
  const status = getAIProviderStatus();
  console.log('Status:', JSON.stringify(status, null, 2));

  const provider = getAIProvider();
  console.log('Provider Class:', provider.constructor.name);
  console.log('Provider Name:', provider.name);
  console.log('Configured Model:', (provider as any).configuredModel);

  console.log('\n================================================================');
  console.log('2. PHASE 9: SINGLE GROQ REMOTE SMOKE (Low-cost Request)');
  console.log('================================================================');
  const admin = await prisma.user.findFirstOrThrow({
    where: { email: 'daicongtu2910@gmail.com', isActive: true },
    select: { id: true, username: true, name: true, role: true, email: true, isActive: true },
  });

  const res1 = await executeAIChatTurn({
    messages: [{ role: 'user', content: 'Tôi đang phụ trách những công trình nào?' }],
    uiContext: { route: '/dashboard', module: 'DASHBOARD' },
    contextOptions: { explicitUser: admin },
  });

  console.log('TraceId:', res1.traceId);
  console.log('Provider:', res1.providerStatus.provider);
  console.log('Configured Model:', res1.providerStatus.configuredModel);
  console.log('Remote:', res1.providerStatus.remote);
  console.log('Mock:', res1.providerStatus.mock);
  console.log('HTTP Status:', res1.httpStatus ?? 200);
  console.log('Success:', res1.success);
  console.log('Latency:', res1.telemetry.durationMs, 'ms');
  console.log('Tools Executed:', res1.toolCallsExecuted);
  console.log('Tokens:', res1.telemetry.promptTokens, 'prompt /', res1.telemetry.completionTokens, 'completion');
  console.log('Content Snippet:\n', res1.content?.slice(0, 300) + '...');

  // Rate limiting cooldown
  await new Promise((resolve) => setTimeout(resolve, 4000));

  console.log('\n================================================================');
  console.log('3. PHASE 10: DAILY BRIEFING SMOKE (Business Data Integrity)');
  console.log('================================================================');
  const res2 = await executeAIChatTurn({
    messages: [{ role: 'user', content: 'Tình hình hôm nay thế nào?' }],
    uiContext: { route: '/dashboard', module: 'DASHBOARD' },
    contextOptions: { explicitUser: admin },
  });

  console.log('TraceId:', res2.traceId);
  console.log('Provider:', res2.providerStatus.provider);
  console.log('HTTP Status:', res2.httpStatus ?? 200);
  console.log('Success:', res2.success);
  console.log('Latency:', res2.telemetry.durationMs, 'ms');
  console.log('Tools Executed:', res2.toolCallsExecuted);
  console.log('Content Snippet:\n', res2.content?.slice(0, 300) + '...');

  console.log('\n================================================================');
  console.log('4. PHASE 11: INTERNAL APP RATE LIMIT TEST (10 req/min)');
  console.log('================================================================');
  resetAIGuardRateLimits();
  const testUserId = 'test_user_rate_limit';
  for (let i = 0; i < 10; i++) {
    const guard = await evaluateAIGuards(testUserId);
    if (!guard.allowed) console.error(`Unexpected block at request ${i + 1}`);
  }
  const blockedGuard = await evaluateAIGuards(testUserId);
  console.log('11th Request Allowed:', blockedGuard.allowed);
  console.log('11th Request Code:', blockedGuard.code);
  console.log('11th Request Message:', blockedGuard.message);
  console.log('11th Request Retry-After:', blockedGuard.retryAfterSeconds);

  console.log('\n================================================================');
  console.log('5. ERROR TAXONOMY DISCRIMINATION AUDIT');
  console.log('================================================================');
  const billingErr = mapGroqHttpFailure({
    status: 429,
    data: { error: { code: 'billing_not_active', message: 'Billing not active' } },
  });
  console.log('billing_not_active -> Code:', billingErr.code, '| Message:', billingErr.message);

  const quotaErr = mapGroqHttpFailure({
    status: 429,
    data: { error: { code: 'insufficient_quota', message: 'Quota exceeded' } },
  });
  console.log('insufficient_quota -> Code:', quotaErr.code, '| Message:', quotaErr.message);

  const rateLimitErr = mapGroqHttpFailure({
    status: 429,
    retryAfterSeconds: 8,
  });
  console.log('true 429 -> Code:', rateLimitErr.code, '| Message:', rateLimitErr.message);

  await prisma.$disconnect();
}

verifyRuntimeTruth().catch(console.error);
