import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function testDqAndWhy() {
  const { executeAIChatTurn } = await import('../src/lib/ai/controller/ai-chat-controller');
  const { default: prisma } = await import('../src/lib/prisma');

  const adminUser = await prisma.user.findFirstOrThrow({
    where: { email: 'daicongtu2910@gmail.com', isActive: true },
  });

  const testProject = await prisma.project.findUniqueOrThrow({
    where: { code: 'CT-2026-0009' },
  });

  const res1 = await executeAIChatTurn({
    messages: [{ role: 'user', content: 'Dữ liệu nào của công trình này hiện chưa đủ?' }],
    activeProjectId: testProject.id,
    contextOptions: { explicitUser: adminUser },
  });

  console.log('--- Res 1: Data Gap Query ---');
  console.log('Success:', res1.success);
  console.log('Error:', res1.error);
  console.log('Content:', res1.content);
  console.log('Model:', res1.telemetry.model);

  const res2 = await executeAIChatTurn({
    messages: [{ role: 'user', content: 'Vì sao công trình này cần chú ý?' }],
    activeProjectId: testProject.id,
    contextOptions: { explicitUser: adminUser },
  });

  console.log('\n--- Res 2: Why Query ---');
  console.log('Success:', res2.success);
  console.log('Error:', res2.error);
  console.log('Content:', res2.content);
  console.log('Model:', res2.telemetry.model);

  await prisma.$disconnect();
}

testDqAndWhy().catch(console.error);
