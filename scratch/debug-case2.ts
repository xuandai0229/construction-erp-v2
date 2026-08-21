import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function debugCase2() {
  const { executeAIChatTurn } = await import('../src/lib/ai/controller/ai-chat-controller');
  const { default: prisma } = await import('../src/lib/prisma');

  const admin = await prisma.user.findFirstOrThrow({
    where: { email: 'daicongtu2910@gmail.com', isActive: true },
    select: { id: true, username: true, name: true, role: true, email: true, isActive: true },
  });
  const project = await prisma.project.findUniqueOrThrow({ where: { code: 'CT-2026-0009' } });

  console.log('Testing Case 2 in isolation...');
  try {
    const res = await executeAIChatTurn({
      messages: [{ role: 'user', content: 'Tóm tắt công trình đang mở.' }],
      activeProjectId: project.id,
      uiContext: { route: `/projects/${project.id}`, recordType: 'PROJECT', recordId: project.id },
      contextOptions: { explicitUser: admin },
    });

    console.log('Case 2 Status:', res.success);
    console.log('Case 2 Content:\n', res.content);
    console.log('Case 2 Error:\n', res.error);
  } catch (e: any) {
    console.error('Case 2 Caught Error:', e);
  }
}

debugCase2().catch(console.error);
