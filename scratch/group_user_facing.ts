import fs from 'fs';
import path from 'path';

interface StringItem {
  filePath: string;
  line: number;
  snippet: string;
}

const items: StringItem[] = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'scratch/filtered_user_facing_lines.json'), 'utf-8')
);

const byFile: Record<string, StringItem[]> = {};

for (const item of items) {
  const rel = path.relative(process.cwd(), item.filePath).replace(/\\/g, '/');
  if (!byFile[rel]) byFile[rel] = [];
  byFile[rel].push(item);
}

for (const [file, list] of Object.entries(byFile)) {
  console.log(`\n========================================`);
  console.log(`FILE: ${file} (${list.length} lines)`);
  console.log(`========================================`);
  for (const it of list) {
    console.log(`  Line ${it.line}: ${it.snippet}`);
  }
}
