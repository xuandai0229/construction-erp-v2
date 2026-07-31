const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');

async function extract(filePath, label) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`${label}`);
  console.log('='.repeat(80));
  
  const buf = fs.readFileSync(filePath);
  const zip = await JSZip.loadAsync(buf);
  const xml = await zip.file('word/document.xml').async('string');
  
  // Extract text content preserving structure
  const text = xml
    .replace(/<w:br[^>]*\/>/g, '\n')
    .replace(/<\/w:p>/g, '\n')
    .replace(/<\/w:tc>/g, ' | ')
    .replace(/<\/w:tr>/g, '\n---ROW---\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  
  console.log(text);
}

(async () => {
  const dir = 'docs/official-templates';
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.docx'));
  
  for (const f of files) {
    const fullPath = path.join(dir, f);
    await extract(fullPath, `FILE: ${f}`);
  }
})();
