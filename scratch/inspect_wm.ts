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

const wmMatches = matches.filter(m => m.filePath.includes('work-management'));

console.log(`Found ${wmMatches.length} matches in work-management`);

const fileCounts: Record<string, number> = {};
for (const m of wmMatches) {
  const rel = path.relative(process.cwd(), m.filePath);
  fileCounts[rel] = (fileCounts[rel] || 0) + 1;
}

console.log(fileCounts);
