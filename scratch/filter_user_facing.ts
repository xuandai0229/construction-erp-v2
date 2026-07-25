import fs from 'fs';
import path from 'path';

interface StringItem {
  filePath: string;
  line: number;
  snippet: string;
}

const candidates: StringItem[] = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'scratch/ui_string_candidates.json'), 'utf-8')
);

// Filter lines that contain a string quote or JSX element with mixed or English words
const TARGET_REGEXES = [
  /["'`][^"'`]*\b(workspace|upload|download|storage|user hiện tại|project hiện tại|loading dữ liệu|filter|draft|pending|approved|rejected|actions|retry|save nháp)\b[^"'`]*["'`]/i,
  />[^<]*\b(workspace|upload|download|storage|user|project|loading|filter|draft|pending|approved|rejected|actions|retry)\b[^<]*</i
];

const results: StringItem[] = [];

for (const item of candidates) {
  const line = item.snippet;
  // Ignore imports, CSS classNames, API routes, type declarations
  if (
    line.startsWith('import ') ||
    line.includes('className=') ||
    line.includes('interface ') ||
    line.includes('type ') ||
    line.includes('/api/') ||
    line.includes('console.')
  ) {
    continue;
  }

  for (const reg of TARGET_REGEXES) {
    if (reg.test(line)) {
      results.push(item);
      break;
    }
  }
}

console.log(`Found ${results.length} specific user-facing text lines to review.`);
fs.writeFileSync(
  path.join(process.cwd(), 'scratch/filtered_user_facing_lines.json'),
  JSON.stringify(results, null, 2)
);
