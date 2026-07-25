import fs from 'fs';
import path from 'path';

interface StringItem {
  filePath: string;
  line: number;
  snippet: string;
}

const unaccentedOrEnglish: StringItem[] = [];

// Keywords to look for in UI strings
const TARGET_KEYWORDS = [
  'workspace', 'upload', 'download', 'file', 'storage', 'save', 'draft', 'pending',
  'approved', 'rejected', 'loading', 'error', 'status', 'project', 'report', 'filter',
  'action', 'detail', 'user', 'role', 'edit', 'delete', 'create', 'search', 'retry',
  'view', 'preview', 'cancel', 'submit', 'import', 'export'
];

function scanFile(filePath: string) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('import ')) return;

    const lower = trimmed.toLowerCase();
    for (const kw of TARGET_KEYWORDS) {
      if (lower.includes(kw)) {
        // Exclude technical code keywords like file.name, file.id, uploadFile(), storage.get(), status === 'DRAFT'
        if (
          lower.includes(`.${kw}`) ||
          lower.includes(`${kw}:`) ||
          lower.includes(`status ===`) ||
          lower.includes(`role ===`) ||
          lower.includes(`type ===`) ||
          lower.includes(`import `) ||
          lower.includes(`const ${kw}`) ||
          lower.includes(`let ${kw}`) ||
          lower.includes(`function `)
        ) {
          // If it's pure code logic without string quote or JSX text, skip
          if (!line.includes('"') && !line.includes("'") && !line.includes('`') && !line.includes('>')) {
            continue;
          }
        }
        unaccentedOrEnglish.push({
          filePath,
          line: index + 1,
          snippet: trimmed
        });
        break;
      }
    }
  });
}

function walkDir(dir: string) {
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) {
      if (!f.startsWith('.') && f !== 'node_modules' && f !== '.next') walkDir(full);
    } else if (f.endsWith('.tsx') || f.endsWith('.ts')) {
      scanFile(full);
    }
  }
}

walkDir(path.join(process.cwd(), 'src/app'));
walkDir(path.join(process.cwd(), 'src/components'));

console.log(`Extracted ${unaccentedOrEnglish.length} lines containing candidate keywords in app & components.`);

fs.writeFileSync(
  path.join(process.cwd(), 'scratch/ui_string_candidates.json'),
  JSON.stringify(unaccentedOrEnglish, null, 2)
);
