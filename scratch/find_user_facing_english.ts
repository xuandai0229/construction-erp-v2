import fs from 'fs';
import path from 'path';

const ENGLISH_PATTERNS = [
  />\s*([A-Za-z0-9\s_\-\/\.,&:\(\)]*?)\s*</g,
  /placeholder=["']([^"']+)["']/g,
  /title=["']([^"']+)["']/g,
  /aria-label=["']([^"']+)["']/g,
];

const KNOWN_ENGLISH = [
  'workspace', 'dashboard', 'project', 'reports', 'report', 'filter', 'search',
  'save', 'submit', 'cancel', 'delete', 'edit', 'view', 'preview', 'print', 'export', 'import',
  'upload', 'download', 'loading', 'error', 'retry', 'status', 'draft', 'pending', 'approved',
  'rejected', 'version', 'user', 'role', 'settings', 'profile', 'logout', 'login', 'next',
  'previous', 'page', 'items', 'total', 'empty', 'select', 'create', 'update', 'detail',
  'action', 'actions', 'more', 'open', 'close', 'confirm', 'reset', 'clear', 'apply', 'active',
  'inactive', 'online', 'offline', 'file', 'folder', 'image', 'document', 'attachment'
];

interface FoundString {
  file: string;
  line: number;
  type: string;
  text: string;
}

const found: FoundString[] = [];

function scanFile(filePath: string) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  lines.forEach((line, index) => {
    const lineTrim = line.trim();
    if (lineTrim.startsWith('//') || lineTrim.startsWith('import ')) return;

    // Check placeholders, titles, aria-labels
    const phMatches = line.matchAll(/placeholder=["']([^"']+)["']/g);
    for (const m of phMatches) {
      const text = m[1];
      if (hasEnglish(text)) {
        found.push({ file: filePath, line: index + 1, type: 'placeholder', text });
      }
    }

    const titleMatches = line.matchAll(/title=["']([^"']+)["']/g);
    for (const m of titleMatches) {
      const text = m[1];
      if (hasEnglish(text)) {
        found.push({ file: filePath, line: index + 1, type: 'title', text });
      }
    }

    const ariaMatches = line.matchAll(/aria-label=["']([^"']+)["']/g);
    for (const m of ariaMatches) {
      const text = m[1];
      if (hasEnglish(text)) {
        found.push({ file: filePath, line: index + 1, type: 'aria-label', text });
      }
    }

    // Check JSX text
    const jsxMatches = line.matchAll(/>\s*([A-Za-z0-9\s_\-\/\.,&:\(\)]+?)\s*</g);
    for (const m of jsxMatches) {
      const text = m[1].trim();
      // Ignore numbers, SVGs, code tags, pure icons
      if (text && !/^\d+$/.test(text) && text.length > 1 && hasEnglish(text)) {
        // Exclude technical code strings
        if (text.includes('className') || text.includes('import') || text.includes('px') || text.includes('rem')) continue;
        found.push({ file: filePath, line: index + 1, type: 'jsx-text', text });
      }
    }
  });
}

function hasEnglish(str: string): boolean {
  const lower = str.toLowerCase();
  for (const word of KNOWN_ENGLISH) {
    if (new RegExp(`\\b${word}\\b`, 'i').test(lower)) {
      // Whitelist items allowed
      if (['pdf', 'excel', 'word', 'gps', 'cad', 'qr', 'otp', 'url', 'email'].includes(word.toLowerCase())) continue;
      return true;
    }
  }
  return false;
}

function walkDir(dir: string) {
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) {
      if (!f.startsWith('.') && f !== 'node_modules' && f !== '.next') walkDir(full);
    } else if (f.endsWith('.tsx')) {
      scanFile(full);
    }
  }
}

walkDir(path.join(process.cwd(), 'src/app'));
walkDir(path.join(process.cwd(), 'src/components'));

console.log(`Found ${found.length} user-facing English strings in JSX/placeholders/aria/titles.`);

fs.writeFileSync(
  path.join(process.cwd(), 'scratch/user_facing_english.json'),
  JSON.stringify(found, null, 2)
);
