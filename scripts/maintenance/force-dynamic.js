const fs = require('fs');

function prependToFile(path) {
  const content = fs.readFileSync(path, 'utf-8');
  if (!content.includes('export const dynamic = "force-dynamic"')) {
    fs.writeFileSync(path, 'export const dynamic = "force-dynamic";\nexport const revalidate = 0;\n' + content);
  }
}

prependToFile('src/app/(dashboard)/documents/page.tsx');
prependToFile('src/app/(dashboard)/documents/[projectId]/page.tsx');
