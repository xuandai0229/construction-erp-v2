import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function diagnoseCase1And7() {
  const { executeAIChatTurn } = await import('../src/lib/ai/controller/ai-chat-controller');
  const { default: prisma } = await import('../src/lib/prisma');

  const admin = await prisma.user.findFirstOrThrow({
    where: { email: 'daicongtu2910@gmail.com', isActive: true },
    select: { id: true, username: true, name: true, role: true, email: true, isActive: true },
  });

  console.log('Testing Case 1 (PROJECT_LOOKUP)...');
  try {
    const res1 = await executeAIChatTurn({
      messages: [{ role: 'user', content: 'Tôi đang phụ trách những công trình nào?' }],
      uiContext: { route: '/dashboard', module: 'DASHBOARD' },
      contextOptions: { explicitUser: admin },
    });
    console.log('Case 1 Output:');
    console.log('  Success:', res1.success);
    console.log('  HTTP:', res1.httpStatus);
    console.log('  Content:\n', res1.content);
    console.log('  Tools:', res1.toolCallsExecuted);
    console.log('  Sources:', res1.sources.length);
  } catch (e: any) {
    console.error('Case 1 Caught Error:', e);
  }

  // Wait 3s
  await new Promise((r) => setTimeout(r, 3000));

  console.log('\nTesting Case 6 (DAILY_BRIEFING with backoff)...');
  try {
    const res6 = await executeAIChatTurn({
      messages: [{ role: 'user', content: 'Tình hình hôm nay thế nào?' }],
      uiContext: { route: '/dashboard', module: 'DASHBOARD' },
      contextOptions: { explicitUser: admin },
    });
    console.log('Case 6 Output:');
    console.log('  Success:', res6.success);
    console.log('  HTTP:', res6.httpStatus);
    console.log('  Content:\n', res6.content.slice(0, 300));
    console.log('  Tools:', res6.toolCallsExecuted);
  } catch (e: any) {
    console.error('Case 6 Caught Error:', e);
  }
}

diagnoseCase1And7().catch(console.error);
