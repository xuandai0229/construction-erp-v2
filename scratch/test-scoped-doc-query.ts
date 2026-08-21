import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function testScopedDocQuery() {
  const { default: prisma } = await import('../src/lib/prisma');
  const { executeAIChatTurn } = await import('../src/lib/ai/controller/ai-chat-controller');

  const scopedCommander = await prisma.user.findFirstOrThrow({
    where: { username: 'NV-2026-0005' },
    select: { id: true, role: true, email: true, name: true }
  });

  const res = await executeAIChatTurn({
    messages: [{ role: 'user', content: 'Hợp đồng của công trình CT-2026-0009 quy định thời hạn thi công thế nào?' }],
    activeProjectId: null,
    contextOptions: { explicitUser: { id: scopedCommander.id, role: scopedCommander.role, email: scopedCommander.email || undefined, name: scopedCommander.name } }
  });

  console.log('Success:', res.success);
  console.log('Quality Flags:', res.qualityFlags);
  console.log('Content:\n', res.content);
  console.log('Sources Count:', res.sources.length);

  const leakDetected = res.sources.some(s => s.title.includes('CT-2026-0009') || s.title.includes('12/2025/HĐ-XD'));
  console.log('Unauthorized Document Leak:', leakDetected, '->', leakDetected ? 'FAIL ❌' : 'PASS ✅ (Zero Leakage)');

  await prisma.$disconnect();
}

testScopedDocQuery().catch(console.error);
