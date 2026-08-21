import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function verifyCoverageCalculation() {
  const { calculateAICapabilityCoverage } = await import('../src/lib/ai/capabilities/capability-catalog');

  const coverage = calculateAICapabilityCoverage();
  console.log('=== COVERAGE RECONCILIATION RESULT ===');
  console.log('Total Domains:', coverage.totalDomains);
  console.log('Max Score:', coverage.maxScore);
  console.log('\n1. Implementation Coverage:');
  console.log('  Active Implemented Domains:', coverage.implementation.activeDomainsCount);
  console.log('  Total Score:', coverage.implementation.totalScore, '/ 72');
  console.log('  Percentage:', coverage.implementation.coveragePercentage, '%');
  console.log('  Maturity Counts:', coverage.implementation.maturityCounts);

  console.log('\n2. Operational Coverage (Populated Data + Code):');
  console.log('  Active Populated Domains:', coverage.operational.activePopulatedDomainsCount);
  console.log('  Total Score:', coverage.operational.totalScore, '/ 72');
  console.log('  Percentage:', coverage.operational.coveragePercentage, '%');
  console.log('  Maturity Counts:', coverage.operational.maturityCounts);
}

verifyCoverageCalculation().catch(console.error);
