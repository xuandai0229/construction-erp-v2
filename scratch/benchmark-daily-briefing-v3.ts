import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function benchmarkDailyBriefingV3() {
  const { executeAIChatTurn } = await import('../src/lib/ai/controller/ai-chat-controller');
  const { default: prisma } = await import('../src/lib/prisma');

  const admin = await prisma.user.findFirstOrThrow({
    where: { email: 'daicongtu2910@gmail.com', isActive: true },
    select: { id: true, username: true, name: true, role: true, email: true, isActive: true },
  });

  console.log('================================================================');
  console.log('BENCHMARK DAILY BRIEFING V3 (PROJECT BRAIN PRE-RANKING)');
  console.log('================================================================');

  const samples: number[] = [];

  for (let i = 1; i <= 3; i++) {
    const start = Date.now();
    const res = await executeAIChatTurn({
      messages: [{ role: 'user', content: 'Tình hình hôm nay thế nào?' }],
      contextOptions: { explicitUser: admin },
    });
    const latency = Date.now() - start;
    samples.push(latency);

    console.log(`Sample #${i}: ${latency} ms | Model: ${res.telemetry.model} | Sources: ${res.sources.length}`);
    if (i === 1) {
      console.log('\n--- Sample #1 Content Preview ---');
      console.log(res.content.slice(0, 400));
      console.log('--------------------------------\n');
    }
  }

  samples.sort((a, b) => a - b);
  const p50 = samples[Math.floor(samples.length * 0.5)];
  const p95 = samples[samples.length - 1];

  console.log(`\n=== DAILY BRIEFING V3 PERFORMANCE SUMMARY ===`);
  console.log(`P50 Latency: ${p50} ms`);
  console.log(`P95 Latency: ${p95} ms`);
  console.log(`Previous Baseline: 21,686 ms`);
  console.log(`Speedup: ${((21686 - p50) / 21686 * 100).toFixed(1)}% faster!`);

  await prisma.$disconnect();
}

benchmarkDailyBriefingV3().catch(console.error);
