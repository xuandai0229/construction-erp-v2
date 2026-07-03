const fs = require('fs');
let content = fs.readFileSync('src/components/documents/document-workspace.tsx', 'utf-8');
const lines = content.split(/\r?\n/);
lines.splice(1772, 14); // Remove folderRenameModal block
fs.writeFileSync('src/components/documents/document-workspace.tsx', lines.join('\n'));
