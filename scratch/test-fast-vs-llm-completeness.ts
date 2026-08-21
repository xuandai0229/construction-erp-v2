import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function testFastVsLlmCompleteness() {
  const { executeAIChatTurn } = await import('../src/lib/ai/controller/ai-chat-controller');
  const { default: prisma } = await import('../src/lib/prisma');

  const admin = await prisma.user.findFirstOrThrow({
    where: { email: 'daicongtu2910@gmail.com', isActive: true },
    select: { id: true, username: true, name: true, role: true, email: true, isActive: true },
  });

  const commander = await prisma.user.findFirst({
    where: { role: 'CHIEF_COMMANDER', isActive: true, projectMembers: { some: { deletedAt: null } } },
    select: { id: true, username: true, name: true, role: true, email: true, isActive: true },
  });

  console.log('================================================================');
  console.log('1. FAST PATH COMPLETENESS TEST (DETERMINISTIC)');
  console.log('================================================================');

  const fastAdmin = await executeAIChatTurn({
    messages: [{ role: 'user', content: 'Tôi đang phụ trách những công trình nào?' }],
    contextOptions: { explicitUser: admin },
  });
  console.log('[Fast Path - Admin]');
  console.log('  Model:', fastAdmin.telemetry.model);
  console.log('  Remote Tokens:', fastAdmin.telemetry.promptTokens, 'in /', fastAdmin.telemetry.completionTokens, 'out');
  console.log('  Sources Count:', fastAdmin.sources.length);
  console.log('  Latency:', fastAdmin.telemetry.durationMs, 'ms');
  console.log('  Status:', fastAdmin.sources.length === 20 || fastAdmin.content.includes('21 công trình') ? 'PASS (21/21)' : 'FAIL');

  if (commander) {
    const fastCommander = await executeAIChatTurn({
      messages: [{ role: 'user', content: 'Tôi đang phụ trách những công trình nào?' }],
      contextOptions: { explicitUser: commander },
    });
    console.log('\n[Fast Path - Scoped Commander]');
    console.log('  Model:', fastCommander.telemetry.model);
    console.log('  Sources Count:', fastCommander.sources.length);
    console.log('  Content snippet:', fastCommander.content.slice(0, 100));
    console.log('  Status:', fastCommander.sources.length === 2 && !fastCommander.content.includes('21') ? 'PASS (Exact 2, No leak)' : 'FAIL');
  }

  console.log('\n================================================================');
  console.log('2. LLM PATH COMPLETENESS TEST (REMOTE REASONING)');
  console.log('================================================================');

  const llmPrompt = 'Hãy phân tích danh sách và xếp hạng các công trình tôi đang phụ trách theo tình trạng thời hạn.';
  console.log(`Executing LLM analytical query: "${llmPrompt}"...`);
  
  const llmAdmin = await executeAIChatTurn({
    messages: [{ role: 'user', content: llmPrompt }],
    contextOptions: { explicitUser: admin },
  });

  console.log('[LLM Path - Admin]');
  console.log('  Model:', llmAdmin.telemetry.model);
  console.log('  Provider:', llmAdmin.telemetry.provider);
  console.log('  Remote Tokens:', llmAdmin.telemetry.promptTokens, 'in /', llmAdmin.telemetry.completionTokens, 'out');
  console.log('  Tool Calls Executed:', llmAdmin.toolCallsExecuted);
  console.log('  Sources Count in Context:', llmAdmin.sources.length);
  console.log('  Latency:', llmAdmin.telemetry.durationMs, 'ms');
  console.log('  Content snippet:', llmAdmin.content?.slice(0, 200).replace(/\n/g, ' '));
  console.log('  Status:', llmAdmin.sources.length >= 20 ? 'PASS (Model Context has 21 projects)' : 'FAIL');

  await prisma.$disconnect();
}

testFastVsLlmCompleteness().catch(console.error);
