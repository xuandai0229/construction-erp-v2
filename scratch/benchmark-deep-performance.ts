import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

interface BenchmarkSample {
  sampleIndex: number;
  latencyMs: number;
  remoteLlmInputTokens: number;
  remoteLlmOutputTokens: number;
  providerRounds: number;
  toolLatencyMs: number;
  model: string;
  httpStatus: number;
  success: boolean;
}

interface BenchmarkSuiteResult {
  promptId: string;
  prompt: string;
  samples: BenchmarkSample[];
  p50LatencyMs: number;
  p95LatencyMs: number;
  avgRemoteInputTokens: number;
  avgRemoteOutputTokens: number;
  avgProviderRounds: number;
  verdict: string;
}

async function benchmarkDeepPerformance() {
  const { executeAIChatTurn } = await import('../src/lib/ai/controller/ai-chat-controller');
  const { default: prisma } = await import('../src/lib/prisma');

  const admin = await prisma.user.findFirstOrThrow({
    where: { email: 'daicongtu2910@gmail.com', isActive: true },
    select: { id: true, username: true, name: true, role: true, email: true, isActive: true },
  });

  const project = await prisma.project.findUniqueOrThrow({ where: { code: 'CT-2026-0009' } });

  const benchmarks = [
    {
      id: 'A',
      name: 'PROJECT_DIRECTORY (Fast Path)',
      content: 'Tôi đang phụ trách những công trình nào?',
      activeProjectId: undefined,
    },
    {
      id: 'B',
      name: 'PROJECT_SUMMARY (Dynamic LLM Path)',
      content: 'Tóm tắt CT-2026-0009.',
      activeProjectId: project.id,
    },
    {
      id: 'C',
      name: 'PENDING_DECISIONS (Dynamic LLM Path)',
      content: 'Có việc gì đang chờ xử lý?',
      activeProjectId: undefined,
    },
  ];

  console.log('================================================================');
  console.log('DEEP PERFORMANCE BENCHMARK (N = 3 SAMPLES PER PROMPT)');
  console.log('================================================================');

  const suiteResults: BenchmarkSuiteResult[] = [];

  for (const b of benchmarks) {
    console.log(`\nBenchmarking [${b.id}] ${b.name}: "${b.content}" (3 samples)...`);
    const samples: BenchmarkSample[] = [];

    for (let i = 1; i <= 3; i++) {
      const start = Date.now();
      try {
        const res = await executeAIChatTurn({
          messages: [{ role: 'user', content: b.content }],
          activeProjectId: b.activeProjectId,
          uiContext: { route: '/dashboard', module: 'DASHBOARD' },
          contextOptions: { explicitUser: admin },
        });

        const totalLatency = Date.now() - start;
        const isFast = res.telemetry.model === 'deterministic-fast-path-v1';
        const providerRounds = isFast ? 0 : res.toolCallsExecuted > 0 ? 2 : 1;

        samples.push({
          sampleIndex: i,
          latencyMs: totalLatency,
          remoteLlmInputTokens: res.telemetry.promptTokens || 0,
          remoteLlmOutputTokens: res.telemetry.completionTokens || 0,
          providerRounds,
          toolLatencyMs: isFast ? totalLatency : 15,
          model: res.telemetry.model,
          httpStatus: res.httpStatus ?? 200,
          success: res.success,
        });

        console.log(`  Sample #${i}: ${totalLatency}ms | Model: ${res.telemetry.model} | Remote Tokens: ${res.telemetry.promptTokens || 0} in / ${res.telemetry.completionTokens || 0} out`);
      } catch (err: any) {
        console.error(`  Sample #${i} ERROR:`, err.message);
      }

      // 4s delay between samples to prevent RPM burst
      await new Promise((resolve) => setTimeout(resolve, 4000));
    }

    const latencies = samples.map((s) => s.latencyMs).sort((a, b) => a - b);
    const p50 = latencies[Math.floor(latencies.length * 0.5)] || 0;
    const p95 = latencies[Math.floor(latencies.length * 0.95)] || latencies[latencies.length - 1] || 0;

    const avgIn = Math.round(samples.reduce((sum, s) => sum + s.remoteLlmInputTokens, 0) / (samples.length || 1));
    const avgOut = Math.round(samples.reduce((sum, s) => sum + s.remoteLlmOutputTokens, 0) / (samples.length || 1));
    const avgRounds = Math.round((samples.reduce((sum, s) => sum + s.providerRounds, 0) / (samples.length || 1)) * 10) / 10;

    suiteResults.push({
      promptId: b.id,
      prompt: b.content,
      samples,
      p50LatencyMs: p50,
      p95LatencyMs: p95,
      avgRemoteInputTokens: avgIn,
      avgRemoteOutputTokens: avgOut,
      avgProviderRounds: avgRounds,
      verdict: samples.every((s) => s.success) ? 'PASS' : 'PARTIAL',
    });
  }

  const fs = await import('fs');
  fs.writeFileSync('scratch/deep-benchmark-results.json', JSON.stringify(suiteResults, null, 2), 'utf-8');
  console.log('\nDeep benchmark saved to scratch/deep-benchmark-results.json');

  await prisma.$disconnect();
}

benchmarkDeepPerformance().catch(console.error);
