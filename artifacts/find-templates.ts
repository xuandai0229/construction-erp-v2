import fs from 'fs';
import path from 'path';

function findFiles(dir: string, extensions: string[], results: string[]) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== '.git' && entry.name !== '.next') {
        findFiles(fullPath, extensions, results);
      }
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (extensions.includes(ext)) {
        results.push(fullPath.replace(/\\/g, '/'));
      }
    }
  }
}

const found: string[] = [];
findFiles('.', ['.doc', '.docx', '.pdf'], found);
console.log('Found doc/docx/pdf files:');
found.forEach((f) => console.log(f));
