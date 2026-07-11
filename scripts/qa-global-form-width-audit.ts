import * as fs from 'fs';
import * as path from 'path';

function walkSync(dir: string, filelist: string[] = []): string[] {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filepath = path.join(dir, file);
    if (fs.statSync(filepath).isDirectory()) {
      filelist = walkSync(filepath, filelist);
    } else {
      if (filepath.endsWith('.tsx')) {
        filelist.push(filepath);
      }
    }
  }
  return filelist;
}

const files = walkSync(path.join(process.cwd(), 'src'));
let modifiedCount = 0;

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;

  // We look for Dialog/Modal wrappers that are too narrow.
  // max-w-sm -> max-w-xl (if it's a form)
  // max-w-md -> max-w-2xl
  // max-w-lg -> max-w-2xl or max-w-3xl
  // But we shouldn't change ConfirmDialogs. Let's exclude components containing "Confirm" or "Alert".
  if (file.toLowerCase().includes('confirm') || file.toLowerCase().includes('alert') || file.toLowerCase().includes('delete')) {
    continue;
  }

  // If it's a form dialog or a drawer
  if (file.toLowerCase().includes('-dialog') || file.toLowerCase().includes('-form') || file.toLowerCase().includes('-modal')) {
    content = content.replace(/max-w-sm/g, 'max-w-xl');
    content = content.replace(/max-w-md/g, 'max-w-2xl');
    content = content.replace(/max-w-lg/g, 'max-w-2xl');
  }

  if (content !== originalContent) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Widened forms in: ${file}`);
    modifiedCount++;
  }
}

console.log(`Done. Widened forms in ${modifiedCount} files.`);
