import fs from 'fs';
import path from 'path';

interface AuditIssue {
  file: string;
  line: number;
  ruleId: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  category: string;
  snippet: string;
  message: string;
}

interface ModuleAuditSummary {
  moduleName: string;
  totalFiles: number;
  realDataCount: number;
  derivedDataCount: number;
  hardcodedCount: number;
  mockCount: number;
  unknownSourceCount: number;
  status: 'PASS' | 'PASS_WITH_CONDITIONS' | 'FAIL';
}

const ROOT_DIR = process.cwd();
const SRC_DIR = path.join(ROOT_DIR, 'src');

const ISSUES: AuditIssue[] = [];

// Helper to recursively collect files
function getFiles(dir: string, fileList: string[] = []): string[] {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      if (file !== 'node_modules' && file !== '.next' && file !== '.git') {
        getFiles(filePath, fileList);
      }
    } else {
      if (/\.(tsx?|jsx?|prisma|json)$/.test(file)) {
        fileList.push(filePath);
      }
    }
  }
  return fileList;
}

// Rules scanning logic
function auditFile(filePath: string) {
  const relativePath = path.relative(ROOT_DIR, filePath).replace(/\\/g, '/');
  const isTest = relativePath.includes('/tests/') || relativePath.includes('/__tests__/') || relativePath.endsWith('.test.ts') || relativePath.endsWith('.spec.ts');
  const isProd = relativePath.startsWith('src/') && !isTest;
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  lines.forEach((line, index) => {
    const lineNum = index + 1;
    const trimmed = line.trim();

    // Skip pure comments or blank lines
    if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) return;

    // Rule 1: Mock/Fake/Demo Imports or References in Production
    if (isProd && (
      /from\s+['"].*mock.*['"]/i.test(trimmed) ||
      /from\s+['"].*fixture.*['"]/i.test(trimmed) ||
      /from\s+['"].*dummy.*['"]/i.test(trimmed) ||
      /import.*faker/i.test(trimmed)
    )) {
      ISSUES.push({
        file: relativePath,
        line: lineNum,
        ruleId: 'RULE_MOCK_IMPORT',
        severity: 'CRITICAL',
        category: 'Mock in Prod',
        snippet: trimmed,
        message: 'Importing mock/fixture/faker in production code bundle'
      });
    }

    // Rule 2: Fallback Demo Data in Catch / Fallback logic
    if (isProd && (
      /if\s*\(!.*?\)\s*return\s*.*(demo|mock|sample)/i.test(trimmed) ||
      /catch.*{\s*return\s*.*(demo|mock|sample)/i.test(trimmed)
    )) {
      ISSUES.push({
        file: relativePath,
        line: lineNum,
        ruleId: 'RULE_FALLBACK_DEMO',
        severity: 'CRITICAL',
        category: 'Demo Fallback',
        snippet: trimmed,
        message: 'Falling back to demo/mock data when real data is missing or query fails'
      });
    }

    // Rule 3: Math.random() generating UI data or progress
    if (isProd && /Math\.random\(\)/.test(trimmed) && !relativePath.includes('test') && !relativePath.includes('crypto')) {
      ISSUES.push({
        file: relativePath,
        line: lineNum,
        ruleId: 'RULE_MATH_RANDOM',
        severity: 'HIGH',
        category: 'Random Data',
        snippet: trimmed,
        message: 'Using Math.random() in production code'
      });
    }

    // Rule 4: Hardcoded percent or literal progress numbers in UI
    if (isProd && relativePath.endsWith('.tsx') && /progress\s*=\s*{\s*\d+\s*}/.test(trimmed)) {
      ISSUES.push({
        file: relativePath,
        line: lineNum,
        ruleId: 'RULE_HARDCODED_PROGRESS',
        severity: 'MEDIUM',
        category: 'Hardcoded Value',
        snippet: trimmed,
        message: 'Hardcoded progress percentage prop in TSX component'
      });
    }

    // Rule 5: Catch block returning 0 as silent fallback when query fails
    if (isProd && /catch\s*.*{\s*return\s*(0|\{.*:\s*0\s*\}|\[\])\s*;?\s*}/.test(trimmed) && !trimmed.includes('// intentional')) {
      // Flag for review to ensure error state is properly surfaced
      ISSUES.push({
        file: relativePath,
        line: lineNum,
        ruleId: 'RULE_SILENT_CATCH_FALLBACK',
        severity: 'LOW',
        category: 'Error Fallback',
        snippet: trimmed,
        message: 'Returning empty/0 in catch block without propagating error state or handling gracefully'
      });
    }

    // Rule 6: Count after slice / take
    if (isProd && /\.slice\([^)]+\)\.length/.test(trimmed)) {
      ISSUES.push({
        file: relativePath,
        line: lineNum,
        ruleId: 'RULE_COUNT_AFTER_SLICE',
        severity: 'HIGH',
        category: 'Misleading Metric',
        snippet: trimmed,
        message: 'Calculating length/count after .slice(), which distorts actual total'
      });
    }

    // Rule 7: Unscoped Prisma queries for project-dependent models
    if (isProd && (relativePath.includes('/lib/') || relativePath.includes('/actions/')) &&
      /prisma\.(siteReport|materialRequest|dailyLog|projectTask|weeklyPlan|acceptanceDossier)\.findMany/.test(trimmed)
    ) {
      if (!content.includes('projectId') && !trimmed.includes('projectId')) {
        ISSUES.push({
          file: relativePath,
          line: lineNum,
          ruleId: 'RULE_POTENTIAL_UNSCOPED_QUERY',
          severity: 'HIGH',
          category: 'RBAC & Scope',
          snippet: trimmed,
          message: 'Prisma query on project-scoped model without explicit projectId filtering in visible scope'
        });
      }
    }
  });
}

function runAudit() {
  console.log('=== FULL SYSTEM REAL DATA AUDIT RUNNER ===');
  console.log(`Scanning src directory: ${SRC_DIR}`);
  
  const allFiles = getFiles(SRC_DIR);
  console.log(`Found ${allFiles.length} files to scan.\n`);

  allFiles.forEach(file => auditFile(file));

  console.log(`Audit Complete! Total Issues Found: ${ISSUES.length}`);
  
  const criticalCount = ISSUES.filter(i => i.severity === 'CRITICAL').length;
  const highCount = ISSUES.filter(i => i.severity === 'HIGH').length;
  const mediumCount = ISSUES.filter(i => i.severity === 'MEDIUM').length;
  const lowCount = ISSUES.filter(i => i.severity === 'LOW').length;

  console.log(`- CRITICAL: ${criticalCount}`);
  console.log(`- HIGH: ${highCount}`);
  console.log(`- MEDIUM: ${mediumCount}`);
  console.log(`- LOW: ${lowCount}`);

  // Write JSON report
  const outputDir = path.join(ROOT_DIR, 'docs', 'qa');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const jsonReportPath = path.join(outputDir, 'FULL_SYSTEM_REAL_DATA_AUDIT_REPORT.json');
  fs.writeFileSync(jsonReportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    scannedFilesCount: allFiles.length,
    summary: { criticalCount, highCount, mediumCount, lowCount, totalCount: ISSUES.length },
    issues: ISSUES
  }, null, 2));

  console.log(`\nDetailed report written to: ${jsonReportPath}`);
}

runAudit();
