import fs from 'fs';
import path from 'path';

interface Match {
  filePath: string;
  lineNum: number;
  snippet: string;
  matchedTerm: string;
}

const matches: Match[] = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'scratch/audit_results.json'), 'utf-8')
);

const uiMatches = matches.filter(m => m.filePath.includes('src\\app') || m.filePath.includes('src\\components'));

console.log(`Total UI matches in src/app and src/components: ${uiMatches.length}`);

const groupedByFile: Record<string, Match[]> = {};
for (const m of uiMatches) {
  const rel = path.relative(process.cwd(), m.filePath).replace(/\\/g, '/');
  if (!groupedByFile[rel]) groupedByFile[rel] = [];
  groupedByFile[rel].push(m);
}

for (const [file, list] of Object.entries(groupedByFile)) {
  console.log(`\n--- ${file} (${list.length} matches) ---`);
  for (const item of list.slice(0, 10)) {
    console.log(`  L${item.lineNum}: [${item.matchedTerm}] -> ${item.snippet}`);
  }
  if (list.length > 10) {
    console.log(`  ... and ${list.length - 10} more`);
  }
}
