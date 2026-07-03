const fs = require('fs');
let content = fs.readFileSync('src/components/documents/document-workspace.tsx', 'utf-8');

// fix displayName
content = content.replace(/displayName:\s*doc\.displayName,/g, 'displayName: doc.displayName || "",');

// fix canCreateFolderContextually
content = content.replace(/canCreateFolder=\{canCreateFolderContextually\}/g, 'canCreateFolder={!!canCreateFolderContextually}');

fs.writeFileSync('src/components/documents/document-workspace.tsx', content);
