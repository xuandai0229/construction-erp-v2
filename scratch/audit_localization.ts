import fs from 'fs';
import path from 'path';

const ENGLISH_WORDS = [
  'workspace', 'dashboard', 'project', 'projects', 'report', 'reports', 'filter', 'search',
  'save', 'submit', 'cancel', 'delete', 'edit', 'view', 'preview', 'print', 'export', 'import',
  'upload', 'download', 'loading', 'error', 'retry', 'status', 'draft', 'pending', 'approved',
  'rejected', 'version', 'user', 'users', 'role', 'roles', 'settings', 'profile', 'logout',
  'login', 'next', 'previous', 'page', 'pages', 'items', 'total', 'empty', 'select', 'create',
  'update', 'detail', 'details', 'action', 'actions', 'more', 'open', 'close', 'confirm',
  'reset', 'clear', 'apply', 'active', 'inactive', 'online', 'offline', 'file', 'files',
  'folder', 'folders', 'image', 'images', 'document', 'documents', 'attachment', 'attachments',
  'description', 'title', 'name', 'date', 'time', 'week', 'month', 'year'
];

const UNACCENTED_VIETNAMESE = [
  'bao cao', 'cong trinh', 'tai lieu', 'giam sat', 'phe duyet', 'nguoi tao', 'cap nhat',
  'chua co du lieu', 'thu lai', 'xoa bo loc'
];

const MIXED_STRINGS = [
  'truy cập workspace', 'truy cap workspace', 'tạo report', 'filter theo', 'save nháp',
  'upload tài liệu', 'download file', 'user hiện tại', 'project đang chọn', 'loading dữ liệu',
  'retry lại', 'version mới', 'status hồ sơ'
];

interface AuditMatch {
  filePath: string;
  lineNum: number;
  snippet: string;
  matchedTerm: string;
}

function scanFile(filePath: string): AuditMatch[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const matches: AuditMatch[] = [];

  lines.forEach((line, index) => {
    // Ignore imports, comments, css classes, prisma fields, console.log
    const trimmed = line.trim();
    if (
      trimmed.startsWith('import ') ||
      trimmed.startsWith('//') ||
      trimmed.startsWith('/*') ||
      trimmed.startsWith('*') ||
      trimmed.includes('className=') ||
      trimmed.includes('console.log') ||
      trimmed.includes('console.error')
    ) {
      return;
    }

    const lineLower = line.toLowerCase();

    // Check mixed strings first
    for (const m of MIXED_STRINGS) {
      if (lineLower.includes(m)) {
        matches.push({
          filePath,
          lineNum: index + 1,
          snippet: line.trim(),
          matchedTerm: m
        });
        return;
      }
    }

    // Check English words in user facing context (JSX string literals, placeholders, titles, aria-labels, buttons)
    // E.g. >Workspace<, "Workspace", placeholder="Search...", title="Edit", aria-label="Delete"
    for (const word of ENGLISH_WORDS) {
      const regexes = [
        new RegExp(`>\\s*[^<]*\\b${word}\\b[^<]*<`, 'i'),
        new RegExp(`(?:placeholder|title|aria-label|label|alt|description)=["'][^"']*\\b${word}\\b[^"']*["']`, 'i'),
        new RegExp(`["'][^"']*\\b${word}\\b[^"']*["']`, 'i')
      ];

      for (const reg of regexes) {
        if (reg.test(line)) {
          // Exclude technical paths/identifiers like /reports, /projects, project.id, report.id, status === "DRAFT"
          if (
            line.includes(`/${word}`) ||
            line.includes(`.${word}`) ||
            line.includes(`${word}:`) ||
            line.includes(`status ===`) ||
            line.includes(`role ===`) ||
            line.includes(`type:`)
          ) {
            continue;
          }
          matches.push({
            filePath,
            lineNum: index + 1,
            snippet: line.trim(),
            matchedTerm: word
          });
          break;
        }
      }
    }
  });

  return matches;
}

function walkDir(dir: string, results: AuditMatch[] = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (!file.startsWith('.') && file !== 'node_modules' && file !== '.next') {
        walkDir(fullPath, results);
      }
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      const fileMatches = scanFile(fullPath);
      results.push(...fileMatches);
    }
  }
  return results;
}

const targetDir = path.join(process.cwd(), 'src');
const allMatches = walkDir(targetDir);

console.log(`Scanned src/. Found ${allMatches.length} potential matches.`);
const fileCount = new Set(allMatches.map(m => m.filePath)).size;
console.log(`Files with matches: ${fileCount}`);

fs.writeFileSync(
  path.join(process.cwd(), 'scratch/audit_results.json'),
  JSON.stringify(allMatches, null, 2)
);

console.log('Saved results to scratch/audit_results.json');
