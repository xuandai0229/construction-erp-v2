const fs = require('fs');
let content = fs.readFileSync('src/components/documents/document-workspace.tsx', 'utf-8');

const target = `        canUpload={canUploadToCurrentFolder}
        canCreateFolder={canManageFolders}`;

const replacement = `        canUpload={canUpload}
        canCreateFolder={canCreateFolderContextually}`;

content = content.replace(target, replacement);
fs.writeFileSync('src/components/documents/document-workspace.tsx', content);
