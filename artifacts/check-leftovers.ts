import fs from 'fs';
import path from 'path';

function checkSrc(dir: string, results: string[]) {
  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of items) {
    const full = path.join(dir, item.name);
    if (item.isDirectory()) {
      checkSrc(full, results);
    } else if (item.isFile() && (full.endsWith('.ts') || full.endsWith('.tsx'))) {
      const text = fs.readFileSync(full, 'utf-8');
      if (text.includes('/safety-inspection') || text.includes('safety-inspection') || text.includes('SafetyInspection')) {
        results.push(full.replace(/\\/g, '/'));
      }
    }
  }
}

const leftovers: string[] = [];
checkSrc('src', leftovers);
console.log('Leftover runtime safety occurrences in src:', leftovers);
