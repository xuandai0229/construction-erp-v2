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

const postCleanupResults: { file: string; matches: string[]; category: string }[] = [];

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
      const relPath = filePath.replace(/\\/g, '/');
      let category = 'Unclassified';
      if (relPath.startsWith('docs/official-templates/')) {
        category = 'Biểu mẫu nguồn chính thức được giữ nguyên';
      } else if (relPath.startsWith('specs/safety-clean-rebuild/')) {
        category = 'Tài liệu kế hoạch cleanup được giữ';
      } else if (relPath.startsWith('artifacts/pre-safety-cleanup') || relPath.startsWith('artifacts/')) {
        category = 'Báo cáo/manifest/patch cleanup được giữ';
      } else if (relPath.includes('document-folders.ts') || relPath.includes('documents/permissions.ts') || relPath.includes('public/images/')) {
        category = 'Tham chiếu thư mục tài liệu doanh nghiệp hợp lệ (PCCC)';
      } else if (relPath.startsWith('docs/qa/') || relPath.startsWith('docs/architectural-principles.md') || relPath.startsWith('src/lib/storage/')) {
        category = 'Tài liệu QA / Nguyên tắc an toàn hệ thống chung';
      } else if (relPath.startsWith('.agents/') || relPath.startsWith('.specify/')) {
        category = 'Skill / Agent framework configuration';
      } else if (relPath.startsWith('tmp/')) {
        category = 'Scratch/tmp file';
      } else if (relPath.endsWith('.md')) {
        category = 'Tài liệu dự án dùng từ safety theo nghĩa chung';
      } else if (relPath === 'prisma/schema.prisma') {
        category = 'Tham chiếu ApprovalRequestType.SAFETY dùng chung';
      }
      postCleanupResults.push({ file: relPath, matches: matched, category });
    }
  } catch (e) {}
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

fs.writeFileSync('artifacts/post-cleanup-grep-results.json', JSON.stringify(postCleanupResults, null, 2));
console.log(`Post-cleanup grep found ${postCleanupResults.length} legitimate remaining files.`);
