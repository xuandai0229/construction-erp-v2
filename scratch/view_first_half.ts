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

const fileList = Object.keys(byFile);
console.log(`Total files containing matched candidate lines: ${fileList.length}`);

for (const file of fileList.slice(0, 25)) {
  console.log(`\n--- ${file} (${byFile[file].length} lines) ---`);
  for (const it of byFile[file]) {
    console.log(`  L${it.line}: ${it.snippet}`);
  }
}
