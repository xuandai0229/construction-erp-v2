import { calculateAICapabilityCoverage, ERP_DOMAIN_INVENTORY } from '../src/lib/ai/capabilities/capability-catalog';

const coverage = calculateAICapabilityCoverage();

console.log('================================================================');
console.log('3-TIER COVERAGE METRICS V2 CERTIFICATION');
console.log('================================================================');

// Tier 1: Capability Implementation Coverage (Architecture score across 18 domains)
const implScore = coverage.implementation.totalScore;
const maxScore = coverage.maxScore; // 72
const implPercentage = ((implScore / maxScore) * 100).toFixed(1);

// Tier 2: Real Data Coverage (Domains with populated data / total domains)
const totalDomains = 18;
const populatedDomains = Object.values(ERP_DOMAIN_INVENTORY).filter(d => d.isDataPopulated).length;
const realDataPercentage = ((populatedDomains / totalDomains) * 100).toFixed(1);

// Tier 3: Construction Operational Intelligence Coverage
// Excludes administrative domains (SYSTEM_SETTINGS, AUDIT_TRAIL, HR_ORGANIZATION)
const nonConstructionDomains = ['SYSTEM_SETTINGS', 'AUDIT_TRAIL', 'HR_ORGANIZATION'];
const constructionDomains = Object.entries(ERP_DOMAIN_INVENTORY).filter(([key]) => !nonConstructionDomains.includes(key));
const constructionMaxScore = constructionDomains.length * 4; // 15 * 4 = 60
const constructionOpScore = constructionDomains
  .filter(([_, d]) => d.isDataPopulated)
  .reduce((sum, [_, d]) => {
    const pts = d.currentMaturity === 'DECISION_SUPPORT' ? 4 : d.currentMaturity === 'ANALYSIS' ? 3 : d.currentMaturity === 'SUMMARY' ? 2 : d.currentMaturity === 'LOOKUP' ? 1 : 0;
    return sum + pts;
  }, 0);
const constructionOpPercentage = ((constructionOpScore / constructionMaxScore) * 100).toFixed(1);

console.log(`1. CAPABILITY_IMPLEMENTATION_COVERAGE:             ${implScore} / ${maxScore} (${implPercentage}%)`);
console.log(`2. REAL_DATA_COVERAGE:                             ${populatedDomains} / ${totalDomains} (${realDataPercentage}%)`);
console.log(`3. CONSTRUCTION_OPERATIONAL_INTELLIGENCE_COVERAGE: ${constructionOpScore} / ${constructionMaxScore} (${constructionOpPercentage}%)`);

console.log('\nBreakdown of Construction Operational Intelligence:');
for (const [key, d] of constructionDomains) {
  console.log(`  ${key.padEnd(25)}: Populated = ${d.isDataPopulated.toString().padEnd(5)} | Maturity = ${d.currentMaturity}`);
}
