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

// Group by top-level directory / component module
const byModule: Record<string, Match[]> = {};

for (const m of matches) {
  const relPath = path.relative(process.cwd(), m.filePath).replace(/\\/g, '/');
  const parts = relPath.split('/');
  let mod = parts.slice(0, 3).join('/');
  if (!byModule[mod]) byModule[mod] = [];
  byModule[mod].push(m);
}

console.log("=== MATCHES BY MODULE ===");
const sortedModules = Object.entries(byModule).sort((a, b) => b[1].length - a[1].length);
for (const [mod, list] of sortedModules) {
  console.log(`${mod}: ${list.length} matches`);
}
