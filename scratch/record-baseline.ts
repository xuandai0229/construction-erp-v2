import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

interface BaselineResult {
  promptId: string;
  prompt: string;
  success: boolean;
  httpStatus: number;
  traceId: string;
  latencyMs: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  toolCallsExecuted: number;
  sourcesCount: number;
  contentLength: number;
  snippet: string;
}

async function runBaseline() {
  const { executeAIChatTurn } = await import('../src/lib/ai/controller/ai-chat-controller');
  const { default: prisma } = await import('../src/lib/prisma');

  const admin = await prisma.user.findFirstOrThrow({
    where: { email: 'daicongtu2910@gmail.com', isActive: true },
    select: { id: true, username: true, name: true, role: true, email: true, isActive: true },
  });

  const project = await prisma.project.findUniqueOrThrow({ where: { code: 'CT-2026-0009' } });

  const testPrompts = [
    {
      id: 'A',
      name: 'PROJECT_DIRECTORY',
      content: 'Tôi đang phụ trách những công trình nào?',
      activeProjectId: undefined,
    },
    {
      id: 'B',
      name: 'PROJECT_SUMMARY',
      content: 'Tóm tắt CT-2026-0009.',
      activeProjectId: project.id,
    },
    {
      id: 'C',
      name: 'DAILY_BRIEFING',
      content: 'Tình hình hôm nay thế nào?',
      activeProjectId: undefined,
    },
    {
      id: 'D',
      name: 'RECENT_REPORTS',
      content: 'Báo cáo hiện trường gần nhất của CT-2026-0009?',
      activeProjectId: project.id,
    },
    {
      id: 'E',
      name: 'PENDING_DECISIONS',
      content: 'Có việc gì đang chờ xử lý?',
      activeProjectId: undefined,
    },
  ];

  console.log('================================================================');
  console.log('PHASE 0: RECORDING BASELINE METRICS (5 PROMPTS)');
  console.log('================================================================');

  const results: BaselineResult[] = [];

  for (const p of testPrompts) {
    console.log(`\nExecuting Prompt [${p.id}] ${p.name}: "${p.content}"...`);
    const startTime = Date.now();
    try {
      const res = await executeAIChatTurn({
        messages: [{ role: 'user', content: p.content }],
        activeProjectId: p.activeProjectId,
        uiContext: { route: '/dashboard', module: 'DASHBOARD' },
        contextOptions: { explicitUser: admin },
      });

      const latency = Date.now() - startTime;
      const resultItem: BaselineResult = {
        promptId: p.id,
        prompt: p.content,
        success: res.success,
        httpStatus: res.httpStatus ?? 200,
        traceId: res.traceId,
        latencyMs: latency,
        promptTokens: res.telemetry.promptTokens,
        completionTokens: res.telemetry.completionTokens,
        totalTokens: (res.telemetry.promptTokens || 0) + (res.telemetry.completionTokens || 0),
        toolCallsExecuted: res.toolCallsExecuted,
        sourcesCount: res.sources.length,
        contentLength: res.content?.length || 0,
        snippet: res.content?.slice(0, 180) || '',
      };
      results.push(resultItem);

      console.log(`  -> Status: ${res.success ? 'PASS' : 'FAIL'} | HTTP: ${resultItem.httpStatus}`);
      console.log(`  -> Latency: ${latency}ms | Tokens: ${resultItem.promptTokens} in / ${resultItem.completionTokens} out`);
      console.log(`  -> Tools: ${res.toolCallsExecuted} | Sources: ${res.sources.length}`);
      console.log(`  -> Snippet: ${resultItem.snippet.replace(/\n/g, ' ')}...`);
    } catch (err: any) {
      console.error(`  -> ERROR on ${p.name}:`, err.message);
    }

    // Small delay to respect rate limit
    await new Promise((resolve) => setTimeout(resolve, 3500));
  }

  const fs = await import('fs');
  fs.writeFileSync(
    'scratch/baseline-metrics.json',
    JSON.stringify(results, null, 2),
    'utf-8'
  );
  console.log('\nBaseline saved to scratch/baseline-metrics.json');

  await prisma.$disconnect();
}

runBaseline().catch(console.error);
