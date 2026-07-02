const fs = require('fs');
let content = fs.readFileSync('src/components/documents/document-workspace.tsx', 'utf-8');

const target = `                note: doc.metadata?.note || "",`;

const replacement = `                note: (doc.metadata as any)?.note || "",`;

content = content.replace(target, replacement);
fs.writeFileSync('src/components/documents/document-workspace.tsx', content);
