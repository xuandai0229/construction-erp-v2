import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function stepByStep() {
  const { default: prisma } = await import('../src/lib/prisma');
  const { executeDocumentChatTurn } = await import('../src/lib/ai/controller/document-chat-orchestrator');
  const { resolveAIRequestContext } = await import('../src/lib/ai/context/ai-context-resolver');

  const admin = await prisma.user.findFirstOrThrow({
    where: { role: 'ADMIN', isActive: true, email: 'daicongtu2910@gmail.com' },
    select: { id: true, role: true, email: true, name: true }
  });

  const context = await resolveAIRequestContext({
    explicitUser: { id: admin.id, role: admin.role, email: admin.email || undefined, name: admin.name }
  });

  console.log('Resolved Context projectScope:', context?.projectScope);

  const res = await executeDocumentChatTurn(context!, 'Hợp đồng nói gì về thời hạn hoàn thành của CT-2026-0009?');
  console.log('Result content:\n', res.content);
  console.log('Sources count:', res.sources.length);
  console.log('Quality flags:', res.qualityFlags);

  await prisma.$disconnect();
}

stepByStep().catch(console.error);
