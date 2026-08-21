import { calculateAICapabilityCoverage, ERP_DOMAIN_INVENTORY } from '../src/lib/ai/capabilities/capability-catalog';

const coverage = calculateAICapabilityCoverage();

console.log('================================================================');
console.log('MILESTONE 02B CAPABILITY COVERAGE AUDIT');
console.log('================================================================');
console.log(`Total Domains: ${coverage.totalDomains}`);
console.log(`Max Possible Score: ${coverage.maxScore} (18 domains * 4 points)`);
console.log(`Implementation Score: ${coverage.implementation.totalScore} / ${coverage.maxScore} (${coverage.implementation.coveragePercentage}%)`);
console.log(`Operational Score: ${coverage.operational.totalScore} / ${coverage.maxScore} (${coverage.operational.coveragePercentage}%)`);
console.log('\nDomain Breakdown:');
for (const [d, info] of Object.entries(ERP_DOMAIN_INVENTORY)) {
  console.log(`  ${d.padEnd(25)}: Maturity = ${info.currentMaturity.padEnd(16)} | DataPopulated = ${info.isDataPopulated}`);
}
