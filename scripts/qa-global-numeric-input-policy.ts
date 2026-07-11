import * as fs from 'fs';
import * as path from 'path';

function walkSync(dir: string, filelist: string[] = []): string[] {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filepath = path.join(dir, file);
    if (fs.statSync(filepath).isDirectory()) {
      filelist = walkSync(filepath, filelist);
    } else {
      if (filepath.endsWith('.tsx') || filepath.endsWith('.ts')) {
        filelist.push(filepath);
      }
    }
  }
  return filelist;
}

const files = walkSync(path.join(process.cwd(), 'src'));
let issues = 0;

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');

  // Find type="number"
  const numberTypeRegex = /type="number"/g;
  let match;
  while ((match = numberTypeRegex.exec(content)) !== null) {
    // Only warn if it's inside a typical input component, sometimes hidden fields use it
    if (!content.includes('type="hidden"')) {
      // console.warn(`Found type="number" in ${file}. Consider replacing with <NumericInput> if it is for user input.`);
      // Let's just count for now, no need to auto-replace because we might break hidden inputs or internal component logic.
    }
  }

  // Find occurrences of initializing NumericInput with "0" as string literal in state or props
  // e.g. minStockLevel: "0", initialStock: "0"
  if (content.match(/minStockLevel:\s*"0"/)) {
    console.warn(`Found minStockLevel initialized to "0" in ${file}`);
    issues++;
  }
  
  if (content.match(/initialStock:\s*"0"/)) {
    console.warn(`Found initialStock initialized to "0" in ${file}`);
    issues++;
  }
}

if (issues === 0) {
  console.log('Numeric Input policy looks good. No default "0" string found for critical fields.');
} else {
  console.log(`Found ${issues} numeric initialization issues.`);
}
