import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function testDocumentChatE2E() {
  const { default: prisma } = await import('../src/lib/prisma');
  const { executeAIChatTurn } = await import('../src/lib/ai/controller/ai-chat-controller');

  console.log('================================================================');
  console.log('AI MILESTONE 02C: DOCUMENT INTELLIGENCE & RAG E2E TESTS');
  console.log('================================================================');

  const admin = await prisma.user.findFirstOrThrow({
    where: { role: 'ADMIN', isActive: true, email: 'daicongtu2910@gmail.com' },
    select: { id: true, role: true, email: true, name: true }
  });

  const scopedCommander = await prisma.user.findFirstOrThrow({
    where: { username: 'NV-2026-0005' },
    select: { id: true, role: true, email: true, name: true }
  });

  // TEST 1: Admin Contract QA with Addendum Precedence
  console.log('\n--- TEST 1: Admin Contract QA (Addendum Precedence) ---');
  const res1 = await executeAIChatTurn({
    messages: [{ role: 'user', content: 'Hợp đồng nói gì về thời hạn hoàn thành của CT-2026-0009?' }],
    activeProjectId: null,
    contextOptions: { explicitUser: { id: admin.id, role: admin.role, email: admin.email || undefined, name: admin.name } }
  });
  console.log('Success:', res1.success);
  console.log('Sources Count:', res1.sources.length);
  console.log('Content:\n', res1.content);

  // TEST 2: Admin ERP vs Contract Comparison (ERP_DOCUMENT_CONFLICT)
  console.log('\n--- TEST 2: Admin ERP vs Document Conflict Detection ---');
  const res2 = await executeAIChatTurn({
    messages: [{ role: 'user', content: 'So sánh thông tin trong ERP với hợp đồng của CT-2026-0009' }],
    activeProjectId: null,
    contextOptions: { explicitUser: { id: admin.id, role: admin.role, email: admin.email || undefined, name: admin.name } }
  });
  console.log('Success:', res2.success);
  console.log('Quality Flags:', res2.qualityFlags);
  console.log('Content:\n', res2.content);

  // TEST 3: Admin Method Statement Draft QA
  console.log('\n--- TEST 3: Admin Method Statement (Draft Labeling) ---');
  const res3 = await executeAIChatTurn({
    messages: [{ role: 'user', content: 'Biện pháp thi công phần móng và tầng hầm quy định thế nào?' }],
    activeProjectId: null,
    contextOptions: { explicitUser: { id: admin.id, role: admin.role, email: admin.email || undefined, name: admin.name } }
  });
  console.log('Success:', res3.success);
  console.log('Content:\n', res3.content);

  // TEST 4: Scoped Commander Cross-Project Security Gate
  console.log('\n--- TEST 4: Scoped Commander Cross-Project Security Gate ---');
  const res4 = await executeAIChatTurn({
    messages: [{ role: 'user', content: 'Cho tôi xem điều khoản hợp đồng của công trình CT-2026-0009' }],
    activeProjectId: null,
    contextOptions: { explicitUser: { id: scopedCommander.id, role: scopedCommander.role, email: scopedCommander.email || undefined, name: scopedCommander.name } }
  });
  console.log('Success:', res4.success);
  console.log('Quality Flags:', res4.qualityFlags);
  console.log('Content:\n', res4.content);
  console.log('Sources Count:', res4.sources.length);

  // HARD ASSERT for Test 4: Must not leak any CT-2026-0009 document
  const leakDetected = res4.sources.some(s => s.title.includes('CT-2026-0009') || s.title.includes('12/2025/HĐ-XD'));
  console.log('Unauthorized Document Leak:', leakDetected, '->', leakDetected ? 'FAIL ❌' : 'PASS ✅ (Zero Leakage)');

  await prisma.$disconnect();
}

testDocumentChatE2E().catch(console.error);
