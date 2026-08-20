import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
process.env.AI_PROVIDER_MODE = 'DEVELOPMENT_MOCK';

async function runDeepAIDialogTests() {
  const { executeAIChatTurn } = await import('../src/lib/ai/controller/ai-chat-controller');
  const { default: prisma } = await import('../src/lib/prisma');

  console.log('================================================================');
  console.log('STEP 6: DEEP AI DIALOG & EVIDENCE TRACE TEST (PILOT PROJECT CT-2026-0009)');
  console.log('================================================================\n');

  const admin = await prisma.user.findFirstOrThrow({
    where: { email: 'daicongtu2910@gmail.com', isActive: true },
    select: { id: true, username: true, name: true, role: true, email: true, isActive: true },
  });
  const project = await prisma.project.findUniqueOrThrow({ where: { code: 'CT-2026-0009' } });

  let conversationId: string | undefined;

  console.log('----------------------------------------------------------------');
  console.log('TURN 1: DAILY BRIEFING V2 ON CT-2026-0009');
  console.log('User: "Tình hình hôm nay của công trình CT-2026-0009 thế nào?"');
  console.log('----------------------------------------------------------------');

  const turn1 = await executeAIChatTurn({
    messages: [{ role: 'user', content: 'Tình hình hôm nay của công trình CT-2026-0009 thế nào?' }],
    activeProjectId: project.id,
    uiContext: { route: `/projects/${project.id}`, recordType: 'PROJECT', recordId: project.id },
    contextOptions: { explicitUser: admin },
    preferredProvider: 'mock',
  });

  conversationId = turn1.conversationId;
  console.log(`Success: ${turn1.success}`);
  console.log(`Tools executed: ${turn1.toolCallsExecuted}`);
  console.log(`Quality Flags: ${JSON.stringify(turn1.qualityFlags)}`);
  console.log(`Coverage Summary: ${turn1.coverageSummary}`);
  console.log(`Sources (${turn1.sources.length}):`);
  for (const s of turn1.sources) console.log(`  - [${s.sourceType}] ${s.title} -> ${s.route}`);
  console.log(`\nAI Response:\n${turn1.content}\n`);

  console.log('----------------------------------------------------------------');
  console.log('TURN 2: TRACE "VÌ SAO?" (REASONING & EVIDENCE CHAIN)');
  console.log('User: "Vì sao công trình CT-2026-0009 lại bị đánh giá là rủi ro và quá hạn?"');
  console.log('----------------------------------------------------------------');

  const turn2 = await executeAIChatTurn({
    conversationId,
    messages: [
      { role: 'user', content: 'Tình hình hôm nay của công trình CT-2026-0009 thế nào?' },
      { role: 'assistant', content: turn1.content },
      { role: 'user', content: 'Vì sao công trình CT-2026-0009 lại bị đánh giá là rủi ro và quá hạn?' },
    ],
    activeProjectId: project.id,
    uiContext: { route: `/projects/${project.id}`, recordType: 'PROJECT', recordId: project.id },
    contextOptions: { explicitUser: admin },
    preferredProvider: 'mock',
  });

  console.log(`Success: ${turn2.success}`);
  console.log(`Quality Flags: ${JSON.stringify(turn2.qualityFlags)}`);
  console.log(`Sources (${turn2.sources.length}):`);
  for (const s of turn2.sources) console.log(`  - [${s.sourceType}] ${s.title} -> ${s.route}`);
  console.log(`\nAI Response:\n${turn2.content}\n`);

  console.log('----------------------------------------------------------------');
  console.log('TURN 3: DRILL-DOWN "XEM KỸ HƠN PHẦN TIẾN ĐỘ"');
  console.log('User: "Cho tôi xem tiến độ công trình CT-2026-0009"');
  console.log('----------------------------------------------------------------');

  const turn3 = await executeAIChatTurn({
    conversationId,
    messages: [
      { role: 'user', content: 'Tình hình hôm nay của công trình CT-2026-0009 thế nào?' },
      { role: 'assistant', content: turn1.content },
      { role: 'user', content: 'Cho tôi xem tiến độ công trình CT-2026-0009' },
    ],
    activeProjectId: project.id,
    uiContext: { route: `/projects/${project.id}`, recordType: 'PROJECT', recordId: project.id },
    contextOptions: { explicitUser: admin },
    preferredProvider: 'mock',
  });

  console.log(`Success: ${turn3.success}`);
  console.log(`Sources (${turn3.sources.length}):`);
  for (const s of turn3.sources) console.log(`  - [${s.sourceType}] ${s.title} -> ${s.route}`);
  console.log(`\nAI Response:\n${turn3.content}\n`);

  console.log('----------------------------------------------------------------');
  console.log('TURN 4: TRUY VẤN "CÓ VẤN ĐỀ GÌ Ở HIỆN TRƯỜNG?"');
  console.log('User: "Báo cáo hiện trường gần nhất của CT-2026-0009 ghi nhận vấn đề gì?"');
  console.log('----------------------------------------------------------------');

  const turn4 = await executeAIChatTurn({
    conversationId,
    messages: [
      { role: 'user', content: 'Báo cáo hiện trường gần nhất của CT-2026-0009 ghi nhận vấn đề gì?' },
    ],
    activeProjectId: project.id,
    uiContext: { route: `/reports?projectId=${project.id}` },
    contextOptions: { explicitUser: admin },
    preferredProvider: 'mock',
  });

  console.log(`Success: ${turn4.success}`);
  console.log(`Sources (${turn4.sources.length}):`);
  for (const s of turn4.sources) console.log(`  - [${s.sourceType}] ${s.title} -> ${s.route}`);
  console.log(`\nAI Response:\n${turn4.content}\n`);

  await prisma['$disconnect']();
}

runDeepAIDialogTests().catch(console.error);
