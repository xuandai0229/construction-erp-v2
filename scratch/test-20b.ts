import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function testGptOss20b() {
  const { executeAIChatTurn } = await import('../src/lib/ai/controller/ai-chat-controller');
  const { default: prisma } = await import('../src/lib/prisma');

  process.env.AI_MODEL_NAME = 'openai/gpt-oss-20b';

  const admin = await prisma.user.findFirstOrThrow({
    where: { email: 'daicongtu2910@gmail.com', isActive: true },
    select: { id: true, username: true, name: true, role: true, email: true, isActive: true },
  });

  console.log('Testing Case 1 with openai/gpt-oss-20b...');
  const res = await executeAIChatTurn({
    messages: [{ role: 'user', content: 'Tôi đang phụ trách những công trình nào?' }],
    uiContext: { route: '/dashboard', module: 'DASHBOARD' },
    contextOptions: { explicitUser: admin },
  });

  console.log('Case 1 Output:');
  console.log('  Success:', res.success);
  console.log('  Content:\n', res.content);
  console.log('  Tools:', res.toolCallsExecuted);
  console.log('  Sources:', res.sources.length);
}

testGptOss20b().catch(console.error);
