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

const excludeFiles = [
  'login', 
  'auth',
  'user-management-client.tsx' // Already has proper autocomplete for email/pass
];

const PROPS_TO_INJECT = ' autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} data-1p-ignore="true" data-lpignore="true"';

let modifiedFilesCount = 0;

for (const file of files) {
  if (excludeFiles.some(ex => file.toLowerCase().includes(ex))) {
    continue;
  }

  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;

  // Find all <input and <textarea that don't have autoComplete="off"
  // and inject the PROPS_TO_INJECT right after <input or <textarea
  
  // Note: this regex is naive but should work for most JSX.
  const regex = /<(input|textarea)(\s+[^>]*?)?>/g;
  
  content = content.replace(regex, (match, tag, props) => {
    // If it already has autoComplete="off", we assume it's handled.
    if (match.includes('autoComplete="off"') || match.includes('autoComplete={')) {
      return match;
    }
    
    // Don't modify hidden inputs or checkboxes/radios if we want to be safe,
    // but the user said global, so let's just do it for all type="text" or type="number" or type not defined
    if (match.includes('type="checkbox"') || match.includes('type="radio"') || match.includes('type="hidden"')) {
      return match;
    }

    return `<${tag}${PROPS_TO_INJECT}${props ? props : ''}>`;
  });

  if (content !== originalContent) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Injected autocomplete policy in: ${file}`);
    modifiedFilesCount++;
  }
}

console.log(`Done. Modified ${modifiedFilesCount} files to disable autocomplete.`);
