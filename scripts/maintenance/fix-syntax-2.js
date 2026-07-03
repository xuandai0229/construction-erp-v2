const fs = require('fs');
let content = fs.readFileSync('src/components/documents/document-workspace.tsx', 'utf-8');
const lines = content.split('\n');
lines[840] = lines[840] + '\r\n        >';
fs.writeFileSync('src/components/documents/document-workspace.tsx', lines.join('\n'));
