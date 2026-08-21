import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function testCase7() {
  const { executeAIChatTurn } = await import('../src/lib/ai/controller/ai-chat-controller');
  const { default: prisma } = await import('../src/lib/prisma');

  const admin = await prisma.user.findFirstOrThrow({
    where: { email: 'daicongtu2910@gmail.com', isActive: true },
    select: { id: true, username: true, name: true, role: true, email: true, isActive: true },
  });

  console.log('Testing Case 7 (MULTI_TOOL)...');
  const res = await executeAIChatTurn({
    messages: [{ role: 'user', content: 'Hãy xem các công trình trong phạm vi của tôi, chọn công trình đáng chú ý nhất, giải thích bằng dữ liệu và cho tôi ba việc nên kiểm tra.' }],
    uiContext: { route: '/dashboard', module: 'DASHBOARD' },
    contextOptions: { explicitUser: admin },
  });

  console.log('Case 7 Result:');
  console.log('  Success:', res.success);
  console.log('  HTTP:', res.httpStatus);
  console.log('  Content:\n', res.content);
  console.log('  Tools Executed:', res.toolCallsExecuted);
  console.log('  Sources:', res.sources.length);
}

testCase7().catch(console.error);
