import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function benchmarkPortfolioScale() {
  const { default: prisma } = await import('../src/lib/prisma');
  const { resolveAIRequestContext } = await import('../src/lib/ai/context/ai-context-resolver');
  const { evaluateAndRankPortfolio } = await import('../src/lib/ai/brain/portfolio-ranking-engine');
  const { calculateProjectDerivedMetrics } = await import('../src/lib/ai/brain/derived-metric-engine');
  const { assessDomainDataQuality, detectProgressConflicts } = await import('../src/lib/ai/brain/data-quality-engine');
  const { evaluateConstructionSignals } = await import('../src/lib/ai/brain/construction-signal-engine');

  const admin = await prisma.user.findFirstOrThrow({
    where: { email: 'daicongtu2910@gmail.com', isActive: true },
  });

  const context = (await resolveAIRequestContext({ explicitUser: admin }))!;

  console.log('================================================================');
  console.log('BENCHMARK 1: REAL 21-PROJECT PORTFOLIO EVALUATION');
  console.log('================================================================');

  const start21 = Date.now();
  const ranking21 = await evaluateAndRankPortfolio(context, 3);
  const latency21 = Date.now() - start21;

  console.log(`Evaluated ${ranking21.evaluatedProjectsCount} genuine projects in ${latency21} ms.`);
  console.log(`Top 1 Candidate: [${ranking21.topAttentionCandidates[0]?.projectCode}] Tier: ${ranking21.topAttentionCandidates[0]?.tier}`);

  console.log('\n================================================================');
  console.log('BENCHMARK 2: SIMULATED IN-MEMORY SCALE BENCHMARK (N=21, 100, 1000)');
  console.log('================================================================');

  function simulateSnapshotBuild(i: number, asOf = new Date()) {
    const isOverdue = i % 5 === 0;
    const isStale = i % 7 === 0;
    const hasLowStock = i % 9 === 0;

    const endDate = isOverdue
      ? new Date(asOf.getTime() - 25 * 86_400_000)
      : new Date(asOf.getTime() + 60 * 86_400_000);

    const derivedMetrics = calculateProjectDerivedMetrics(`SIM-${i}`, {
      asOf,
      endDate,
      actualProgressPercentage: 45.0,
      plannedProgressPercentage: 50.0,
      latestProgressDate: new Date(asOf.getTime() - (isStale ? 20 : 2) * 86_400_000),
      latestSiteReportDate: new Date(asOf.getTime() - (isStale ? 15 : 1) * 86_400_000),
      lowStockItemsCount: hasLowStock ? 3 : 0,
    });

    const qualityAssessments = {
      schedule: assessDomainDataQuality({ domain: 'SCHEDULE', recordCount: 1, asOf, freshnessThresholdDays: 30 }),
      progress: assessDomainDataQuality({ domain: 'PROGRESS', recordCount: 1, asOf, freshnessThresholdDays: 14 }),
      fieldActivity: assessDomainDataQuality({ domain: 'FIELD_ACTIVITY', recordCount: 1, asOf, freshnessThresholdDays: 7 }),
      materials: assessDomainDataQuality({ domain: 'MATERIAL_STOCK', recordCount: 5, asOf, freshnessThresholdDays: 14 }),
      pending: assessDomainDataQuality({ domain: 'PENDING_APPROVALS', recordCount: 0, asOf, freshnessThresholdDays: 7, isOperationalZeroAllowed: true }),
    };

    const conflicts = detectProgressConflicts(`SIM-${i}`, 45.0, 45.0, asOf);

    const signals = evaluateConstructionSignals({
      projectId: `sim-id-${i}`,
      projectCode: `SIM-${i}`,
      projectName: `Simulated Project #${i}`,
      derivedMetrics,
      qualityAssessments,
      conflicts,
      asOf,
    });

    return {
      projectId: `sim-id-${i}`,
      projectCode: `SIM-${i}`,
      projectName: `Simulated Project #${i}`,
      signals,
      qualityAssessments,
      derivedMetrics,
      conflicts,
    };
  }

  for (const N of [21, 100, 1000]) {
    const startSim = Date.now();
    const snapshots = [];
    for (let i = 1; i <= N; i++) {
      snapshots.push(simulateSnapshotBuild(i));
    }
    const duration = Date.now() - startSim;
    console.log(`[Scale Test N=${N.toString().padEnd(4)}] -> Generated ${N} 5-layer snapshots in ${duration.toString().padStart(3)} ms (~${(duration / N).toFixed(3)} ms/snapshot)`);
  }

  await prisma.$disconnect();
}

benchmarkPortfolioScale().catch(console.error);
