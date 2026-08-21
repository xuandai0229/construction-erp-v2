import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function testDailyBriefingHybrid() {
  const { executeAIChatTurn } = await import('../src/lib/ai/controller/ai-chat-controller');
  const { default: prisma } = await import('../src/lib/prisma');

  const admin = await prisma.user.findFirstOrThrow({
    where: { email: 'daicongtu2910@gmail.com', isActive: true },
  });

  console.log('================================================================');
  console.log('TEST 1: FAST PATH — DETERMINISTIC BRIEFING');
  console.log('================================================================');

  const startFast = Date.now();
  const fastRes = await executeAIChatTurn({
    messages: [{ role: 'user', content: 'Tình hình hôm nay thế nào?' }],
    contextOptions: { explicitUser: admin },
  });
  const fastLatency = Date.now() - startFast;

  console.log(`Success: ${fastRes.success}`);
  console.log(`Latency: ${fastLatency} ms`);
  console.log(`Model: ${fastRes.telemetry.model}`);
  console.log(`Tokens: ${fastRes.telemetry.totalTokens}`);
  console.log(`Quality Flags: ${fastRes.qualityFlags.join(', ')}`);
  console.log('\nPreview:\n' + fastRes.content.slice(0, 300) + '...\n');

  console.log('================================================================');
  console.log('TEST 2: DEEP PATH — REMOTE LLM REASONING ON TOP-K EVIDENCE');
  console.log('================================================================');

  const startDeep = Date.now();
  const deepRes = await executeAIChatTurn({
    messages: [{ role: 'user', content: 'Phân tích sâu 3 vấn đề trên và đề xuất giải pháp chiến lược.' }],
    contextOptions: { explicitUser: admin },
  });
  const deepLatency = Date.now() - startDeep;

  console.log(`Success: ${deepRes.success}`);
  console.log(`Latency: ${deepLatency} ms`);
  console.log(`Provider: ${deepRes.telemetry.provider}`);
  console.log(`Model: ${deepRes.telemetry.model}`);
  console.log(`Tokens: ${deepRes.telemetry.totalTokens} (Prompt: ${deepRes.telemetry.promptTokens}, Completion: ${deepRes.telemetry.completionTokens})`);
  console.log(`Sources: ${deepRes.sources.length}`);
  console.log(`Quality Flags: ${deepRes.qualityFlags.join(', ')}`);
  console.log('\nDeep Analysis Preview:\n' + deepRes.content.slice(0, 450) + '...\n');

  await prisma.$disconnect();
}

testDailyBriefingHybrid().catch(console.error);
