import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function testFastPath() {
  const { executeAIChatTurn } = await import('../src/lib/ai/controller/ai-chat-controller');
  const { default: prisma } = await import('../src/lib/prisma');

  const admin = await prisma.user.findFirstOrThrow({
    where: { email: 'daicongtu2910@gmail.com', isActive: true },
    select: { id: true, username: true, name: true, role: true, email: true, isActive: true },
  });

  console.log('Testing Fast Path for "Tôi đang phụ trách những công trình nào?"...');
  const start = Date.now();
  const res = await executeAIChatTurn({
    messages: [{ role: 'user', content: 'Tôi đang phụ trách những công trình nào?' }],
    uiContext: { route: '/dashboard', module: 'DASHBOARD' },
    contextOptions: { explicitUser: admin },
  });
  const latency = Date.now() - start;

  console.log('\nResult:');
  console.log('  Success:', res.success);
  console.log('  HTTP:', res.httpStatus);
  console.log('  Latency:', latency, 'ms (Telemetry durationMs:', res.telemetry.durationMs, 'ms)');
  console.log('  Model:', res.telemetry.model);
  console.log('  Prompt Tokens:', res.telemetry.promptTokens);
  console.log('  Completion Tokens:', res.telemetry.completionTokens);
  console.log('  Tools Executed:', res.toolCallsExecuted);
  console.log('  Sources Count:', res.sources.length);
  console.log('  Content:\n', res.content);

  await prisma.$disconnect();
}

testFastPath().catch(console.error);
