import fs from 'fs';
import path from 'path';

const searchDirs = ['src', 'prisma', 'specs', 'docs', 'artifacts', 'scripts', 'tests', 'playwright', 'public'];
const keywords = [
  'safety', 'ATLĐ', 'ATLD', 'PCCC', 'VSMT', 'VSLĐ',
  'bao cao an toan', 'kế hoạch kiểm tra', 'báo cáo tự đánh giá',
  'SafetyInspection', 'SafetyWeeklyReport', 'SafetyChecklist',
  'SafetyFinding', 'SafetyCorrective', 'SafetyReinspection',
  'SafetyEvidence', 'SAFETY_COMPANY_V1', 'safety.plan', 'safety.report',
  'safety.session', 'safety.finding', 'safety.evidence'
];

const results: { file: string; matches: string[] }[] = [];

function searchFile(filePath: string) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const matched: string[] = [];
    for (const kw of keywords) {
      if (content.toLowerCase().includes(kw.toLowerCase())) {
        matched.push(kw);
      }
    }
    if (matched.length > 0) {
      results.push({ file: filePath.replace(/\\/g, '/'), matches: matched });
    }
  } catch (e) {
    // ignore binary or unreadable
  }
}

function traverse(dir: string) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== '.git' && entry.name !== '.next') {
        traverse(fullPath);
      }
    } else if (entry.isFile()) {
      searchFile(fullPath);
    }
  }
}

for (const d of searchDirs) {
  traverse(d);
}

fs.writeFileSync('artifacts/safety-search-inventory.json', JSON.stringify(results, null, 2));
console.log(`Found ${results.length} files matching safety keywords.`);
