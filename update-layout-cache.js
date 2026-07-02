const fs = require('fs');
const path = 'src/app/(dashboard)/layout.tsx';
let content = fs.readFileSync(path, 'utf-8');
if (!content.includes('export const dynamic')) {
  content = 'export const dynamic = "force-dynamic";\nexport const revalidate = 0;\n' + content;
  fs.writeFileSync(path, content);
  console.log("Added force-dynamic to layout");
}
